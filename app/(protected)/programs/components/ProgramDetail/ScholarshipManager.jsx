'use client'

import { useState, useEffect } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'

export default function ScholarshipManager({ courseId }) {
  const [scholarships, setScholarships] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingScholarship, setEditingScholarship] = useState(null)

  useEffect(() => {
    loadScholarships()
  }, [courseId])

  const loadScholarships = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call to fetch scholarships
      // For now, return empty array
      setScholarships([])
    } catch (error) {
      console.error('Error loading scholarships:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-600">
        Loading scholarships...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Manage scholarships available for this program. Scholarships can be merit-based, need-based, or program-specific.
        </p>
        <Button onClick={() => setShowForm(true)}>
          Add Scholarship
        </Button>
      </div>

      {scholarships.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-slate-500 mb-4">No scholarships configured</div>
          <Button onClick={() => setShowForm(true)}>
            Create First Scholarship
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {scholarships.map((scholarship) => (
            <GlassCard key={scholarship.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{scholarship.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Amount: {scholarship.currency || 'SEK'} {scholarship.amount?.toLocaleString() || '0'}
                  </p>
                  {scholarship.description && (
                    <p className="text-sm text-slate-500 mt-2">{scholarship.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingScholarship(scholarship)}>
                    Edit
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {(showForm || editingScholarship) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingScholarship ? 'Edit Scholarship' : 'New Scholarship'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Scholarship Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Merit Scholarship"
                  defaultValue={editingScholarship?.name || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  defaultValue={editingScholarship?.amount || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Describe the scholarship criteria and benefits..."
                  defaultValue={editingScholarship?.description || ''}
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false)
                    setEditingScholarship(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    // TODO: Implement save scholarship
                    setShowForm(false)
                    setEditingScholarship(null)
                    await loadScholarships()
                  }}
                >
                  {editingScholarship ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}

