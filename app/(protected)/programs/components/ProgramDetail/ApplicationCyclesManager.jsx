'use client'

import { useState, useEffect } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ApplicationCyclesManager({ courseId }) {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCycle, setEditingCycle] = useState(null)

  useEffect(() => {
    loadCycles()
  }, [courseId])

  const loadCycles = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call to fetch application cycles
      // For now, return empty array
      setCycles([])
    } catch (error) {
      console.error('Error loading cycles:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-600">
        Loading application cycles...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Manage multiple application cycles for this program. Each cycle can have its own deadline and capacity.
        </p>
        <Button onClick={() => setShowForm(true)}>
          Add Cycle
        </Button>
      </div>

      {cycles.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-slate-500 mb-4">No application cycles configured</div>
          <Button onClick={() => setShowForm(true)}>
            Create First Cycle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <GlassCard key={cycle.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{cycle.name}</h4>
                  <p className="text-sm text-slate-600">
                    Deadline: {cycle.deadline ? new Date(cycle.deadline).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingCycle(cycle)}>
                    Edit
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {(showForm || editingCycle) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingCycle ? 'Edit Cycle' : 'New Application Cycle'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cycle Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Fall 2024"
                  defaultValue={editingCycle?.name || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Application Deadline
                </label>
                <Input
                  type="datetime-local"
                  defaultValue={editingCycle?.deadline ? new Date(editingCycle.deadline).toISOString().slice(0, 16) : ''}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false)
                    setEditingCycle(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    // TODO: Implement save cycle
                    setShowForm(false)
                    setEditingCycle(null)
                    await loadCycles()
                  }}
                >
                  {editingCycle ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}

