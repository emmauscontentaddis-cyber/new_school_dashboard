'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ProgramStatusChart({ programs = [] }) {
  if (!programs || programs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No program data available
      </div>
    )
  }

  // Transform program data for chart
  const chartData = programs.slice(0, 10).map(program => ({
    name: (program.name || program.title || 'Unknown').substring(0, 20),
    enrolled: program.enrolled || 0,
    capacity: program.seats || program.capacity || 0,
    available: Math.max(0, (program.seats || program.capacity || 0) - (program.enrolled || 0)),
  }))

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
        <Bar dataKey="enrolled" fill="#10b981" name="Enrolled" />
        <Bar dataKey="available" fill="#e5e7eb" name="Available" />
      </BarChart>
    </ResponsiveContainer>
  )
}

