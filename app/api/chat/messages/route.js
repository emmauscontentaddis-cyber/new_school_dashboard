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

  return {
    sender_id: senderId,
    sender_type: senderType,
    receiver_id: receiverId,
    receiver_type: receiverType,
    message: message.trim(),
    school_id: school,
    school_name: schoolName || null,
    student_id: student,
    student_name: studentName || null,
    student_email: studentEmail || null,
    program_id: programId || null,
    program_title: programTitle || null,
    room_id: roomId,
    sent_at: new Date().toISOString(),
    is_read: false,
    message_type: senderType === 'school' ? 'school_reply' : 'general',
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const payload = await buildMessagePayload(body)

    const { data, error } = await supabase
      .from('student_messages')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error inserting message:', error)
      return NextResponse.json(
        { error: 'Failed to save message', details: error.message },
        { status: 500 }
      )
    }

    // Optional: notify socket server
    const chatServerUrl = process.env.CHAT_SERVER_INTERNAL_URL
    if (chatServerUrl) {
      fetch(`${chatServerUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((err) => {
        console.warn('Chat server notification failed (non-critical):', err.message)
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('POST /api/chat/messages failed:', error)
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

