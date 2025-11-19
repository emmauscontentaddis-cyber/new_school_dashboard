'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = {
  pending: '#6366f1',
  under_review: '#f59e0b',
  interview_scheduled: '#8b5cf6',
  interview_completed: '#ec4899',
  accepted: '#10b981',
  rejected: '#ef4444',
  waitlisted: '#a855f7',
  enrolled: '#64748b',
}

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'In Review',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  enrolled: 'Enrolled',
}

export default function PipelineChart({ data = [], onSegmentClick }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        No pipeline data available
      </div>
    )
  }

  // Transform data for pie chart
  const chartData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count || 0,
    status: item.status,
  })).filter(item => item.value > 0)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">Count: {data.value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
          onClick={(data) => {
            if (onSegmentClick && data.status) {
              onSegmentClick(data.status)
            }
          }}
          style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[entry.status] || '#94a3b8'} 
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

