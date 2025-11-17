import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const supabase = createClient(supabaseUrl, serviceKey)

const sanitizeId = (value, label) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = sanitizeId(searchParams.get('schoolId'), 'schoolId')
    const studentFilter = searchParams.get('studentId')
    const limit = Number(searchParams.get('limit')) || 500

    let query = supabase
      .from('student_messages')
      .select(
        'id, student_id, student_name, student_email, program_id, program_title, school_id, school_name, message, message_type, sender_type, receiver_type, is_read, sent_at, room_id'
      )
      .eq('school_id', schoolId)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (studentFilter) {
      query = query.eq('student_id', studentFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations', details: error.message },
        { status: 500 }
      )
    }

    const conversationsMap = new Map()

    data?.forEach((message) => {
      const key = `${message.student_id}-${message.program_id || 'general'}`

      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          conversationId: key,
          studentId: message.student_id,
          studentName: message.student_name,
          studentEmail: message.student_email,
          programId: message.program_id,
          programTitle: message.program_title,
          schoolId: message.school_id,
          schoolName: message.school_name,
          roomId: message.room_id,
          lastMessage: null,
          unreadCount: 0,
        })
      }

      const convo = conversationsMap.get(key)

      if (!convo.lastMessage) {
        convo.lastMessage = {
          text: message.message,
          senderType: message.sender_type,
          messageType: message.message_type,
          sentAt: message.sent_at,
        }
      }

      if (message.receiver_type === 'school' && !message.is_read) {
        convo.unreadCount += 1
      }
    })

    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage?.sentAt || 0).getTime() - new Date(a.lastMessage?.sentAt || 0).getTime()
    )

    return NextResponse.json({ success: true, data: conversations })
  } catch (error) {
    console.error('GET /api/chat/conversations failed:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

