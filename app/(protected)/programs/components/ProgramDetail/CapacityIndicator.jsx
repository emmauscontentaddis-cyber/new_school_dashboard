'use client'

export default function CapacityIndicator({ 
  totalSeats, 
  enrolled, 
  reserved, 
  available, 
  showLabels = true,
  size = 'md' 
}) {
  const enrolledPercent = totalSeats > 0 ? (enrolled / totalSeats) * 100 : 0
  const reservedPercent = totalSeats > 0 ? (reserved / totalSeats) * 100 : 0
  const availablePercent = totalSeats > 0 ? (available / totalSeats) * 100 : 0

  const heightClass = size === 'lg' ? 'h-8' : 'h-6'
  const textSizeClass = size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div className="space-y-2">
      <div className={`w-full ${heightClass} bg-slate-200 rounded-full overflow-hidden flex`}>
        {enrolledPercent > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${enrolledPercent}%` }}
            title={`Enrolled: ${enrolled}`}
          />
        )}
        {reservedPercent > 0 && (
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${reservedPercent}%` }}
            title={`Reserved: ${reserved}`}
          />
        )}
        {availablePercent > 0 && (
          <div
            className="bg-slate-300 transition-all duration-300"
            style={{ width: `${availablePercent}%` }}
            title={`Available: ${available}`}
          />
        )}
      </div>
      {showLabels && (
        <div className={`flex flex-wrap gap-4 ${textSizeClass}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-slate-600">Enrolled ({enrolled})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-slate-600">Reserved ({reserved})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-slate-300"></div>
            <span className="text-slate-600">Available ({available})</span>
          </div>
        </div>
      )}
    </div>
  )
}

