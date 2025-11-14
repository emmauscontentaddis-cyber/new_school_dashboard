'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
  applications: '#3b82f6',
  accepted: '#10b981',
  enrolled: '#8b5cf6',
}

export default function ApplicationTrendChart({ data = [] }) {
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
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-sm text-gray-700 capitalize">
              {value.replace('_', ' ')}
            </span>
          )}
        />
        <Line
          type="monotone"
          dataKey="applications"
          stroke={COLORS.applications}
          strokeWidth={2}
          dot={{ fill: COLORS.applications, r: 4 }}
          activeDot={{ r: 6 }}
          name="Applications"
        />
        <Line
          type="monotone"
          dataKey="accepted"
          stroke={COLORS.accepted}
          strokeWidth={2}
          dot={{ fill: COLORS.accepted, r: 4 }}
          activeDot={{ r: 6 }}
          name="Accepted"
        />
        <Line
          type="monotone"
          dataKey="enrolled"
          stroke={COLORS.enrolled}
          strokeWidth={2}
          dot={{ fill: COLORS.enrolled, r: 4 }}
          activeDot={{ r: 6 }}
          name="Enrolled"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

