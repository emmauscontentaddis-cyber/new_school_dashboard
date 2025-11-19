'use client'

export default function KPIProgressChart({ label, current, target, color = 'indigo' }) {
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const colorClasses = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    blue: 'bg-blue-600',
    amber: 'bg-amber-600',
  }
  const bgColor = colorClasses[color] || colorClasses.indigo

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-lg font-bold text-gray-900">
            {current} / {target}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
          <div
            className={`h-full ${bgColor} transition-all duration-500 ease-out flex items-center justify-end pr-2`}
            style={{ width: `${percentage}%` }}
          >
            <span className="text-xs font-medium text-white">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        {current >= target ? (
          <span className="text-emerald-600 font-medium">Target achieved! 🎉</span>
        ) : (
          <span>{target - current} remaining to reach target</span>
        )}
      </div>
    </div>
  )
}

