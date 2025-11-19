'use client'

import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Textarea from '@/components/ui/Textarea'
import Input from '@/components/ui/Input'

export default function OfferLetter({ application, onSend, onSave, onCancel }) {
  const [offerLetter, setOfferLetter] = useState(application?.offer_letter || defaultOfferTemplate(application))
  const [conditions, setConditions] = useState((application?.offer_conditions || []).join('\n'))
  const [tuitionDeposit, setTuitionDeposit] = useState(application?.offer_deposit || '')
  const [submitting, setSubmitting] = useState(false)

  const buildPayload = () => ({
    offer_letter: offerLetter,
    offer_conditions: conditions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    offer_deposit: tuitionDeposit || null,
  })

  const handleAction = async (handler) => {
    setSubmitting(true)
    try {
      await handler?.(buildPayload())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard title="Offer Letter">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tuition Deposit (optional)</label>
          <Input
            type="number"
            min="0"
            value={tuitionDeposit}
            onChange={(e) => setTuitionDeposit(e.target.value)}
            placeholder="e.g. 500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Offer Content</label>
          <Textarea
            rows={8}
            value={offerLetter}
            onChange={(e) => setOfferLetter(e.target.value)}
            placeholder="Write the body of the offer letter..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Conditions (one per line)</label>
          <Textarea
            rows={4}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder={'Send official transcripts\nComplete enrollment paperwork'}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAction(onSave)}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleAction(onSend)}
            disabled={submitting}
            className="rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Send Offer
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </GlassCard>
  )
}

function defaultOfferTemplate(application) {
  return [
    `Dear ${application?.student_name || 'Applicant'},`,
    '',
    `Congratulations! We are pleased to offer you admission to the ${application?.courses?.title || 'program'}.`,
    'Please review the details of this offer and confirm your acceptance by the deadline included in this letter.',
    '',
    'We are excited to welcome you to our learning community.',
    '',
    'Sincerely,',
    'Admissions Team',
  ].join('\n')
}


