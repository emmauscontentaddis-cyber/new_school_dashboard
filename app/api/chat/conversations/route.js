import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * GET /api/chat/conversations
 * 
 * Optimized endpoint that fetches conversation summaries grouped by student and program.
 * 
 * Performance optimizations:
 * - Parallel fetching of courses and messages
 * - Efficient batching for large course lists
 * - In-memory grouping and deduplication
 * - Supports AbortController via request signal
 */
export async function GET(request) {
  const startTime = performance.now()
  
  try {
    // Get school_id from query params
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    // Check for abort signal
    const signal = request.signal
    if (signal?.aborted) {
      return NextResponse.json(
        { error: 'Request aborted' },
        { status: 499 }
      )
    }

    // Fetch courses and messages in parallel
    const [coursesResult, messagesResult] = await Promise.allSettled([
      supabase
        .from('courses')
        .select('id')
        .eq('school_id', schoolId)
        .limit(1000),
      
      supabase
        .from('student_messages')
        .select('id, student_id, student_name, student_email, program_id, program_title, school_id, school_name, message, reply, sent_at, reply_timestamp, message_type')
        .eq('school_id', schoolId)
        .order('sent_at', { ascending: false })
        .limit(200)
    ])

    const courseIds = coursesResult.status === 'fulfilled' && coursesResult.value.data
      ? coursesResult.value.data.map(c => c.id)
      : []
    
    const messagesBySchoolId = messagesResult.status === 'fulfilled' && messagesResult.value.data
      ? messagesResult.value.data
      : []

    // Fetch messages by program_id if we have courses (batch if needed)
    let messagesByProgramId = []
    if (courseIds.length > 0) {
      // Supabase IN clause has a limit, so batch if needed
      const batchSize = 100
      const batches = []
      for (let i = 0; i < courseIds.length; i += batchSize) {
        batches.push(courseIds.slice(i, i + batchSize))
      }
      
      const programQueries = await Promise.allSettled(
        batches.map(batch =>
          supabase
            .from('student_messages')
            .select('id, student_id, student_name, student_email, program_id, program_title, school_id, school_name, message, reply, sent_at, reply_timestamp, message_type')
            .in('program_id', batch)
            .order('sent_at', { ascending: false })
            .limit(200)
        )
      )
      
      for (const result of programQueries) {
        if (result.status === 'fulfilled' && result.value.data) {
          messagesByProgramId.push(...result.value.data)
        }
      }
    }

    // Early return if no messages
    if (messagesBySchoolId.length === 0 && messagesByProgramId.length === 0) {
      const duration = performance.now() - startTime
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Response-Time': `${duration.toFixed(2)}ms`,
        },
      })
    }

    // Combine and deduplicate
    const allMessages = [...messagesBySchoolId, ...messagesByProgramId]
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    )

    // Group by (student_id, program_id) and get latest message per conversation
    const contactsMap = new Map()
    
    for (const msg of uniqueMessages) {
      const key = `${msg.student_id}_${msg.program_id || 'general'}`
      const isSchoolReply = msg.message_type === 'school_reply'
      const msgTime = new Date(msg.sent_at).getTime()
      
      if (!contactsMap.has(key)) {
        contactsMap.set(key, {
          id: key,
          studentId: msg.student_id,
          studentName: msg.student_name,
          studentEmail: msg.student_email,
          programId: msg.program_id,
          programTitle: msg.program_title || 'General Inquiry',
          schoolId: msg.school_id,
          schoolName: msg.school_name,
          lastMessage: msg.message,
          lastReply: isSchoolReply ? msg.message : (msg.reply || null),
          timestamp: msg.sent_at,
          replyTimestamp: isSchoolReply ? msg.sent_at : (msg.reply_timestamp || null),
          unread: !isSchoolReply && !msg.reply,
          messages: [],
          messageCount: 0
        })
      }
      
      const contact = contactsMap.get(key)
      contact.messageCount++
      
      const contactTime = new Date(contact.timestamp).getTime()
      if (msgTime > contactTime) {
        contact.lastMessage = msg.message
        contact.timestamp = msg.sent_at
        if (isSchoolReply) {
          contact.lastReply = msg.message
          contact.replyTimestamp = msg.sent_at
          contact.unread = false
        } else {
          // For student messages, check if there's a reply
          contact.lastReply = msg.reply || null
          contact.replyTimestamp = msg.reply_timestamp || null
          contact.unread = !msg.reply
        }
      }
    }
    
    const data = Array.from(contactsMap.values()).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )

    const duration = performance.now() - startTime
    console.log(`[API] Conversations fetched in ${duration.toFixed(2)}ms`)

    // Return with short cache for faster loads
    return NextResponse.json(data || [], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/chat/conversations:', error)
    
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      return NextResponse.json(
        { error: 'Request aborted' },
        { status: 499 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

