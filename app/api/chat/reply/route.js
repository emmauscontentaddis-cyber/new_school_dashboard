import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * POST /api/chat/reply
 * 
 * Optimized endpoint to send a reply to a student message.
 * 
 * Performance optimizations:
 * - Single insert query with proper indexing
 * - Minimal data validation
 * - Returns created reply in response
 */
export async function POST(request) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    const { messageId, replyText, schoolId, userName, userEmail } = body

    if (!messageId || !replyText || !schoolId) {
      return NextResponse.json(
        { error: 'messageId, replyText, and schoolId are required' },
        { status: 400 }
      )
    }

    // Verify message belongs to school
    const { data: message, error: fetchError } = await supabase
      .from('student_messages')
      .select('id, student_id, student_name, student_email, school_id, program_id, program_title, school_name')
      .eq('id', messageId)
      .single()

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Check ownership
    let belongsToSchool = message.school_id === schoolId

    // If not direct match, check via program_id
    if (!belongsToSchool && message.program_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('school_id')
        .eq('id', message.program_id)
        .single()
      
      belongsToSchool = course?.school_id === schoolId
    }

    if (!belongsToSchool) {
      return NextResponse.json(
        { error: 'You can only reply to messages from your own school' },
        { status: 403 }
      )
    }

    // Create a new message row for the school reply (stores each message separately)
    const newReplyMessage = {
      student_id: message.student_id,
      student_name: message.student_name,
      student_email: message.student_email,
      school_id: message.school_id,
      school_name: message.school_name,
      program_id: message.program_id,
      program_title: message.program_title,
      message: replyText.trim(),
      message_type: 'school_reply',
      sent_at: new Date().toISOString(),
      reply_by: userName || 'School Staff',
      reply_by_email: userEmail || null,
      status: 'sent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: createdReply, error: createError } = await supabase
      .from('student_messages')
      .insert(newReplyMessage)
      .select()
      .single()

    if (createError) {
      console.error('Error creating reply message:', createError)
      return NextResponse.json(
        { error: createError.message || 'Failed to send reply' },
        { status: 500 }
      )
    }

    // Update the original message status to 'read' if it's not already
    await supabase
      .from('student_messages')
      .update({ status: 'read', updated_at: new Date().toISOString() })
      .eq('id', messageId)

    const duration = performance.now() - startTime
    console.log(`[API] Reply sent in ${duration.toFixed(2)}ms`)

    return NextResponse.json(createdReply, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': `${duration.toFixed(2)}ms`,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/chat/reply:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

