'use client'

import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Textarea from '@/components/ui/Textarea'

const defaultGates = {
  academic: false,
  financial: false,
  documentation: false,
  other: false,
  notes: '',
}

export default function DecisionGates({ application, onUpdate, onCancel }) {
  const [gates, setGates] = useState({
    ...defaultGates,
    ...(application?.decision_gates || {}),
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field, value) => {
    setGates((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onUpdate?.({ decision_gates: gates })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard title="Update Decision Gates">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {['academic', 'financial', 'documentation', 'other'].map((key) => (
          <label key={key} className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={Boolean(gates[key])}
              onChange={(e) => handleChange(key, e.target.checked)}
            />
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </label>
        ))}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <Textarea
            rows={3}
            value={gates.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Notes about outstanding items or approvals..."
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Save Gates
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


