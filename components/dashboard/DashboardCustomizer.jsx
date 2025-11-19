'use client'

const WIDGETS = {
  operational: [
    { id: 'stat-cards', label: 'Stat Cards' },
    { id: 'pipeline-chart', label: 'Pipeline Chart' },
    { id: 'program-status', label: 'Program Status' },
    { id: 'marketing-sources', label: 'Marketing Sources' },
    { id: 'notifications', label: 'Notifications' },
  ],
  analytical: [
    { id: 'stat-cards', label: 'Stat Cards' },
    { id: 'trend-chart', label: 'Trend Chart' },
    { id: 'pipeline-chart', label: 'Pipeline Chart' },
    { id: 'conversion-rate', label: 'Conversion Rate' },
    { id: 'marketing-sources', label: 'Marketing Sources' },
  ],
  strategic: [
    { id: 'stat-cards', label: 'Stat Cards' },
    { id: 'kpi-progress', label: 'KPI Progress' },
    { id: 'program-status', label: 'Program Status' },
    { id: 'pipeline-chart', label: 'Pipeline Chart' },
  ],
}

export default function DashboardCustomizer({ view, visibleWidgets = [], onWidgetToggle, onClose }) {
  const widgets = WIDGETS[view] || []

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Customize Dashboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Select which widgets to display on your {view} dashboard:
          </p>
          <div className="space-y-3">
            {widgets.map((widget) => {
              const isVisible = visibleWidgets.length === 0 || visibleWidgets.includes(widget.id)
              return (
                <label
                  key={widget.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <span className="text-sm font-medium text-gray-900">{widget.label}</span>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => onWidgetToggle(widget.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              )
            })}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

