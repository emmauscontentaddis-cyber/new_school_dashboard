import { supabase } from '@/lib/supabase'
import { getCachedSchoolId } from '@/utils/userCache'

/**
 * Email notification service
 * Handles sending emails to applicants for workflow events
 */

// Helper to get current user's school_id (uses cache)
async function getUserSchoolId() {
  return await getCachedSchoolId()
}

/**
 * Get email template by type
 */
export async function getEmailTemplate(templateType, schoolId = null) {
  try {
    const sid = schoolId || await getUserSchoolId()
    if (!sid) return null

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('school_id', sid)
      .eq('template_type', templateType)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && !error.message.includes('does not exist')) {
      console.warn('Error fetching email template:', error)
    }

    return data
  } catch (error) {
    console.warn('Email template fetch failed (non-critical):', error)
    return null
  }
}

/**
 * Get default email template content
 */
function getDefaultTemplate(templateType, application, context = {}) {
  const templates = {
    status_change: {
      subject: `Application Status Update - ${application.courses?.title || 'Program'}`,
      body: `Dear ${application.student_name || 'Applicant'},

Your application status has been updated to: ${context.newStatus || 'Updated'}

${context.message || 'Please check your application portal for more details.'}

Best regards,
Admissions Team`
    },
    interview_scheduled: {
      subject: `Interview Scheduled - ${application.courses?.title || 'Program'}`,
      body: `Dear ${application.student_name || 'Applicant'},

An interview has been scheduled for your application.

${context.interviewDate ? `Date & Time: ${new Date(context.interviewDate).toLocaleString()}` : ''}
${context.interviewType ? `Type: ${context.interviewType}` : ''}
${context.interviewLocation ? `Location: ${context.interviewLocation}` : ''}

${context.interviewNotes ? `\nNotes: ${context.interviewNotes}` : ''}

We look forward to speaking with you.

Best regards,
Admissions Team`
    },
    offer: {
      subject: `Offer of Admission - ${application.courses?.title || 'Program'}`,
      body: `Dear ${application.student_name || 'Applicant'},

Congratulations! We are pleased to offer you admission to our ${application.courses?.title || 'program'}.

${context.offerLetter || 'Please review the offer details in your application portal.'}

${context.offerConditions && context.offerConditions.length > 0 ? `\nConditions:\n${context.offerConditions.map(c => `- ${c}`).join('\n')}` : ''}

Please respond to this offer by ${context.responseDeadline || 'the deadline specified'}.

Best regards,
Admissions Team`
    },
    rejection: {
      subject: `Application Decision - ${application.courses?.title || 'Program'}`,
      body: `Dear ${application.student_name || 'Applicant'},

Thank you for your interest in our ${application.courses?.title || 'program'}.

After careful consideration, we regret to inform you that we are unable to offer you admission at this time.

${context.rejectionReason ? `\nReason: ${context.rejectionReason}` : ''}

We wish you the best in your future endeavors.

Best regards,
Admissions Team`
    },
    waitlist: {
      subject: `Application Status - Waitlist`,
      body: `Dear ${application.student_name || 'Applicant'},

Thank you for your application to our ${application.courses?.title || 'program'}.

Your application has been placed on our waitlist. We will contact you if a spot becomes available.

Best regards,
Admissions Team`
    },
    enrollment: {
      subject: `Enrollment Confirmed`,
      body: `Dear ${application.student_name || 'Student'},

Your enrollment has been confirmed! Welcome to our program.

We look forward to having you as part of our community.

Best regards,
Admissions Team`
    }
  }

  return templates[templateType] || templates.status_change
}

/**
 * Log email to database
 */
async function logEmail(applicationId, templateId, recipientEmail, subject, body, status = 'pending', errorMessage = null) {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert([{
        application_id: applicationId,
        template_id: templateId,
        recipient_email: recipientEmail,
        subject,
        body,
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        error_message: errorMessage,
      }])

    // Silently ignore RLS violations and missing table errors
    if (error) {
      if (!error.message.includes('does not exist') && 
          !error.message.includes('row-level security') &&
          !error.message.includes('RLS') &&
          error.code !== '42501') {
        console.warn('Could not log email:', error)
      }
    }
  } catch (error) {
    // Silently ignore - email logging is non-critical
  }
}

