import { supabase } from '@/lib/supabase'
import { notifyStatusChange, notifyInterviewScheduled, notifyOffer } from './email'
import { getCachedSchoolId, getCachedUserId } from '@/utils/userCache'

// Helper to get current user's school_id (uses cache)
async function getUserSchoolId() {
  return await getCachedSchoolId()
}

// Timeout wrapper for API calls
function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

/**
 * List all applications for the current school's courses
 */
export async function listApplications(filters = {}) {
  try {
    const schoolId = await getUserSchoolId()
    
    if (!schoolId) {
      console.log('No school_id found for user, returning empty array')
      return []
    }

    console.log('Fetching applications for school_id:', schoolId)

    // First, get all course IDs for this school
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', schoolId)

    if (coursesError) {
      console.error('Error fetching courses for school:', coursesError)
      throw coursesError
    }

    const courseIds = courses?.map(c => c.id) || []
    
    if (courseIds.length === 0) {
      console.log('No courses found for school, returning empty array')
      return []
    }

    // Now fetch applications for those courses
    let query = supabase
      .from('applications')
      .select(`
        *,
        courses (
          id,
          title,
          course_code,
          school_id
        )
      `)
      .in('course_id', courseIds)
      .order('created_at', { ascending: false })
      .limit(1000)

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id)
    }

    if (filters.search) {
      query = query.or(`student_name.ilike.%${filters.search}%,student_email.ilike.%${filters.search}%`)
    }

    const { data, error } = await withTimeout(query, 30000)

    if (error) {
      console.error('Supabase query error:', error)
      
      if (error.message && (error.message.includes('does not exist') || error.code === '42P01')) {
        const helpfulError = new Error(
          'Applications table does not exist. Please run: docs/supabase_applications_schema.sql in Supabase SQL editor.'
        )
        helpfulError.originalError = error
        throw helpfulError
      }
      
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        const helpfulError = new Error(
          'Permission denied. Please check RLS policies on applications table.'
        )
        helpfulError.originalError = error
        throw helpfulError
      }
      
      throw error
    }
    
    console.log('Successfully fetched applications:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('Error listing applications:', error)
    throw error
  }
}

/**
 * Get a single application by ID
 */
export async function getApplication(id) {
  try {
    const schoolId = await getUserSchoolId()
    
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        courses (
          id,
          title,
          course_code,
          short_description,
          category,
          school_id
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    
    if (data?.courses?.school_id !== schoolId) {
      throw new Error('Application not found or access denied')
    }
    
    return data
  } catch (error) {
    console.error('Error getting application:', error)
    throw error
  }
}

/**
 * Update application status (review action)
 */
export async function updateApplicationStatus(id, updates) {
  try {
    const schoolId = await getUserSchoolId()
    
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        course_id,
        courses (
          id,
          school_id
        )
      `)
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw new Error('Application not found')
    }

    if (existing.courses?.school_id !== schoolId) {
      throw new Error('You do not have permission to update this application')
    }

    const userId = await getCachedUserId()
    const oldStatus = existing?.status

    const updateData = {
      ...updates,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        courses (
          id,
          title,
          course_code
        )
      `)
      .single()

    if (error) throw error

    // Send email notification if status changed
    if (updates.status && updates.status !== oldStatus) {
      try {
        await notifyStatusChange(
          data,
          oldStatus,
          updates.status,
          updates.rejection_reason || null
        )
      } catch (emailError) {
        console.warn('Email notification failed (non-critical):', emailError)
      }
    }

    return data
  } catch (error) {
    console.error('Error updating application status:', error)
    throw error
  }
}

/**
 * Get application statistics for the school
 */
export async function getApplicationStats() {
  try {
    const schoolId = await getUserSchoolId()
    
    if (!schoolId) {
      return {
        total: 0,
        pending: 0,
        under_review: 0,
        accepted: 0,
        rejected: 0,
        waitlisted: 0,
      }
    }

    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', schoolId)

    if (coursesError) {
      console.error('Error fetching courses for school:', coursesError)
      throw coursesError
    }

    const courseIds = courses?.map(c => c.id) || []
    
    if (courseIds.length === 0) {
      return {
        total: 0,
        pending: 0,
        under_review: 0,
        accepted: 0,
        rejected: 0,
        waitlisted: 0,
      }
    }

    const { count, error } = await withTimeout(
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds)
    )

    if (error) throw error

    const { data, error: statusError } = await withTimeout(
      supabase
        .from('applications')
        .select('status')
        .in('course_id', courseIds)
        .limit(5000)
    )

    if (statusError) throw statusError

    const stats = {
      total: count || data?.length || 0,
      pending: data?.filter(a => a.status === 'pending').length || 0,
      under_review: data?.filter(a => a.status === 'under_review').length || 0,
      accepted: data?.filter(a => a.status === 'accepted').length || 0,
      rejected: data?.filter(a => a.status === 'rejected').length || 0,
      waitlisted: data?.filter(a => a.status === 'waitlisted').length || 0,
    }

    return stats
  } catch (error) {
    console.error('Error getting application stats:', error)
    throw error
  }
}

/**
 * Schedule an interview for an application
 */
