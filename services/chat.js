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
  console.log('[fetchJson] Starting fetch to:', url, 'method:', options.method)
  
  try {
    // Add AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
    
    const fetchStartTime = Date.now()
    const response = await fetch(url, {
      credentials: 'include',
      signal: controller.signal, // Add abort signal
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
    
    clearTimeout(timeoutId) // Clear timeout if request completes
    const fetchDuration = Date.now() - fetchStartTime
    
    console.log('[fetchJson] Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${fetchDuration}ms`
    })

    const payload = await response.json().catch((err) => {
      console.error('[fetchJson] Error parsing JSON:', err)
      return {}
    })

    console.log('[fetchJson] Response payload:', payload)

    if (!response.ok) {
      const errorMsg = payload?.error || 'Chat request failed'
      console.error('[fetchJson] Request failed:', errorMsg)
      throw new Error(errorMsg)
    }

    // For POST requests, data is a single object, for GET it's an array
    // Return the data directly, or empty array/object as fallback
    if (payload?.data !== undefined) {
      console.log('[fetchJson] Returning payload.data')
      return payload.data
    }
    
    // If no data field but success is true, return the whole payload
    if (payload?.success && payload?.data === undefined) {
      console.log('[fetchJson] Returning whole payload (success=true)')
      return payload
    }
    
    console.warn('[fetchJson] No data field found, returning empty array')
    return []
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[fetchJson] Request aborted due to timeout')
      throw new Error('Request timeout: The server took too long to respond')
    }
    console.error('[fetchJson] Exception:', error)
    throw error
  }
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
  schoolId: providedSchoolId, // Allow schoolId to be passed directly
  userId: providedUserId, // Allow userId to be passed directly
}) {
  try {
    console.log('📝 [sendMessage] Sending school message via Supabase (like students)...', {
      hasProvidedSchoolId: !!providedSchoolId,
      hasProvidedUserId: !!providedUserId,
      studentId,
      timestamp: new Date().toISOString()
    })
    
    // Use provided userId directly - no need to fetch from cache
    const userId = providedUserId
    if (!userId) {
      throw new Error('User ID is required. Please provide userId in the message payload.')
    }
    
    const schoolId = providedSchoolId
    if (!schoolId) {
      throw new Error('School ID is required. Please provide schoolId in the message payload.')
    }

    // Get school name from database (quick query with timeout)
    let schoolName = 'School' // Default fallback
    try {
      const fetchPromise = supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .maybeSingle()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('School name fetch timeout')), 2000)
      )
      
      const { data: schoolRecord } = await Promise.race([fetchPromise, timeoutPromise])

      if (schoolRecord?.name) {
        schoolName = schoolRecord.name
        console.log('[sendMessage] School name from DB:', schoolName)
      } else {
        console.warn(`[sendMessage] School name not found for schoolId ${schoolId}, using default`)
      }
    } catch (err) {
      console.warn('[sendMessage] Exception fetching school name (using default):', err.message || err)
      // Continue with default 'School' name
    }

    // Use API route instead of direct insert to avoid RLS issues
    // The API route uses service role key which bypasses RLS
    // No need to check session - API route handles authentication
    console.log('[sendMessage] Sending via API route...', {
      schoolId,
      studentId,
      schoolName,
      messageLength: message.trim().length,
      timestamp: new Date().toISOString()
    })
    
    const insertStartTime = Date.now()
    
    const apiPayload = {
      senderId: userId,
      senderType: 'school',
      receiverId: sanitizeId(studentId, 'studentId'),
      receiverType: 'student',
      message: message.trim(),
      schoolId: schoolId,
      schoolName: schoolName, // Already fetched above
      studentId: studentId,
      studentName: studentName || 'Student',
      studentEmail: studentEmail || null,
      programId: programId || null,
      programTitle: programTitle || null,
    }
    
    // fetchJson already has an 8-second timeout built in
    const data = await fetchJson(CHAT_MESSAGES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
    })
    
    const insertDuration = Date.now() - insertStartTime
    console.log('[sendMessage] API response received:', {
      success: !!data,
      duration: `${insertDuration}ms`,
      messageId: data?.id,
      hasData: !!data
    })

    // Validate response
    if (!data) {
      throw new Error('No data returned from API')
    }

    // Check if it's an error response
    if (data.error) {
      console.error('[sendMessage] API returned error:', data.error)
      throw new Error(data.error || 'Failed to save message')
    }

    // Check if data has required fields
    if (!data.id && !data.sender_id) {
      console.error('[sendMessage] Invalid response data:', data)
      throw new Error('Message was saved but invalid data returned')
    }

    console.log('✅ [sendMessage] Message sent successfully:', data.id)
    return data
  } catch (error) {
    console.error('[sendMessage] Error sending chat message:', error)
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

