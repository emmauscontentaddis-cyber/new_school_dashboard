'use client'

import ApplicationTrendChart from './ApplicationTrendChart'

export default function TrendChart({ data, dateRange }) {
  // Transform data from {date, value} to {date, applications, accepted, enrolled}
  const transformedData = data.map(item => ({
    date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : item.date,
    applications: item.value || item.applications || 0,
    accepted: item.accepted || 0,
    enrolled: item.enrolled || 0,
  }))
  
  return <ApplicationTrendChart data={transformedData} />
}

