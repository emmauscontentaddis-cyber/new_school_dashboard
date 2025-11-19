'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApplications } from '@/context/ApplicationsContext'
import {
  scheduleInterview,
  completeInterview,
  getApplicationActivities,
  logActivity,
  updateApplicationStatus,
  sendOfferLetter,
  completeEnrollment,
} from '@/services/applications'
import { getInterviewCalendarLinks } from '@/services/calendar'
import GlassCard from '@/components/ui/GlassCard'
import Textarea from '@/components/ui/Textarea'
import WorkflowProgress from './WorkflowProgress'
import InterviewScheduler from './InterviewScheduler'
import DecisionGates from './DecisionGates'
import ActivityTimeline from './ActivityTimeline'
import ScreeningCheck from './ScreeningCheck'
import ReviewScoring from './ReviewScoring'
import OfferLetter from './OfferLetter'
import EnrollmentProcess from './EnrollmentProcess'

const statusLabels = {
  pending: 'Pending',
  under_review: 'Under Review',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  withdrawn: 'Withdrawn',
  enrolled: 'Enrolled',
}

export default function ApplicationDetail({ applicationId, onClose }) {
  const { selectedApplication, fetchApplication, updateApplication, loading } = useApplications()
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false)
  const [showDecisionGates, setShowDecisionGates] = useState(false)
  const [showOfferLetter, setShowOfferLetter] = useState(false)
  const [showEnrollment, setShowEnrollment] = useState(false)
  const [activities, setActivities] = useState([])
  const [interviewCompletionNotes, setInterviewCompletionNotes] = useState('')
  const [interviewCompletionFeedback, setInterviewCompletionFeedback] = useState('')

  const loadActivities = useCallback(async () => {
    if (!applicationId) return
    try {
      const acts = await getApplicationActivities(applicationId)
      setActivities(acts)
    } catch (error) {
      console.warn('Could not load activities:', error)
    }
  }, [applicationId])

  useEffect(() => {
    if (applicationId) {
      fetchApplication(applicationId)
      loadActivities()
      setActiveTab('overview')
      setShowInterviewScheduler(false)
      setShowDecisionGates(false)
      setShowOfferLetter(false)
      setShowEnrollment(false)
    }
  }, [applicationId, fetchApplication, loadActivities])

  useEffect(() => {
    if (selectedApplication) {
      setReviewNotes(selectedApplication.review_notes || '')
      setRejectionReason(selectedApplication.rejection_reason || '')
      setInterviewCompletionNotes(selectedApplication.interview_notes || '')
      setInterviewCompletionFeedback(selectedApplication.interview_feedback || '')
    } else {
      setReviewNotes('')
      setRejectionReason('')
      setActivities([])
      setInterviewCompletionNotes('')
      setInterviewCompletionFeedback('')
    }
  }, [selectedApplication])

  const handleStatusChange = async (newStatus) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      const updates = {
        status: newStatus,
        review_notes: reviewNotes || null,
        rejection_reason: newStatus === 'rejected' ? rejectionReason : null,
      }

      await updateApplication(selectedApplication.id, updates)

      await logActivity(selectedApplication.id, {
        type: 'status_change',
        title: 'Status changed',
        description: `Application status changed to ${statusLabels[newStatus] || newStatus}`,
      })

      await loadActivities()
    } catch (error) {
      console.error('Error updating application:', error)
      alert('Failed to update application: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleScheduleInterview = async (interviewData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await scheduleInterview(selectedApplication.id, interviewData)
      await fetchApplication(selectedApplication.id)
      setShowInterviewScheduler(false)
      await loadActivities()
    } catch (error) {
      console.error('Error scheduling interview:', error)
      alert('Failed to schedule interview: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteInterview = async (interviewData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await completeInterview(selectedApplication.id, interviewData)
      await fetchApplication(selectedApplication.id)
      await loadActivities()
    } catch (error) {
      console.error('Error completing interview:', error)
      alert('Failed to complete interview: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleScreeningComplete = async (screeningData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await updateApplication(selectedApplication.id, {
        ...screeningData,
        status: screeningData.flagged ? 'pending' : 'under_review',
      })
      await fetchApplication(selectedApplication.id)
      await loadActivities()
    } catch (error) {
      console.error('Error completing screening:', error)
      alert('Failed to complete screening: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReviewSave = async (reviewData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await updateApplication(selectedApplication.id, reviewData)
      await fetchApplication(selectedApplication.id)
    } catch (error) {
      console.error('Error saving review:', error)
      alert('Failed to save review: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReviewComplete = async (reviewData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await updateApplication(selectedApplication.id, {
        ...reviewData,
        status: 'under_review',
      })
      await fetchApplication(selectedApplication.id)
      await loadActivities()
    } catch (error) {
      console.error('Error completing review:', error)
      alert('Failed to complete review: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecisionGatesUpdate = async (gatesData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await updateApplication(selectedApplication.id, gatesData)
      await fetchApplication(selectedApplication.id)
      setShowDecisionGates(false)
      await loadActivities()
    } catch (error) {
      console.error('Error updating decision gates:', error)
      alert('Failed to update decision gates: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleOfferSend = async (offerData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await sendOfferLetter(selectedApplication.id, offerData)
      await fetchApplication(selectedApplication.id)
      setShowOfferLetter(false)
      await loadActivities()
    } catch (error) {
      console.error('Error sending offer:', error)
      alert('Failed to send offer: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleOfferSave = async (offerData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await updateApplication(selectedApplication.id, offerData)
      await fetchApplication(selectedApplication.id)
    } catch (error) {
      console.error('Error saving offer:', error)
      alert('Failed to save offer: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnrollmentComplete = async (enrollmentData) => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      await completeEnrollment(selectedApplication.id, enrollmentData)
      await fetchApplication(selectedApplication.id)
      setShowEnrollment(false)
      await loadActivities()
    } catch (error) {
      console.error('Error completing enrollment:', error)
      alert('Failed to complete enrollment: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (!selectedApplication || loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">
          <div className="text-slate-600">Loading application...</div>
        </div>
      </div>
    )
  }

  const app = selectedApplication

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl flex flex-col"
        style={{ maxHeight: '95vh', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-white/90 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Application Details</h2>
            <p className="text-sm text-slate-600">{app.courses?.title || 'Unknown Program'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
            type="button"
            aria-label="Close"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-slate-200 px-6">
          <div className="flex gap-1 overflow-x-auto">
            {['overview', 'workflow', 'screening', 'review', 'interview', 'offer', 'enrollment', 'timeline'].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ minHeight: 0, maxHeight: 'calc(95vh - 140px)' }}>
          {activeTab === 'overview' && (
            <>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Status</div>
                    <div className="text-lg font-semibold text-slate-900">{statusLabels[app.status] || app.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600">Submitted</div>
                    <div className="text-sm font-medium text-slate-900">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleString() : new Date(app.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <WorkflowProgress application={app} onNavigateToTab={setActiveTab} />

              <GlassCard title="Student Information">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <div className="text-slate-900">{app.student_name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <div className="text-slate-900">{app.student_email}</div>
                  </div>
                  {app.student_phone && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <div className="text-slate-900">{app.student_phone}</div>
                    </div>
                  )}
                  {app.student_address && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                      <div className="text-slate-900">{app.student_address}</div>
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard title="Application Responses">
                <div className="space-y-4">
                  {app.cover_letter && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Cover Letter</label>
                      <div className="bg-slate-50 rounded-lg p-4 text-slate-900 whitespace-pre-wrap">{app.cover_letter}</div>
                    </div>
                  )}
                  {app.motivation_statement && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Motivation Statement</label>
                      <div className="bg-slate-50 rounded-lg p-4 text-slate-900 whitespace-pre-wrap">{app.motivation_statement}</div>
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard title="Quick Actions">
                <div className="flex flex-wrap gap-3">
                  {app.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange('under_review')}
                      disabled={actionLoading}
                      className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      Move to Review
                    </button>
                  )}
                  {(app.status === 'pending' || app.status === 'under_review') && (
                    <>
                      <button
                        onClick={() => handleStatusChange('accepted')}
                        disabled={actionLoading}
                        className="rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusChange('rejected')}
                        disabled={actionLoading || !rejectionReason.trim()}
                        className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleStatusChange('waitlisted')}
                        disabled={actionLoading}
                        className="rounded-md bg-purple-600 text-white px-4 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        Waitlist
                      </button>
                    </>
                  )}
                  {app.status === 'under_review' && !app.interview_date && (
                    <button
                      onClick={() => setShowInterviewScheduler(true)}
                      className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
                    >
                      Schedule Interview
                    </button>
                  )}
                  {(app.status === 'interview_scheduled' || app.status === 'interview_completed') && (
                    <button
                      onClick={() => setActiveTab('interview')}
                      className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
                    >
                      View Interview
                    </button>
                  )}
                  {app.status === 'accepted' && !app.offer_sent && (
                    <button
                      onClick={() => setShowOfferLetter(true)}
                      className="rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700"
                    >
                      Send Offer Letter
                    </button>
                  )}
                  {app.status === 'accepted' && app.offer_sent && !app.enrolled_at && (
                    <button
                      onClick={() => setShowEnrollment(true)}
                      className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
                    >
                      Complete Enrollment
                    </button>
                  )}
                </div>
              </GlassCard>

              <div className="grid md:grid-cols-2 gap-4">
                <GlassCard title="Reviewer Notes">
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes for other reviewers..."
                    rows={4}
                  />
                </GlassCard>
                <GlassCard title="Rejection Reason">
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason required to reject an application"
                    rows={4}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    This field is required to enable the Reject action.
                  </p>
                </GlassCard>
              </div>
            </>
          )}

          {activeTab === 'workflow' && (
            <>
              <WorkflowProgress application={app} />
              {!showDecisionGates ? (
                <GlassCard title="Decision Gates">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Decision gates help ensure all requirements are met before making a final decision.
                    </p>
                    <button
                      onClick={() => setShowDecisionGates(true)}
                      className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
                    >
                      {app.decision_gates ? 'Update Decision Gates' : 'Set Decision Gates'}
                    </button>
                    {app.decision_gates && (
                      <div className="space-y-2 text-sm">
                        <div>Academic: {app.decision_gates.academic ? '✓ Passed' : 'Pending'}</div>
                        <div>Financial: {app.decision_gates.financial ? '✓ Passed' : 'Pending'}</div>
                        <div>Documentation: {app.decision_gates.documentation ? '✓ Passed' : 'Pending'}</div>
                        <div>Other: {app.decision_gates.other ? '✓ Passed' : 'Pending'}</div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ) : (
                <DecisionGates
                  application={app}
                  onUpdate={handleDecisionGatesUpdate}
                  onCancel={() => setShowDecisionGates(false)}
                />
              )}
            </>
          )}

          {activeTab === 'screening' && (
            <ScreeningCheck application={app} onComplete={handleScreeningComplete} onFlag={handleScreeningComplete} />
          )}

          {activeTab === 'review' && (
            <ReviewScoring application={app} onSave={handleReviewSave} onComplete={handleReviewComplete} />
          )}

          {activeTab === 'interview' && (
            <>
              {showInterviewScheduler ? (
                <InterviewScheduler
                  application={app}
                  onSchedule={handleScheduleInterview}
                  onCancel={() => setShowInterviewScheduler(false)}
                />
              ) : (
                <div className="space-y-4">
                  {app.interview_date ? (
                    <>
                      <GlassCard title="Interview Details">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                            <div className="text-slate-900">{new Date(app.interview_date).toLocaleString()}</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <div className="text-slate-900 capitalize">{app.interview_type || 'Not specified'}</div>
                          </div>
                          {app.interview_location && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Location/Link</label>
                              <div className="text-slate-900">{app.interview_location}</div>
                            </div>
                          )}
                          {app.interview_notes && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                              <div className="text-slate-900 whitespace-pre-wrap">{app.interview_notes}</div>
                            </div>
                          )}
                        </div>
                      </GlassCard>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const calendarLinks = getInterviewCalendarLinks(app, {
                            interview_date: app.interview_date,
                            interview_location: app.interview_location,
                          })
                          return (
                            <>
                              <a
                                href={calendarLinks.google}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Add to Google Calendar
                              </a>
                              <a
                                href={calendarLinks.outlook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Add to Outlook
                              </a>
                              <button
                                onClick={calendarLinks.download}
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Download .ics
                              </button>
                            </>
                          )
                        })()}
                      </div>
                      {!app.interview_completed && (
                        <GlassCard title="Complete Interview">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Notes</label>
                              <Textarea
                                value={interviewCompletionNotes}
                                onChange={(e) => setInterviewCompletionNotes(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Feedback</label>
                              <Textarea
                                value={interviewCompletionFeedback}
                                onChange={(e) => setInterviewCompletionFeedback(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleCompleteInterview({
                                    interview_notes: interviewCompletionNotes,
                                    interview_feedback: interviewCompletionFeedback,
                                  })
                                }
                                className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
                              >
                                Mark as Completed
                              </button>
                              <button
                                onClick={() => setShowInterviewScheduler(true)}
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Reschedule
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      )}
                      {app.interview_completed && app.interview_feedback && (
                        <GlassCard title="Interview Feedback">
                          <div className="text-slate-900 whitespace-pre-wrap">{app.interview_feedback}</div>
                        </GlassCard>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-600 mb-4">No interview scheduled yet</p>
                      <button
                        onClick={() => setShowInterviewScheduler(true)}
                        className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
                      >
                        Schedule Interview
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'offer' && (
            <>
              {showOfferLetter ? (
                <OfferLetter
                  application={app}
                  onSend={handleOfferSend}
                  onSave={handleOfferSave}
                  onCancel={() => setShowOfferLetter(false)}
                />
              ) : (
                <div className="space-y-4">
                  {app.offer_sent ? (
                    <GlassCard title="Offer Letter">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Sent Date</label>
                          <div className="text-slate-900">{app.offer_sent_at ? new Date(app.offer_sent_at).toLocaleString() : 'N/A'}</div>
                        </div>
                        {app.offer_letter && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Offer Content</label>
                            <div className="bg-slate-50 rounded-lg p-4 text-slate-900 whitespace-pre-wrap">{app.offer_letter}</div>
                          </div>
                        )}
                        {app.offer_conditions && app.offer_conditions.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Conditions</label>
                            <ul className="list-disc list-inside space-y-1 text-slate-900">
                              {app.offer_conditions.map((condition, index) => (
                                <li key={index}>{condition}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-600 mb-4">No offer letter sent yet</p>
                      <button
                        onClick={() => setShowOfferLetter(true)}
                        className="rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700"
                      >
                        Create Offer Letter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'enrollment' && (
            <>
              {showEnrollment ? (
                <EnrollmentProcess
                  application={app}
                  onComplete={handleEnrollmentComplete}
                  onCancel={() => setShowEnrollment(false)}
                />
              ) : (
                <div className="space-y-4">
                  {app.status === 'enrolled' ? (
                    <GlassCard title="Enrollment Details">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment Date</label>
                          <div className="text-slate-900">{app.enrolled_at ? new Date(app.enrolled_at).toLocaleString() : 'N/A'}</div>
                        </div>
                        {app.enrollment_student_id && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
                            <div className="text-slate-900">{app.enrollment_student_id}</div>
                          </div>
                        )}
                        {app.enrollment_start_date && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Program Start Date</label>
                            <div className="text-slate-900">{new Date(app.enrollment_start_date).toLocaleDateString()}</div>
                          </div>
                        )}
                        {app.enrollment_notes && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                            <div className="text-slate-900 whitespace-pre-wrap">{app.enrollment_notes}</div>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-600 mb-4">
                        {app.status === 'accepted' && app.offer_sent
                          ? 'Ready for enrollment'
                          : 'Application must be accepted and offer sent before enrollment'}
                      </p>
                      {app.status === 'accepted' && app.offer_sent && (
                        <button
                          onClick={() => setShowEnrollment(true)}
                          className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
                        >
                          Complete Enrollment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'timeline' && <ActivityTimeline activities={activities} />}
        </div>
        {actionLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
            <div className="text-slate-600 text-sm">Processing...</div>
          </div>
        )}
      </div>
    </div>
  )
}


