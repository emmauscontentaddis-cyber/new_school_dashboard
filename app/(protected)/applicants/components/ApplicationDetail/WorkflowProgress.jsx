'use client'

import GlassCard from '@/components/ui/GlassCard'

const statusOrder = [
  'pending',
  'under_review',
  'interview_scheduled',
  'interview_completed',
  'accepted',
  'enrolled',
]

const statusLabels = {
  pending: 'Submitted',
  under_review: 'Review',
  interview_scheduled: 'Interview',
  interview_completed: 'Post-Interview',
  accepted: 'Offer',
  enrolled: 'Enrolled',
}

export default function WorkflowProgress({ application, onNavigateToTab }) {
  if (!application) return null

  const currentIndex = statusOrder.indexOf(application.status)

  return (
    <GlassCard title="Workflow Progress">
      <div className="flex flex-col gap-4">
        {statusOrder.map((status, index) => {
          const isComplete = currentIndex >= index
          return (
            <div key={status} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onNavigateToTab?.(mapStatusToTab(status))}
                  className={`h-10 w-10 rounded-full border-2 text-sm font-semibold transition ${
                    isComplete
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {index + 1}
                </button>
                {index < statusOrder.length - 1 && (
                  <div className={`w-0.5 h-8 mt-2 ${currentIndex >= index + 1 ? 'bg-blue-500' : 'bg-slate-200'}`} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="text-sm font-medium text-slate-900">{statusLabels[status]}</div>
                <div className="text-xs text-slate-500">
                  {application.status === status ? 'In progress' : isComplete ? 'Complete' : 'Pending'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

function mapStatusToTab(status) {
  switch (status) {
    case 'pending':
    case 'under_review':
      return 'review'
    case 'interview_scheduled':
    case 'interview_completed':
      return 'interview'
    case 'accepted':
      return 'offer'
    case 'enrolled':
      return 'enrollment'
    default:
      return 'overview'
  }
}