export async function scheduleInterview(id, interviewData) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    const userId = await getCachedUserId()
    if (!userId) {
      throw new Error('User ID not found')
    }

    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select(`
        id,
        course_id,
        courses (
          id,
          school_id
        )
      `)
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw new Error('Application not found')
    }

    if (existing.courses?.school_id !== schoolId) {
      throw new Error('You do not have permission to update this application')
    }

    const updateData = {
      interview_date: interviewData.interview_date,
      interview_type: interviewData.interview_type,
      interview_location: interviewData.interview_location || null,
      interview_notes: interviewData.interview_notes || null,
      status: 'interview_scheduled',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await logActivity(id, {
      type: 'interview',
      title: 'Interview scheduled',
      description: `Interview scheduled for ${new Date(interviewData.interview_date).toLocaleString()}`,
      user_id: userId,
    })

    try {
      await notifyInterviewScheduled(data, interviewData)
    } catch (emailError) {
      console.warn('Email notification failed (non-critical):', emailError)
    }

    return data
  } catch (error) {
    console.error('Error scheduling interview:', error)
    throw error
  }
}

/**
 * Complete interview
 */
export async function completeInterview(id, interviewData) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    const userId = await getCachedUserId()

    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select(`
        id,
        course_id,
        courses (
          id,
          school_id
        )
      `)
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw new Error('Application not found')
    }

    if (existing.courses?.school_id !== schoolId) {
      throw new Error('You do not have permission to update this application')
    }

    const updateData = {
      interview_completed: true,
      interview_completed_at: new Date().toISOString(),
      interview_notes: interviewData.interview_notes || null,
      interview_feedback: interviewData.interview_feedback || null,
      status: 'interview_completed',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await logActivity(id, {
      type: 'interview',
      title: 'Interview completed',
      description: interviewData.interview_feedback || 'Interview completed',
      user_id: userId,
    })

    return data
  } catch (error) {
    console.error('Error completing interview:', error)
    throw error
  }
}

/**
 * Log activity for an application
 */
export async function logActivity(applicationId, activityData) {
  try {
    const userId = await getCachedUserId()
    
    const activity = {
      application_id: applicationId,
      type: activityData.type || 'general',
      title: activityData.title,
      description: activityData.description,
      user_id: activityData.user_id || userId,
      metadata: activityData.metadata || {},
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('application_activities')
      .insert([activity])
      .select()

    if (error) {
      if (!error.message.includes('does not exist') &&
          !error.message.includes('row-level security') &&
          !error.message.includes('RLS') &&
          !error.message.includes('relationship') &&
          error.code !== '42501' &&
          error.code !== 'PGRST200') {
        console.warn('Could not log activity to table:', error)
      }
    }

    return activity
  } catch (error) {
    console.warn('Activity logging failed (non-critical):', error)
    return null
  }
}

/**
 * Get application activities/timeline
 */
export async function getApplicationActivities(applicationId) {
  try {
    const { data, error } = await supabase
      .from('application_activities')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.message.includes('does not exist') ||
          error.message.includes('relationship') ||
          error.message.includes('PGRST200') ||
          error.code === 'PGRST200') {
        return []
      }
      console.warn('Could not fetch activities (non-critical):', error)
      return []
    }

    if (data) {
      return data.map(activity => ({
        ...activity,
        user_name: activity.user_id ? 'User' : 'System',
      }))
    }

    return []
  } catch (error) {
    return []
  }
}

/**
 * Send offer letter
 */
export async function sendOfferLetter(id, offerData) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    const userId = await getCachedUserId()

    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select(`
        id,
        course_id,
        courses (
          id,
          school_id
        )
      `)
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw new Error('Application not found')
    }

    if (existing.courses?.school_id !== schoolId) {
      throw new Error('You do not have permission to update this application')
    }

    const updateData = {
      ...offerData,
      offer_sent: true,
      offer_sent_at: new Date().toISOString(),
      status: 'accepted',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        courses (
          id,
          title,
          course_code
        )
      `)
      .single()

    if (error) throw error

    await logActivity(id, {
      type: 'offer',
      title: 'Offer sent',
      description: 'Offer letter sent to applicant',
      user_id: userId,
    })

    try {
      await notifyOffer(data, offerData.offer_letter, offerData.offer_conditions || [])
    } catch (emailError) {
      console.warn('Email notification failed (non-critical):', emailError)
    }

    return data
  } catch (error) {
    console.error('Error sending offer:', error)
    throw error
  }
}

/**
 * Complete enrollment
 */
export async function completeEnrollment(id, enrollmentData) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    const userId = await getCachedUserId()

    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select(`
        id,
        course_id,
        courses (
          id,
          school_id
        )
      `)
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw new Error('Application not found')
    }

    if (existing.courses?.school_id !== schoolId) {
      throw new Error('You do not have permission to update this application')
    }

    const updateData = {
      ...enrollmentData,
      status: 'enrolled',
      enrolled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        courses (
          id,
          title,
          course_code
        )
      `)
      .single()

    if (error) throw error

    await logActivity(id, {
      type: 'enrollment',
      title: 'Enrollment completed',
      description: 'Application enrolled',
      user_id: userId,
    })

    try {
      const { notifyStatusChange } = await import('./email')
      await notifyStatusChange(data, 'accepted', 'enrolled')
    } catch (emailError) {
      console.warn('Email notification failed (non-critical):', emailError)
    }

    return data
  } catch (error) {
    console.error('Error completing enrollment:', error)
    throw error
  }
}

