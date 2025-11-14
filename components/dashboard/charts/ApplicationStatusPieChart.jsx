'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

export default function ApplicationStatusPieChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No data available
      </div>
    )
  }

  const chartData = data.map(item => ({
    name: item.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
    value: item.count || 0,
    status: item.status
  })).filter(item => item.value > 0)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{payload[0].value}</span> applications
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {((payload[0].value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null // Don't show label for slices < 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span className="text-sm text-gray-700">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{total}</div>
        <div className="text-sm text-gray-600">Total Applications</div>
      </div>
    </div>
  )
}

