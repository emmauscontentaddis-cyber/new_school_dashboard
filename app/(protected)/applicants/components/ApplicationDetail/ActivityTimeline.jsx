'use client'

import GlassCard from '@/components/ui/GlassCard'

export default function ActivityTimeline({ activities = [] }) {
  return (
    <GlassCard title="Activity Timeline">
      {activities.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-6">No activity yet</div>
      ) : (
        <ul className="space-y-4">
          {activities.map((activity) => (
            <li key={activity.id || activity.created_at} className="flex gap-4">
              <div className="w-20 text-xs text-slate-500">
                {activity.created_at ? new Date(activity.created_at).toLocaleString() : '—'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">{activity.title || activity.type}</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">{activity.description}</div>
                {activity.user_name && <div className="text-xs text-slate-400 mt-1">By {activity.user_name}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}