/**
 * Send email notification
 * In a real implementation, this would integrate with an email service
 */
export async function sendEmailNotification(application, templateType, context = {}) {
  try {
    const schoolId = await getUserSchoolId()
    
    // Get template (custom or default)
    let template = await getEmailTemplate(templateType, schoolId)
    let subject, body

    if (template) {
      subject = substituteVariables(template.subject, application, context)
      body = substituteVariables(template.body, application, context)
    } else {
      const defaultTemplate = getDefaultTemplate(templateType, application, context)
      subject = defaultTemplate.subject
      body = defaultTemplate.body
    }

    const recipientEmail = application.student_email

    // In production, integrate with actual email service here
    console.log('📧 Email would be sent:', {
      to: recipientEmail,
      subject,
      templateType,
      applicationId: application.id
    })

    // Log email
    await logEmail(
      application.id,
      template?.id || null,
      recipientEmail,
      subject,
      body,
      'sent'
    )

    return {
      success: true,
      recipientEmail,
      subject,
      templateId: template?.id || null,
    }
  } catch (error) {
    console.error('Error sending email notification:', error)
    
    await logEmail(
      application.id,
      null,
      application.student_email,
      'Email Notification',
      '',
      'failed',
      error.message
    )

    throw error
  }
}

/**
 * Substitute variables in email template
 */
function substituteVariables(text, application, context = {}) {
  if (!text) return ''

  let result = text

  // Application variables
  result = result.replace(/\{\{student_name\}\}/g, application.student_name || 'Applicant')
  result = result.replace(/\{\{student_email\}\}/g, application.student_email || '')
  result = result.replace(/\{\{program_name\}\}/g, application.courses?.title || 'Program')
  result = result.replace(/\{\{application_id\}\}/g, application.id || '')

  // Context variables
  if (context.newStatus) {
    result = result.replace(/\{\{new_status\}\}/g, context.newStatus)
  }
  if (context.interviewDate) {
    result = result.replace(/\{\{interview_date\}\}/g, new Date(context.interviewDate).toLocaleString())
  }
  if (context.interviewLocation) {
    result = result.replace(/\{\{interview_location\}\}/g, context.interviewLocation)
  }
  if (context.rejectionReason) {
    result = result.replace(/\{\{rejection_reason\}\}/g, context.rejectionReason)
  }
  if (context.offerLetter) {
    result = result.replace(/\{\{offer_letter\}\}/g, context.offerLetter)
  }

  return result
}

/**
 * Send email on status change
 */
export async function notifyStatusChange(application, oldStatus, newStatus, rejectionReason = null) {
  let templateType = 'status_change'

  if (newStatus === 'rejected') {
    templateType = 'rejection'
  } else if (newStatus === 'waitlisted') {
    templateType = 'waitlist'
  } else if (newStatus === 'accepted') {
    templateType = 'offer'
  } else if (newStatus === 'enrolled') {
    templateType = 'enrollment'
  }

  return await sendEmailNotification(application, templateType, {
    newStatus,
    oldStatus,
    rejectionReason,
  })
}

/**
 * Send interview scheduled email
 */
export async function notifyInterviewScheduled(application, interviewData) {
  return await sendEmailNotification(application, 'interview_scheduled', {
    interviewDate: interviewData.interview_date,
    interviewType: interviewData.interview_type,
    interviewLocation: interviewData.interview_location,
    interviewNotes: interviewData.interview_notes,
  })
}

/**
 * Send offer email
 */
export async function notifyOffer(application, offerLetter, conditions = []) {
  return await sendEmailNotification(application, 'offer', {
    offerLetter,
    offerConditions: conditions,
    responseDeadline: 'within 14 days',
  })
}

