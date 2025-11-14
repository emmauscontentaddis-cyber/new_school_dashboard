'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import StatCard from '@/components/ui/StatCard'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const Spinner = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin`}></div>
      {text && <div className="text-sm text-gray-600">{text}</div>}
    </div>
  )
}

export default function ReportsPage() {
  const { schoolId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pipelineData, setPipelineData] = useState(null)
  const [conversionData, setConversionData] = useState(null)
  const [marketingData, setMarketingData] = useState(null)

  const fetchReports = async () => {
    if (!schoolId) return
    
    setLoading(true)
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

      const params = new URLSearchParams({ school_id: schoolId })
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const [pipelineRes, conversionRes, marketingRes] = await Promise.allSettled([
        fetch(`${baseUrl}/api/reports/pipeline?${params}`),
        fetch(`${baseUrl}/api/reports/conversion?${params}`),
        fetch(`${baseUrl}/api/reports/marketing?${params}`),
      ])

      if (pipelineRes.status === 'fulfilled' && pipelineRes.value.ok) {
        setPipelineData(await pipelineRes.value.json())
      }
      if (conversionRes.status === 'fulfilled' && conversionRes.value.ok) {
        setConversionData(await conversionRes.value.json())
      }
      if (marketingRes.status === 'fulfilled' && marketingRes.value.ok) {
        setMarketingData(await marketingRes.value.json())
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (schoolId) {
      fetchReports()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600 text-sm">View detailed analytics and insights</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchReports} disabled={loading} className="w-full">
              {loading ? 'Loading...' : 'Update Reports'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" text="Loading reports..." />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Pipeline Efficiency */}
          {pipelineData && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Efficiency</h3>
              {pipelineData.stages && pipelineData.stages.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  {pipelineData.stages.map((stage) => (
                    <div key={stage.name} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{stage.count || 0}</div>
                      <div className="text-sm text-gray-600 mt-1 capitalize">{stage.name.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500 mt-1">{stage.percentage}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No pipeline data available</div>
              )}
            </div>
          )}

          {/* Conversion Rate */}
          {conversionData && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Analysis</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Overall Conversion Rate</div>
                  <div className="text-3xl font-bold text-gray-900">{conversionData.overall || 0}%</div>
                </div>
                {conversionData.byProgram && conversionData.byProgram.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">By Program</div>
                    <div className="space-y-2">
                      {conversionData.byProgram.slice(0, 5).map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-sm font-medium text-gray-900">{item.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Marketing Sources */}
          {marketingData && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Sources</h3>
              {marketingData.sources && marketingData.sources.length > 0 ? (
                <div className="space-y-3">
                  {marketingData.sources.map((source) => (
                    <div key={source.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{source.name}</div>
                        <div className="text-sm text-gray-600">
                          {source.total} applications • {source.conversionRate}% conversion
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{source.enrolled || 0}</div>
                        <div className="text-xs text-gray-500">enrolled</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No marketing data available</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
