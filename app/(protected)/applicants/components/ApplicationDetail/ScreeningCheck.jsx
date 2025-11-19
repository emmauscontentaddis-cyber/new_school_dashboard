'use client'

import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Textarea from '@/components/ui/Textarea'

export default function ScreeningCheck({ application, onComplete, onFlag }) {
  const [flagged, setFlagged] = useState(Boolean(application?.screening_flagged))
  const [notes, setNotes] = useState(application?.screening_notes || '')
  const [riskLevel, setRiskLevel] = useState(application?.screening_risk || 'low')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        screening_completed: true,
        screening_completed_at: new Date().toISOString(),
        screening_notes: notes,
        screening_flagged: flagged,
        screening_risk: riskLevel,
        flagged,
      }
      if (flagged) {
        await onFlag?.(payload)
      } else {
        await onComplete?.(payload)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard title="Screening">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Risk Level</label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={flagged}
            onChange={(e) => setFlagged(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Flag for manual review</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Background results, missing documents, etc."
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {flagged ? 'Flag Application' : 'Mark Screening Complete'}
        </button>
      </form>
    </GlassCard>
  )
}


