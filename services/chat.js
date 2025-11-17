import { supabase } from '@/lib/supabase'
import { getCachedSchoolId, getCachedUserId } from '@/utils/userCache'

const CHAT_MESSAGES_ENDPOINT = '/api/chat/messages'
const CHAT_CONVERSATIONS_ENDPOINT = '/api/chat/conversations'

const sanitizeId = (value, label) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'Chat request failed')
  }

  return payload?.data ?? []
}

export async function getConversations({ schoolId, studentId, limit = 500 } = {}) {
  try {
    const resolvedSchoolId = sanitizeId(schoolId || (await getCachedSchoolId()), 'schoolId')
    const params = new URLSearchParams({ schoolId: resolvedSchoolId })

    if (studentId) {
      params.set('studentId', studentId)
    }

    if (limit) {
      params.set('limit', String(limit))
    }

    return await fetchJson(`${CHAT_CONVERSATIONS_ENDPOINT}?${params.toString()}`)
  } catch (error) {
    console.error('Error loading conversations:', error)
    throw error
  }
}

export async function getMessages({ schoolId, studentId }) {
  try {
    const resolvedSchoolId = sanitizeId(schoolId || (await getCachedSchoolId()), 'schoolId')
    const resolvedStudentId = sanitizeId(studentId, 'studentId')
    const params = new URLSearchParams({
      schoolId: resolvedSchoolId,
      studentId: resolvedStudentId,
    })

    return await fetchJson(`${CHAT_MESSAGES_ENDPOINT}?${params.toString()}`)
  } catch (error) {
    console.error('Error loading chat messages:', error)
    throw error
  }
}

export async function sendMessage({
  studentId,
  studentName,
  studentEmail,
  programId,
  programTitle,
  message,
}) {
  try {
    const schoolId = await getCachedSchoolId()
    const userId = await getCachedUserId()

    if (!schoolId) {
      throw new Error('Missing schoolId for chat message')
    }

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('User is not authenticated')
    }

    let schoolName =
      user.user_metadata?.school ||
      null

    if (!schoolName) {
      const { data: schoolRecord } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .maybeSingle()

      schoolName = schoolRecord?.name || 'School'
    }

    const payload = {
      senderId: userId || user.id,
      senderType: 'school',
      receiverId: sanitizeId(studentId, 'studentId'),
      receiverType: 'student',
      message,
      schoolId,
      studentId,
      studentName,
      studentEmail,
      schoolName,
      programId: programId || null,
      programTitle: programTitle || null,
    }

    return await fetchJson(CHAT_MESSAGES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('Error sending chat message:', error)
    throw error
  }
}

export async function markMessagesAsRead({ schoolId, studentId }) {
  try {
    const resolvedSchoolId = sanitizeId(schoolId || (await getCachedSchoolId()), 'schoolId')
    const resolvedStudentId = sanitizeId(studentId, 'studentId')
    const roomId = `${resolvedSchoolId}-${resolvedStudentId}`

    const { error } = await supabase
      .from('student_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('receiver_type', 'school')
      .eq('is_read', false)

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('Error marking messages as read:', error)
    throw error
  }
}

