'use client'

export default function ViewSwitcher({ value, onChange }) {
  const views = [
    { id: 'operational', label: 'Operational' },
    { id: 'analytical', label: 'Analytical' },
    { id: 'strategic', label: 'Strategic' },
  ]

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onChange(view.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            value === view.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}

