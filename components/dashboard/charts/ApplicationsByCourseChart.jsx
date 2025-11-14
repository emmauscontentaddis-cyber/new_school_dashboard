'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function ApplicationsByCourseChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        No data available
      </div>
    )
  }

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
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => (
            <span className="text-sm text-gray-700 capitalize">
              {value.replace('_', ' ')}
            </span>
          )}
        />
        <Bar dataKey="pending" stackId="a" fill={COLORS[0]} name="Pending" radius={[0, 0, 0, 0]} />
        <Bar dataKey="under_review" stackId="a" fill={COLORS[1]} name="Under Review" radius={[0, 0, 0, 0]} />
        <Bar dataKey="accepted" stackId="a" fill={COLORS[2]} name="Accepted" radius={[0, 0, 0, 0]} />
        <Bar dataKey="rejected" stackId="a" fill={COLORS[3]} name="Rejected" radius={[0, 0, 0, 0]} />
        <Bar dataKey="enrolled" stackId="a" fill={COLORS[4]} name="Enrolled" radius={[0, 0, 0, 0]} />
        <Bar dataKey="waitlisted" stackId="a" fill={COLORS[5]} name="Waitlisted" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

