'use client'

import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

export default function EnrollmentProcess({ application, onComplete, onCancel }) {
  const [form, setForm] = useState({
    enrollment_student_id: application?.enrollment_student_id || '',
    enrollment_start_date: application?.enrollment_start_date
      ? application.enrollment_start_date.slice(0, 10)
      : '',
    enrollment_notes: application?.enrollment_notes || '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onComplete?.({
        enrollment_student_id: form.enrollment_student_id,
        enrollment_start_date: form.enrollment_start_date
          ? new Date(form.enrollment_start_date).toISOString()
          : null,
        enrollment_notes: form.enrollment_notes,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard title="Complete Enrollment">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
          <Input
            type="text"
            value={form.enrollment_student_id}
            onChange={(e) => handleChange('enrollment_student_id', e.target.value)}
            placeholder="Internal student identifier"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Program Start Date</label>
          <Input
            type="date"
            value={form.enrollment_start_date}
            onChange={(e) => handleChange('enrollment_start_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment Notes</label>
          <Textarea
            rows={4}
            value={form.enrollment_notes}
            onChange={(e) => handleChange('enrollment_notes', e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Mark Enrolled
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


