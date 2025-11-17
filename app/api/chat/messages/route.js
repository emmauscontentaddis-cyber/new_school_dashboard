import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const supabase = createClient(supabaseUrl, serviceKey)

const sanitizeId = (value, label) => {
  if (!value || typeof value !== 'string') {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

const buildMessagePayload = async (body) => {
  const {
    senderId,
    senderType,
    receiverId,
    receiverType,
    message,
    schoolId,
    studentId,
    studentName,
    studentEmail,
    schoolName,
    programId,
    programTitle,
  } = body

  if (!senderId || !receiverId) {
    throw new Error('senderId and receiverId are required')
  }

  if (!['student', 'school'].includes(senderType)) {
    throw new Error('senderType must be "student" or "school"')
  }

  if (!['student', 'school'].includes(receiverType)) {
    throw new Error('receiverType must be "student" or "school"')
  }

  if (!message?.trim()) {
    throw new Error('message text is required')
  }

  const school = sanitizeId(schoolId, 'schoolId')
  const student = sanitizeId(studentId, 'studentId')
  const roomId = `${school}-${student}`

  // Ensure school_name is never null - use provided name or default
  // Don't fetch from DB to avoid timeout - use provided value or default
  let resolvedSchoolName = schoolName?.trim() || 'School'
  
  // Only fetch if absolutely necessary and name is missing
  if (!resolvedSchoolName || resolvedSchoolName === 'School') {
    if (senderType === 'school') {
      // Quick fetch with timeout
      try {
        const fetchPromise = supabase
          .from('schools')
          .select('name')
          .eq('id', school)
          .maybeSingle()
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('School name fetch timeout')), 2000)
        )
        
        const { data: schoolRecord } = await Promise.race([fetchPromise, timeoutPromise])
        resolvedSchoolName = schoolRecord?.name || 'School'
      } catch (error) {
        console.warn('Failed to fetch school name, using default:', error)
        resolvedSchoolName = 'School'
      }
    }
  }

  // Ensure student_name is never null
  const resolvedStudentName = studentName?.trim() || 'Student'

  return {
    sender_id: senderId,
    sender_type: senderType,
    receiver_id: receiverId,
    receiver_type: receiverType,
    message: message.trim(),
    school_id: school,
    school_name: resolvedSchoolName || 'School', // Never null
    student_id: student,
    student_name: resolvedStudentName,
    student_email: studentEmail?.trim() || null,
    program_id: programId || null,
    program_title: programTitle?.trim() || null,
    room_id: roomId,
    sent_at: new Date().toISOString(),
    is_read: false,
    message_type: senderType === 'school' ? 'school_reply' : 'general',
  }
}

export async function POST(request) {
  const startTime = Date.now()
  try {
    console.log('[API] POST /api/chat/messages - Starting...', new Date().toISOString())
    const body = await request.json()
    console.log('[API] Request body received:', { 
      hasSenderId: !!body.senderId,
      hasSchoolId: !!body.schoolId,
      hasStudentId: !!body.studentId,
      messageLength: body.message?.length
    })
    
    const buildStartTime = Date.now()
    const payload = await buildMessagePayload(body)
    const buildDuration = Date.now() - buildStartTime
    console.log('[API] Payload built:', { duration: `${buildDuration}ms`, roomId: payload.room_id })

    const insertStartTime = Date.now()
    // Add timeout to Supabase insert
    const insertPromise = supabase
      .from('student_messages')
      .insert(payload)
      .select()
      .single()
    
    const insertTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase insert timeout after 5 seconds')), 5000)
    )
    
    const { data, error } = await Promise.race([insertPromise, insertTimeoutPromise])
    const insertDuration = Date.now() - insertStartTime
    console.log('[API] Insert completed:', { 
      success: !error, 
      duration: `${insertDuration}ms`,
      messageId: data?.id 
    })

    if (error) {
      console.error('[API] Error inserting message:', error)
      return NextResponse.json(
        { error: 'Failed to save message', details: error.message },
        { status: 500 }
      )
    }

    // Optional: notify socket server (non-blocking, don't wait for it)
    const chatServerUrl = process.env.CHAT_SERVER_INTERNAL_URL
    if (chatServerUrl) {
      // Fire and forget - don't wait for socket server
      fetch(`${chatServerUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((err) => {
        console.warn('[API] Chat server notification failed (non-critical):', err.message)
      })
    }

    const totalDuration = Date.now() - startTime
    console.log('[API] POST /api/chat/messages - SUCCESS', {
      duration: `${totalDuration}ms`,
      messageId: data.id,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('[API] POST /api/chat/messages - FAILED', {
      duration: `${totalDuration}ms`,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = sanitizeId(searchParams.get('studentId'), 'studentId')
    const schoolId = sanitizeId(searchParams.get('schoolId'), 'schoolId')

    const roomId = `${schoolId}-${studentId}`

    const { data, error } = await supabase
      .from('student_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('sent_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

