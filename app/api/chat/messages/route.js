import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * GET /api/chat/messages?student_id=xxx&program_id=xxx&school_id=xxx
 * 
 * Optimized endpoint to fetch messages for a specific conversation.
 * 
 * Performance optimizations:
 * - Direct database query with indexed filters
 * - Only fetches required fields
 * - Server-side sorting
 * - Supports pagination via limit/offset
 * - Supports AbortController
 */
export async function GET(request) {
  const startTime = performance.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const programId = searchParams.get('program_id')
    const schoolId = searchParams.get('school_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!studentId || !schoolId) {
      return NextResponse.json(
        { error: 'student_id and school_id are required' },
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

    // Build optimized query - get all messages (both student messages and school replies)
    // Each message is stored as a separate row
    let baseQuery = supabase
      .from('student_messages')
      .select('id, message, reply, sent_at, reply_timestamp, message_type, status, program_id')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)

    // Filter by program_id if provided
    if (programId) {
      baseQuery = baseQuery.eq('program_id', programId)
    } else {
      baseQuery = baseQuery.is('program_id', null)
    }

    const query = baseQuery
      .order('sent_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Transform to chat message format
    // Each row is either a student message or a school reply
    const messages = (data || []).map(msg => {
      const isSchoolReply = msg.message_type === 'school_reply'
      
      return {
        id: msg.id,
        text: msg.message,
        sender: isSchoolReply ? 'school' : 'student',
        timestamp: new Date(msg.sent_at).toISOString(),
        fullTimestamp: new Date(msg.sent_at).getTime(),
        messageType: msg.message_type || 'student_message',
        status: msg.status || 'sent'
      }
    })

    // Also check for old-format replies (backward compatibility)
    // These are stored in the 'reply' column of student messages
    const oldFormatMessages = []
    for (const msg of data || []) {
      if (msg.message_type !== 'school_reply' && msg.reply && msg.reply_timestamp) {
        oldFormatMessages.push({
          id: `${msg.id}_reply`,
          text: msg.reply,
          sender: 'school',
          timestamp: new Date(msg.reply_timestamp).toISOString(),
          fullTimestamp: new Date(msg.reply_timestamp).getTime(),
          messageType: 'reply',
          status: 'sent'
        })
      }
    }
    
    // Combine and sort all messages
    const allMessages = [...messages, ...oldFormatMessages]

    // Sort by timestamp (already sorted from DB, but ensure)
    allMessages.sort((a, b) => a.fullTimestamp - b.fullTimestamp)

    const duration = performance.now() - startTime
    console.log(`[API] Messages fetched in ${duration.toFixed(2)}ms`)

    return NextResponse.json(allMessages, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error)
    
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

