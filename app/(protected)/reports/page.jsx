'use client'

import { useState, useEffect } from 'react'
// Reports page - Analytics and reporting dashboard
import GlassCard from '@/components/ui/GlassCard'
import StatCard from '@/components/ui/StatCard'
import Loader from '@/components/ui/Loader'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector'
import { 
  getEnrollmentTrends, 
  getMarketingSourceAnalysis, 
  getPipelineEfficiency, 
  getDemographicsReport,
  getConversionRateAnalysis 
} from '@/services/reports'
import { exportToCSV, exportToJSON } from '@/utils/export'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('enrollment')
  const [dateRange, setDateRange] = useState({
    preset: 'last30',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    label: 'Last 30 days'
  })
  const [loading, setLoading] = useState(false)

  // Report data states
  const [enrollmentData, setEnrollmentData] = useState({ trends: [], yoy: 0, qoq: 0, mom: 0 })
  const [marketingData, setMarketingData] = useState({ sources: [], total: 0, conversionBySource: {} })
  const [pipelineData, setPipelineData] = useState({ stages: [], avgTimeByStage: {}, dropoffRates: {}, totalTime: 0 })
  const [demographicsData, setDemographicsData] = useState({ ageGroups: {}, genders: {}, countries: {}, education: {} })
  const [conversionData, setConversionData] = useState({ overall: 0, byProgram: [], bySource: [], byMonth: [] })

  useEffect(() => {
    // Only load data for the active tab
    // Debounce to avoid rapid reloads when date range changes
    const timer = setTimeout(() => {
      loadReportData()
    }, 200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange])

  const loadReportData = async () => {
    setLoading(true)
    try {
      const range = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }

      // Add timeout to prevent hanging (30 seconds for complex reports)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )

      let dataPromise

      switch (activeTab) {
        case 'enrollment':
          dataPromise = getEnrollmentTrends(range)
          break
        case 'marketing':
          dataPromise = getMarketingSourceAnalysis(range)
          break
        case 'pipeline':
          dataPromise = getPipelineEfficiency(range)
          break
        case 'demographics':
          dataPromise = getDemographicsReport(range)
          break
        case 'conversion':
          dataPromise = getConversionRateAnalysis(range)
          break
        default:
          setLoading(false)
          return
      }

      const result = await Promise.race([dataPromise, timeoutPromise])

      switch (activeTab) {
        case 'enrollment':
          setEnrollmentData(result)
          break
        case 'marketing':
          setMarketingData(result)
          break
        case 'pipeline':
          setPipelineData(result)
          break
        case 'demographics':
          setDemographicsData(result)
          break
        case 'conversion':
          setConversionData(result)
          break
      }
    } catch (error) {
      console.error('Error loading report data:', error)
      // Set empty data on error to prevent UI from breaking
      switch (activeTab) {
        case 'enrollment':
          setEnrollmentData({ trends: [], yoy: 0, qoq: 0, mom: 0 })
          break
        case 'marketing':
          setMarketingData({ sources: [], total: 0, conversionBySource: {} })
          break
        case 'pipeline':
          setPipelineData({ stages: [], avgTimeByStage: {}, dropoffRates: {}, totalTime: 0 })
          break
        case 'demographics':
          setDemographicsData({ ageGroups: {}, genders: {}, countries: {}, education: {} })
          break
        case 'conversion':
          setConversionData({ overall: 0, byProgram: [], bySource: [], byMonth: [] })
          break
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (format) => {
    let data = []
    let filename = 'report'

    switch (activeTab) {
      case 'enrollment':
        data = enrollmentData.trends.map(t => ({
          Month: t.month,
          Applications: t.applications,
          Enrolled: t.enrolled,
          'Conversion Rate (%)': t.conversionRate
        }))
        filename = 'enrollment-trends'
        break
      case 'marketing':
        data = marketingData.sources.map(s => ({
          Source: s.name,
          'Total Applications': s.total,
          Accepted: s.accepted,
          Enrolled: s.enrolled,
          'Conversion Rate (%)': s.conversionRate,
          'Enrollment Rate (%)': s.enrollmentRate
        }))
        filename = 'marketing-source-analysis'
        break
      case 'pipeline':
        data = pipelineData.stages.map(s => ({
          Stage: s.name,
          Count: s.count,
          'Percentage (%)': s.percentage
        }))
        filename = 'pipeline-efficiency'
        break
      case 'demographics':
        data = [
          ...Object.entries(demographicsData.ageGroups).map(([age, count]) => ({
            Category: 'Age Group',
            Value: age,
            Count: count
          })),
          ...Object.entries(demographicsData.genders).map(([gender, count]) => ({
            Category: 'Gender',
            Value: gender,
            Count: count
          })),
          ...Object.entries(demographicsData.countries).map(([country, count]) => ({
            Category: 'Country',
            Value: country,
            Count: count
          }))
        ]
        filename = 'demographics-report'
        break
      case 'conversion':
        data = conversionData.byProgram.map(p => ({
          Program: p.name,
          'Total Applications': p.total,
          Accepted: p.accepted,
          'Conversion Rate (%)': p.rate
        }))
        filename = 'conversion-rate-analysis'
        break
    }

    if (format === 'csv') {
      exportToCSV(data, `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
    } else if (format === 'json') {
      exportToJSON(data, `${filename}-${new Date().toISOString().split('T')[0]}.json`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range and Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            📥 Export JSON
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'enrollment', label: '📈 Enrollment Trends', icon: '📈' },
            { id: 'marketing', label: '📢 Marketing Sources', icon: '📢' },
            { id: 'pipeline', label: '⚙️ Pipeline Efficiency', icon: '⚙️' },
            { id: 'demographics', label: '👥 Demographics', icon: '👥' },
            { id: 'conversion', label: '🎯 Conversion Rates', icon: '🎯' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="py-16">
          <Loader 
            size="lg" 
            text={activeTab === 'enrollment' ? 'Loading enrollment trends...' : activeTab === 'marketing' ? 'Loading marketing analysis...' : activeTab === 'pipeline' ? 'Loading pipeline metrics...' : activeTab === 'demographics' ? 'Loading demographics...' : 'Loading conversion rates...'} 
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enrollment Trends */}
          {activeTab === 'enrollment' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <StatCard label="Year-over-Year" value={`${enrollmentData.yoy > 0 ? '+' : ''}${enrollmentData.yoy}%`} icon="📈" tone="emerald" />
                <StatCard label="Quarter-over-Quarter" value={`${enrollmentData.qoq > 0 ? '+' : ''}${enrollmentData.qoq}%`} icon="📊" tone="blue" />
                <StatCard label="Month-over-Month" value={`${enrollmentData.mom > 0 ? '+' : ''}${enrollmentData.mom}%`} icon="📅" tone="indigo" />
              </div>
              <GlassCard title="Enrollment Trends Over Time" subtitle="Monthly application and enrollment data">
                <div style={{ minHeight: '400px', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={enrollmentData.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={2} name="Applications" />
                      <Line type="monotone" dataKey="enrolled" stroke="#10b981" strokeWidth={2} name="Enrolled" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Marketing Source Analysis */}
          {activeTab === 'marketing' && !loading && (
            <div className="space-y-6">
              <StatCard label="Total Applications" value={marketingData.total} icon="📊" tone="slate" />
              <div className="grid md:grid-cols-2 gap-6">
                <GlassCard title="Applications by Source" subtitle="Distribution of applications">
                  <div style={{ minHeight: '350px', height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={marketingData.sources}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {marketingData.sources.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
                <GlassCard title="Conversion Rate by Source" subtitle="Acceptance rates">
                  <div style={{ minHeight: '350px', height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marketingData.sources}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="conversionRate" fill="#3b82f6" name="Conversion Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
              <GlassCard title="Marketing Source Details" subtitle="Complete breakdown">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Source</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700">Total</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700">Accepted</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700">Enrolled</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700">Conversion</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700">Enrollment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketingData.sources.map((source, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-900">{source.name}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{source.total}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{source.accepted}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{source.enrolled}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-medium">{source.conversionRate}%</td>
                          <td className="py-2 px-3 text-right text-blue-600 font-medium">{source.enrollmentRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Pipeline Efficiency */}
          {activeTab === 'pipeline' && !loading && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <StatCard 
                  label="Avg. Review Time" 
                  value={`${pipelineData.avgTimeByStage['pending_to_review'] || 0}d`} 
                  icon="⏱️" 
                  tone="blue" 
                />
                <StatCard 
                  label="Avg. Decision Time" 
                  value={`${pipelineData.avgTimeByStage['review_to_decision'] || 0}d`} 
                  icon="⚡" 
                  tone="indigo" 
                />
                <StatCard 
                  label="Avg. Enrollment Time" 
                  value={`${pipelineData.avgTimeByStage['decision_to_enrollment'] || 0}d`} 
                  icon="📝" 
                  tone="emerald" 
                />
              </div>
              <GlassCard title="Pipeline Stages Distribution" subtitle="Applications by status">
                <div style={{ minHeight: '400px', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData.stages}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Applications" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Demographics */}
          {activeTab === 'demographics' && !loading && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <GlassCard title="Age Distribution" subtitle="Applications by age group">
                  <div style={{ minHeight: '300px', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(demographicsData.ageGroups).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
                <GlassCard title="Gender Distribution" subtitle="Applications by gender">
                  <div style={{ minHeight: '300px', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(demographicsData.genders).map(([name, value]) => ({ name, value }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {Object.entries(demographicsData.genders).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
              <GlassCard title="Geographic Distribution" subtitle="Applications by country">
                <div style={{ minHeight: '300px', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(demographicsData.countries).map(([name, value]) => ({ name, value })).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Conversion Rates */}
          {activeTab === 'conversion' && !loading && (
            <div className="space-y-6">
              <StatCard label="Overall Conversion Rate" value={`${conversionData.overall}%`} icon="🎯" tone="emerald" />
              <div className="grid md:grid-cols-2 gap-6">
                <GlassCard title="Conversion by Program" subtitle="Acceptance rates per program">
                  <div style={{ minHeight: '400px', height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversionData.byProgram.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="rate" fill="#3b82f6" name="Conversion Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
                <GlassCard title="Conversion by Marketing Source" subtitle="Acceptance rates by source">
                  <div style={{ minHeight: '400px', height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversionData.bySource}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="rate" fill="#10b981" name="Conversion Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
              <GlassCard title="Monthly Conversion Trends" subtitle="Conversion rate over time">
                <div style={{ minHeight: '300px', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversionData.byMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="Conversion Rate (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

