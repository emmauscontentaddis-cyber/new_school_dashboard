'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'In Review',
  interview_scheduled: 'Interview',
  interview_completed: 'Post-Interview',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  enrolled: 'Enrolled',
}

export default function ConversionRateChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No conversion data available
      </div>
    )
  }

  // Calculate conversion rates
  const total = data.reduce((sum, item) => sum + (item.count || 0), 0)
  const chartData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    count: item.count || 0,
    percentage: total > 0 ? ((item.count || 0) / total * 100).toFixed(1) : 0,
  })).filter(item => item.count > 0)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          tick={{ fontSize: 11 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="count" fill="#3b82f6" name="Count" />
        <Bar dataKey="percentage" fill="#10b981" name="Percentage (%)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

