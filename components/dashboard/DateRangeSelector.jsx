'use client'

import { useState } from 'react'

const presets = [
  { id: 'last7', label: 'Last 7 days', days: 7 },
  { id: 'last30', label: 'Last 30 days', days: 30 },
  { id: 'last90', label: 'Last 90 days', days: 90 },
  { id: 'last365', label: 'Last year', days: 365 },
  { id: 'custom', label: 'Custom', days: null },
]

export default function DateRangeSelector({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(value?.preset === 'custom')
  const [customStart, setCustomStart] = useState(
    value?.preset === 'custom' && value?.startDate 
      ? new Date(value.startDate).toISOString().split('T')[0] 
      : ''
  )
  const [customEnd, setCustomEnd] = useState(
    value?.preset === 'custom' && value?.endDate 
      ? new Date(value.endDate).toISOString().split('T')[0] 
      : ''
  )

  const handlePresetChange = (preset) => {
    if (preset.id === 'custom') {
      setShowCustom(true)
      return
    }

    setShowCustom(false)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - preset.days)

    onChange({
      preset: preset.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label: preset.label,
    })
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        preset: 'custom',
        startDate: new Date(customStart).toISOString(),
        endDate: new Date(customEnd).toISOString(),
        label: `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}`,
      })
      setShowCustom(false)
    }
  }

  return (
    <div className="relative">
      <select
        value={value?.preset || 'last30'}
        onChange={(e) => {
          const preset = presets.find(p => p.id === e.target.value)
          if (preset) handlePresetChange(preset)
        }}
        className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {presets.map(preset => (
          <option key={preset.id} value={preset.id}>{preset.label}</option>
        ))}
      </select>

      {showCustom && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-10 min-w-[300px]">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCustomApply}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

