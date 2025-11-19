'use client'

import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

const scoringCategories = [
  { key: 'academics', label: 'Academic Fit' },
  { key: 'experience', label: 'Experience' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'communication', label: 'Communication' },
]

export default function ReviewScoring({ application, onSave, onComplete }) {
  const [scores, setScores] = useState(application?.review_scores || {})
  const [notes, setNotes] = useState(application?.review_notes || '')
  const [submitting, setSubmitting] = useState(false)

  const handleScoreChange = (key, value) => {
    const parsed = Math.max(1, Math.min(5, Number(value) || 0))
    setScores((prev) => ({ ...prev, [key]: parsed }))
  }

  const basePayload = () => ({
    review_scores: scores,
    review_notes: notes,
  })

  const handleSave = async (complete = false) => {
    setSubmitting(true)
    try {
      const payload = {
        ...basePayload(),
        review_completed: complete,
        review_completed_at: complete ? new Date().toISOString() : application?.review_completed_at || null,
      }
      if (complete) {
        await onComplete?.(payload)
      } else {
        await onSave?.(payload)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard title="Review Scorecard">
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {scoringCategories.map((category) => (
            <div key={category.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{category.label}</label>
              <Input
                type="number"
                min={1}
                max={5}
                step={1}
                value={scores[category.key] || ''}
                onChange={(e) => handleScoreChange(category.key, e.target.value)}
                placeholder="1-5"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reviewer Notes</label>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Summarize strengths, risks, and recommendations..."
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={submitting}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Complete Review
          </button>
        </div>
      </div>
    </GlassCard>
  )
}


