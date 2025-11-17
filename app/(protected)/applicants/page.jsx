'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useApplications } from '@/context/ApplicationsContext'
import { usePrograms } from '@/context/ProgramsContext'
import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const Spinner = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin`}></div>
      {text && <div className="text-sm text-gray-600">{text}</div>}
    </div>
  )
}

const statusLabels = {
  pending: 'Pending',
  under_review: 'Under Review',
  interview_scheduled: 'Interview Scheduled',
  accepted: 'Approved',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  enrolled: 'Enrolled',
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  under_review: 'bg-blue-100 text-blue-800',
  interview_scheduled: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  waitlisted: 'bg-purple-100 text-purple-800',
  enrolled: 'bg-green-100 text-green-800',
}

export default function ApplicantsPage() {
  const { applications, stats, loading, error, fetchApplications, fetchStats } = useApplications()
  const { programs, fetchPrograms } = usePrograms()

  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(searchParams?.get('status') || 'all')
  const [courseId, setCourseId] = useState(searchParams?.get('courseId') || 'all')
  const [selectedApplication, setSelectedApplication] = useState(null)

  useEffect(() => {
    if (!searchParams) return
    const urlStatus = searchParams.get('status')
    const urlCourseId = searchParams.get('courseId')
    if (urlStatus) setStatus(urlStatus)
    if (urlCourseId) setCourseId(urlCourseId)
  }, [searchParams])

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.allSettled([
          fetchApplications({}),
          fetchStats(),
          fetchPrograms()
        ])
      } catch (error) {
        console.error('Error loading applications data:', error)
      }
    }
    loadData()
  }, [fetchApplications, fetchStats, fetchPrograms])

  const filtered = useMemo(() => {
    let filtered = applications

    if (status !== 'all') {
      filtered = filtered.filter(app => app.status === status)
    }

    if (courseId !== 'all') {
      filtered = filtered.filter(app => app.course_id === courseId)
    }

    if (query) {
      const q = query.toLowerCase()
      filtered = filtered.filter(app => 
        app.student_name?.toLowerCase().includes(q) ||
        app.student_email?.toLowerCase().includes(q) ||
        app.courses?.title?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [applications, status, courseId, query])

  if (selectedApplication) {
    return (
      <div>
        <button
          onClick={() => setSelectedApplication(null)}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to list
        </button>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">{selectedApplication.student_name}</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="text-gray-900">{selectedApplication.student_email}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Program</label>
              <div className="text-gray-900">{selectedApplication.courses?.title || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <div>
                <span className={`px-2 py-1 rounded text-sm ${statusColors[selectedApplication.status] || statusColors.pending}`}>
                  {statusLabels[selectedApplication.status] || selectedApplication.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Applied</label>
              <div className="text-gray-900">
                {selectedApplication.created_at ? new Date(selectedApplication.created_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Applications</h1>
        <p className="text-gray-600 text-sm">Manage and review student applications</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <Input
              type="text"
              placeholder="Search by name, email, or program..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="all">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name || program.title}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.pending || 0}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.under_review || 0}</div>
          <div className="text-sm text-gray-600">In Review</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.accepted || 0}</div>
          <div className="text-sm text-gray-600">Accepted</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
      </div>

      {/* Applications List */}
      {loading && applications.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" text="Loading applications..." />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-200 text-center">
          <div className="text-gray-500">No applications found</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-700">Student</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Program</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Applied</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{app.student_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{app.student_email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {app.courses?.title || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm ${statusColors[app.status] || statusColors.pending}`}>
                        {statusLabels[app.status] || app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedApplication(app)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                        {app.student_id && (
                          <button
                            onClick={() => {
                              window.location.href = `/chat?studentId=${app.student_id}`
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                            title="Chat with student"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Chat
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
