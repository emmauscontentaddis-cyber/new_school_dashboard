import { getCachedSchoolId, getCachedUser, getCachedProfile } from '@/utils/userCache'

// Base API URL - works in both client and server
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Helper to get current user's school_id (UUID) - uses cache
 */
async function getUserSchoolId() {
  return await getCachedSchoolId()
}

/**
 * Helper to get current user info - uses cache
 */
async function getCurrentUser() {
  try {
    const user = await getCachedUser()
    if (user) {
      const profile = await getCachedProfile()
      return {
        id: user.id,
        email: user.email || profile?.email || null,
        name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'School Staff'
      }
    }
    return null
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

/**
 * Optimized fetch wrapper with AbortController support
 */
async function fetchWithAbort(url, options = {}) {
  const { signal, ...fetchOptions } = options
  
  const controller = signal || new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw error
  }
}

/**
 * Get messages grouped by student (for chat contacts list)
 * 
 * OPTIMIZED VERSION:
 * - Uses optimized API route with database-level grouping
 * - Supports AbortController for cancellation
 * - Minimal data transfer
 * - Sub-300ms target performance
 */
export async function getMessagesGroupedByStudent(options = {}) {
  try {
    const schoolId = await getUserSchoolId()
    
    if (!schoolId) {
      console.log('❌ No school ID found, returning empty array')
      return []
    }

    const apiUrl = getApiUrl()
    const url = new URL(`${apiUrl}/api/chat/conversations`)
    url.searchParams.set('school_id', schoolId)

    const contacts = await fetchWithAbort(url.toString(), {
      method: 'GET',
      signal: options.signal,
      cache: options.cache || 'default',
    })

    return contacts || []
  } catch (error) {
    console.error('Error fetching conversations:', error)
    throw error
  }
}

/**
 * Get messages for a specific student conversation
 * 
 * OPTIMIZED VERSION:
 * - Uses optimized API route with direct database query
 * - No client-side filtering needed
 * - Supports pagination
 * - Supports AbortController
 */
export async function getStudentMessages(studentId, programId = null, options = {}) {
  try {
    const schoolId = await getUserSchoolId()
    
    if (!schoolId || !studentId) {
      return []
    }

    const apiUrl = getApiUrl()
    const url = new URL(`${apiUrl}/api/chat/messages`)
    url.searchParams.set('student_id', studentId)
    url.searchParams.set('school_id', schoolId)
    
    if (programId) {
      url.searchParams.set('program_id', programId)
    }
    
    if (options.limit) {
      url.searchParams.set('limit', options.limit.toString())
    }
    
    if (options.offset) {
      url.searchParams.set('offset', options.offset.toString())
    }

    const messages = await fetchWithAbort(url.toString(), {
      method: 'GET',
      signal: options.signal,
      cache: options.cache || 'default',
    })

    return messages || []
  } catch (error) {
    console.error('Error getting student messages:', error)
    throw error
  }
}

/**
 * Send reply to a student message
 * 
 * OPTIMIZED VERSION:
 * - Uses optimized API route
 * - Single update query
 * - Supports AbortController
 */
export async function sendReply(messageId, replyText, options = {}) {
  try {
    const user = await getCurrentUser()
    const schoolId = await getUserSchoolId()
    
    if (!user || !schoolId) {
      throw new Error('User must be authenticated and associated with a school')
    }

    const apiUrl = getApiUrl()
    const response = await fetchWithAbort(`${apiUrl}/api/chat/reply`, {
      method: 'POST',
      signal: options.signal,
      cache: 'default',
      body: JSON.stringify({
        messageId,
        replyText: replyText.trim(),
        schoolId,
        userName: user.name,
        userEmail: user.email,
      }),
    })

    return response
  } catch (error) {
    console.error('Error sending reply:', error)
    throw error
  }
}

