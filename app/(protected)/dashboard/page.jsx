'use client'

import { useAuth } from '@/context/AuthContext'
import { useApplications } from '@/context/ApplicationsContext'
import { usePrograms } from '@/context/ProgramsContext'
import StatCard from '@/components/ui/StatCard'
import ViewSwitcher from '@/components/ui/ViewSwitcher'
import Loader from '@/components/ui/Loader'
import PipelineChart from '@/components/dashboard/charts/PipelineChart'
import ProgramStatusChart from '@/components/dashboard/charts/ProgramStatusChart'
import MarketingSourceWidget from '@/components/dashboard/MarketingSourceWidget'
import NotificationCenter from '@/components/dashboard/NotificationCenter'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector'
import TrendChart from '@/components/dashboard/charts/TrendChart'
import ConversionRateChart from '@/components/dashboard/charts/ConversionRateChart'
import KPIProgressChart from '@/components/dashboard/charts/KPIProgressChart'
import ExportButton from '@/components/dashboard/ExportButton'
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer'
import ShareButton from '@/components/dashboard/ShareButton'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getPipelineData, 
  getAnalyticalData, 
  getStrategicData, 
  getTrendData 
} from '@/services/dashboard'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { stats, fetchStats, fetchApplications, applications } = useApplications()
  const { programs, fetchPrograms } = usePrograms()
  
  const [view, setView] = useState('operational')
  const [dateRange, setDateRange] = useState(null)
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  const [pipelineData, setPipelineData] = useState([])
  const [analyticalData, setAnalyticalData] = useState({
    yoyApplications: '0%',
    conversionRate: '0%',
    avgReviewTime: '0d',
    declines: 0
  })
  const [strategicData, setStrategicData] = useState({
    targetEnrolment: 0,
    enrolled: 0,
    progress: '0%',
    scholarshipBudget: '$0',
    atRisk: 0,
    atRiskText: '0 programs'
  })
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(false)

  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`dashboard-widgets-operational`)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          return null
        }
      }
    }
    return null
  })

  const isWidgetVisible = useCallback((widgetId) => {
    if (!visibleWidgets || visibleWidgets.length === 0) {
      return true
    }
    return visibleWidgets.includes(widgetId)
  }, [visibleWidgets])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`dashboard-widgets-${view}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setVisibleWidgets(parsed)
        } catch (e) {
          setVisibleWidgets(null)
        }
      } else {
        setVisibleWidgets(null)
      }
    }
  }, [view])

  // Initialize dashboard
  useEffect(() => {
    const loadInitial = async () => {
      try {
        await Promise.allSettled([
          fetchStats(),
          fetchPrograms(),
          fetchApplications({})
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }
    
    loadInitial()
  }, [fetchStats, fetchPrograms, fetchApplications])

  const refreshDashboard = useCallback(async (dateRange) => {
    if (loading) return
    
    setLoading(true)
    
    try {
      const results = await Promise.allSettled([
        getPipelineData(),
        getAnalyticalData(dateRange),
        getStrategicData(),
        getTrendData(dateRange)
      ])

      setPipelineData(results[0].status === 'fulfilled' ? results[0].value : [])
      setAnalyticalData(results[1].status === 'fulfilled' ? results[1].value : {
        yoyApplications: '0%',
        conversionRate: '0%',
        avgReviewTime: '0d',
        declines: 0
      })
      setStrategicData(results[2].status === 'fulfilled' ? results[2].value : {
        targetEnrolment: 0,
        enrolled: 0,
        progress: '0%',
        scholarshipBudget: '$0',
        atRisk: 0,
        atRiskText: '0 programs'
      })
      setTrendData(results[3].status === 'fulfilled' ? results[3].value : [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    refreshDashboard(dateRange)
  }, [dateRange, refreshDashboard])

  const handleStatCardClick = useCallback((status) => {
    router.push(`/applicants?status=${status}`)
  }, [router])

  const handleChartClick = useCallback((type, value) => {
    if (type === 'pipeline') {
      router.push(`/applicants?status=${value}`)
    } else if (type === 'marketing') {
      router.push(`/applicants?marketing_source=${encodeURIComponent(value)}`)
    } else if (type === 'program') {
      router.push(`/applicants?courseId=${value}`)
    }
  }, [router])

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600 text-sm">Welcome back! Here's what's happening with your school.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refreshDashboard(dateRange)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              {loading ? (
                <Loader size="sm" />
              ) : (
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>Refresh</span>
            </button>
            {(view === 'analytical' || view === 'strategic') && (
              <DateRangeSelector value={dateRange} onChange={setDateRange} />
            )}
            <ViewSwitcher value={view} onChange={setView} />
            <ShareButton view={view} dateRange={dateRange} />
            <ExportButton 
              data={applications} 
              dataType="applications"
              filename={`applications-${new Date().toISOString().split('T')[0]}.csv`}
            />
            <button
              onClick={() => setShowCustomizer(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Customize</span>
            </button>
          </div>
        </div>
      </div>

      {view === 'operational' && (
        <div className="grid gap-6 pb-8">
          {/* Stat Cards */}
          {isWidgetVisible('stat-cards') && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard 
              label="New Applications" 
              value={stats.pending || 0} 
              icon="📝" 
              tone="indigo"
              onClick={() => handleStatCardClick('pending')}
            />
            <StatCard 
              label="In Review" 
              value={stats.under_review || 0} 
              icon="🔎" 
              tone="amber"
              onClick={() => handleStatCardClick('under_review')}
            />
            <StatCard 
              label="Accepted" 
              value={stats.accepted || 0} 
              icon="✅" 
              tone="emerald"
              onClick={() => handleStatCardClick('accepted')}
            />
            <StatCard 
              label="Rejected" 
              value={stats.rejected || 0} 
              icon="❌" 
              tone="red"
              onClick={() => handleStatCardClick('rejected')}
            />
            <StatCard 
              label="Enrolled" 
              value={stats.enrolled || 0} 
              icon="🎓" 
              tone="slate"
              onClick={() => handleStatCardClick('enrolled')}
            />
            <StatCard 
              label="Total Programs" 
              value={programs.length} 
              icon="📚" 
              tone="blue"
              onClick={() => router.push('/programs')}
            />
          </div>
          )}

          {/* Charts Row */}
          {(isWidgetVisible('pipeline-chart') || isWidgetVisible('program-status')) && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {isWidgetVisible('pipeline-chart') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Application Pipeline</h3>
              <p className="text-sm text-gray-600 mb-4">Application flow through stages</p>
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader size="md" text="Loading pipeline data..." />
                </div>
              ) : (
                <PipelineChart 
                  data={pipelineData} 
                  onSegmentClick={(status) => handleChartClick('pipeline', status)}
                />
              )}
            </div>
            )}

            {isWidgetVisible('program-status') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Program Status</h3>
              <p className="text-sm text-gray-600 mb-4">Program capacity and status</p>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader size="md" text="Loading program data..." />
                </div>
              ) : (
                <ProgramStatusChart programs={programs} />
              )}
            </div>
            )}
          </div>
          )}

          {/* Marketing Source & Notifications Row */}
          {(isWidgetVisible('marketing-sources') || isWidgetVisible('notifications')) && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {isWidgetVisible('marketing-sources') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Marketing Sources</h3>
              <p className="text-sm text-gray-600 mb-4">Applications by marketing channel</p>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader size="md" text="Loading marketing data..." />
                </div>
              ) : (
                <MarketingSourceWidget 
                  applications={applications}
                  onSourceClick={(source) => handleChartClick('marketing', source)}
                />
              )}
            </div>
            )}

            {isWidgetVisible('notifications') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Notifications & Tasks</h3>
              <p className="text-sm text-gray-600 mb-4">Recent activity and pending tasks</p>
              <NotificationCenter />
            </div>
            )}
          </div>
          )}
        </div>
      )}

      {view === 'analytical' && (
        <div className="grid gap-6 pb-8">
          {/* Stat Cards */}
          {isWidgetVisible('stat-cards') && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard 
              label="YoY Applications" 
              value={loading ? '...' : analyticalData.yoyApplications} 
              icon="📈" 
              tone="emerald" 
            />
            <StatCard 
              label="Conversion Rate" 
              value={loading ? '...' : analyticalData.conversionRate} 
              icon="🔁" 
              tone="slate" 
            />
            <StatCard 
              label="Avg. Review Time" 
              value={loading ? '...' : analyticalData.avgReviewTime} 
              icon="⏱️" 
              tone="indigo" 
            />
            <StatCard 
              label="Declines" 
              value={loading ? '...' : analyticalData.declines} 
              icon="❌" 
              tone="amber" 
            />
          </div>
          )}

          {/* Charts Row */}
          {(isWidgetVisible('trend-chart') || isWidgetVisible('pipeline-chart')) && (
          <div className="grid gap-6 md:grid-cols-2">
            {isWidgetVisible('trend-chart') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Application Trends</h3>
              <p className="text-sm text-gray-600 mb-4">Applications over time</p>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader size="md" text="Loading trend data..." />
                </div>
              ) : (
                <div id="trend-chart">
                  <TrendChart data={trendData} dateRange={dateRange} />
                </div>
              )}
            </div>
            )}

            {isWidgetVisible('pipeline-chart') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Application Pipeline</h3>
              <p className="text-sm text-gray-600 mb-4">Historical application flow</p>
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader size="md" text="Loading pipeline data..." />
                </div>
              ) : (
                <PipelineChart 
                  data={pipelineData} 
                  onSegmentClick={(status) => handleChartClick('pipeline', status)}
                />
              )}
            </div>
            )}
          </div>
          )}

          {/* Conversion Rate and Marketing Sources */}
          {(isWidgetVisible('conversion-rate') || isWidgetVisible('marketing-sources')) && (
          <div className="grid gap-6 md:grid-cols-2">
            {isWidgetVisible('conversion-rate') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Conversion Rate Analysis</h3>
              <p className="text-sm text-gray-600 mb-4">Application status breakdown and conversion metrics</p>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader size="md" text="Loading conversion data..." />
                </div>
              ) : (
                <div id="conversion-chart">
                  <ConversionRateChart data={pipelineData} />
                </div>
              )}
            </div>
            )}

            {isWidgetVisible('marketing-sources') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Marketing Sources</h3>
              <p className="text-sm text-gray-600 mb-4">Marketing channel performance</p>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader size="md" text="Loading marketing data..." />
                </div>
              ) : (
                <MarketingSourceWidget 
                  applications={applications}
                  onSourceClick={(source) => handleChartClick('marketing', source)}
                />
              )}
            </div>
            )}
          </div>
          )}
        </div>
      )}

      {view === 'strategic' && (
        <div className="grid gap-6 pb-8">
          {/* Stat Cards */}
          {isWidgetVisible('stat-cards') && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard 
              label="Target Enrolment" 
              value={loading ? '...' : strategicData.targetEnrolment} 
              icon="🎯" 
              tone="indigo" 
            />
            <StatCard 
              label="Progress" 
              value={loading ? '...' : strategicData.progress} 
              icon="📊" 
              tone="emerald" 
            />
            <StatCard 
              label="Scholarship Budget" 
              value={loading ? '...' : strategicData.scholarshipBudget} 
              icon="💰" 
              tone="slate" 
            />
            <StatCard 
              label="At Risk" 
              value={loading ? '...' : strategicData.atRiskText} 
              icon="⚠️" 
              tone="amber" 
            />
          </div>
          )}

          {/* KPI Progress Charts */}
          {isWidgetVisible('kpi-progress') && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Enrollment Progress</h3>
              <p className="text-sm text-gray-600 mb-4">Target vs actual enrollment</p>
              {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Loader size="md" text="Loading progress data..." />
                </div>
              ) : (
                <div className="p-4">
                  <KPIProgressChart
                    label="Enrollment Target"
                    current={strategicData.enrolled || 0}
                    target={strategicData.targetEnrolment || 0}
                    color="indigo"
                  />
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Program Health</h3>
              <p className="text-sm text-gray-600 mb-4">Programs at risk of low enrollment</p>
              {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Loader size="md" text="Loading risk data..." />
                </div>
              ) : (
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Programs at Risk</span>
                        <span className={`text-lg font-bold ${
                          strategicData.atRisk > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {strategicData.atRisk || 0}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Programs with less than 50% expected enrollment
                      </div>
                    </div>
                    {strategicData.atRisk > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-sm text-amber-800">
                          <strong>Action needed:</strong> {strategicData.atRisk} program{strategicData.atRisk !== 1 ? 's' : ''} may need additional marketing or support.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Charts Row */}
          {(isWidgetVisible('program-status') || isWidgetVisible('pipeline-chart')) && (
          <div className="grid gap-6 md:grid-cols-2">
            {isWidgetVisible('program-status') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Program Status Overview</h3>
              <p className="text-sm text-gray-600 mb-4">Program capacity and enrollment</p>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader size="md" text="Loading program data..." />
                </div>
              ) : (
                <ProgramStatusChart programs={programs} />
              )}
            </div>
            )}

            {isWidgetVisible('pipeline-chart') && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Application Pipeline</h3>
              <p className="text-sm text-gray-600 mb-4">Current application flow</p>
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader size="md" text="Loading pipeline data..." />
                </div>
              ) : (
                <PipelineChart data={pipelineData} />
              )}
            </div>
            )}
          </div>
          )}
        </div>
      )}

      {showCustomizer && (
        <DashboardCustomizer
          view={view}
          visibleWidgets={visibleWidgets || []}
          onWidgetToggle={(widgetId, visible) => {
            setVisibleWidgets(prev => {
              if (visible) {
                return prev && prev.includes(widgetId) 
                  ? prev 
                  : prev ? [...prev, widgetId] : [widgetId]
              } else {
                return prev ? prev.filter(id => id !== widgetId) : []
              }
            })
          }}
          onClose={() => {
            setShowCustomizer(false)
            if (typeof window !== 'undefined') {
              const key = `dashboard-widgets-${view}`
              if (visibleWidgets && visibleWidgets.length > 0) {
                localStorage.setItem(key, JSON.stringify(visibleWidgets))
              } else {
                localStorage.removeItem(key)
                setVisibleWidgets(null)
              }
            }
          }}
        />
      )}
    </>
  )
}
