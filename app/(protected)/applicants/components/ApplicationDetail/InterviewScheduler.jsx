'use client'

import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

const interviewTypes = [
  { value: 'virtual', label: 'Virtual' },
  { value: 'in_person', label: 'In person' },
  { value: 'phone', label: 'Phone' },
]

export default function InterviewScheduler({ application, onSchedule, onCancel }) {
  const [form, setForm] = useState({
    interview_date: application?.interview_date?.slice(0, 16) || '',
    interview_type: application?.interview_type || 'virtual',
    interview_location: application?.interview_location || '',
    interview_notes: application?.interview_notes || '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.interview_date) return
    setSubmitting(true)
    try {
      await onSchedule?.({
        interview_date: new Date(form.interview_date).toISOString(),
        interview_type: form.interview_type,
        interview_location: form.interview_location,
        interview_notes: form.interview_notes,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard title="Schedule Interview">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
          <Input
            type="datetime-local"
            value={form.interview_date}
            onChange={(e) => handleChange('interview_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Interview Type</label>
          <select
            value={form.interview_type}
            onChange={(e) => handleChange('interview_type', e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {interviewTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location or Meeting Link</label>
          <Input
            type="text"
            value={form.interview_location}
            onChange={(e) => handleChange('interview_location', e.target.value)}
            placeholder="Zoom link, address, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <Textarea
            rows={3}
            value={form.interview_notes}
            onChange={(e) => handleChange('interview_notes', e.target.value)}
            placeholder="Add instructions or expectations for the applicant..."
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Schedule Interview
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </GlassCard>
  )
}


