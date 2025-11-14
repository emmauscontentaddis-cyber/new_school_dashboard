'use client'

import { useAuth } from '@/context/AuthContext'
import { useApplications } from '@/context/ApplicationsContext'
import { usePrograms } from '@/context/ProgramsContext'
import StatCard from '@/components/ui/StatCard'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  getPipelineData, 
  getAnalyticalData, 
  getStrategicData, 
  getTrendData 
} from '@/services/dashboard'

// Dynamically import chart components for better performance
const ApplicationStatusPieChart = dynamic(() => import('@/components/dashboard/charts/ApplicationStatusPieChart'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[300px]"><div className="text-sm text-gray-500">Loading chart...</div></div>
})

const ApplicationsByCourseChart = dynamic(() => import('@/components/dashboard/charts/ApplicationsByCourseChart'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[400px]"><div className="text-sm text-gray-500">Loading chart...</div></div>
})

const ApplicationTrendChart = dynamic(() => import('@/components/dashboard/charts/ApplicationTrendChart'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[400px]"><div className="text-sm text-gray-500">Loading chart...</div></div>
})

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

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { stats, fetchStats, fetchApplications, applications } = useApplications()
  const { programs, fetchPrograms } = usePrograms()
  
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
  const [dateRange, setDateRange] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(false)

  // Process data for charts
  const chartData = useMemo(() => {
    // Application status pie chart data
    const statusData = [
      { status: 'pending', count: stats.pending || 0 },
      { status: 'under_review', count: stats.under_review || 0 },
      { status: 'accepted', count: stats.accepted || 0 },
      { status: 'rejected', count: stats.rejected || 0 },
      { status: 'enrolled', count: stats.enrolled || 0 },
      { status: 'waitlisted', count: stats.waitlisted || 0 },
    ].filter(item => item.count > 0)

    // Applications by course/program
    const courseDataMap = new Map()
    
    if (applications && Array.isArray(applications) && applications.length > 0) {
      applications.forEach(app => {
        const courseId = app.course_id
        
        // Skip if no course_id
        if (!courseId) {
          console.log('Application missing course_id:', app.id, app)
          return
        }
        
        // Get course name from nested object or direct property
        let courseName = app.courses?.title || 
                        app.courses?.course_code || 
                        app.course_name
        
        // If still no name, try to find it in programs
        if (!courseName && programs && programs.length > 0) {
          const program = programs.find(p => p.id === courseId || p.course_id === courseId)
          courseName = program?.name || program?.title || program?.course_code
        }
        
        // Fallback to a generic name
        if (!courseName) {
          courseName = `Course ${String(courseId).substring(0, 8)}`
        }
        
        if (!courseDataMap.has(courseId)) {
          courseDataMap.set(courseId, {
            id: courseId,
            name: courseName.length > 30 ? courseName.substring(0, 30) + '...' : courseName,
            pending: 0,
            under_review: 0,
            accepted: 0,
            rejected: 0,
            enrolled: 0,
            waitlisted: 0,
          })
        }
        
        const courseData = courseDataMap.get(courseId)
        const status = app.status || 'pending'
        
        // Map status to the correct property
        if (status === 'pending') courseData.pending++
        else if (status === 'under_review') courseData.under_review++
        else if (status === 'accepted') courseData.accepted++
        else if (status === 'rejected') courseData.rejected++
        else if (status === 'enrolled') courseData.enrolled++
        else if (status === 'waitlisted') courseData.waitlisted++
      })
      
      // Debug logging
      if (courseDataMap.size === 0 && applications.length > 0) {
        console.log('No course data found. Applications:', applications.map(a => ({
          id: a.id,
          course_id: a.course_id,
          status: a.status,
          hasCourses: !!a.courses
        })))
      }
    }
    
    const courseData = Array.from(courseDataMap.values())
      .filter(course => {
        const total = course.pending + course.under_review + course.accepted + course.rejected + course.enrolled + course.waitlisted
        return total > 0
      })
      .sort((a, b) => {
        const totalA = a.pending + a.under_review + a.accepted + a.rejected + a.enrolled + a.waitlisted
        const totalB = b.pending + b.under_review + b.accepted + b.rejected + b.enrolled + b.waitlisted
        return totalB - totalA
      })
      .slice(0, 10) // Top 10 courses

    // Trend data (last 30 days)
    const trendMap = new Map()
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      trendMap.set(dateStr, {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        applications: 0,
        accepted: 0,
        enrolled: 0,
      })
    }

    applications.forEach(app => {
      if (app.created_at) {
        const dateStr = app.created_at.split('T')[0]
        if (trendMap.has(dateStr)) {
          const dayData = trendMap.get(dateStr)
          dayData.applications++
          if (app.status === 'accepted') dayData.accepted++
          if (app.status === 'enrolled') dayData.enrolled++
        }
      }
    })

    const trendDataArray = Array.from(trendMap.values())

    return {
      statusData,
      courseData,
      trendDataArray,
    }
  }, [stats, applications, programs])

  useEffect(() => {
    const loadInitial = async () => {
      try {
        await Promise.allSettled([
          fetchStats(),
          fetchPrograms(),
          fetchApplications({}) // Fetch all applications without filters
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }
    loadInitial()
  }, [fetchStats, fetchPrograms, fetchApplications])

  const loadDashboardData = useCallback(async () => {
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
  }, [dateRange, loading])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleStatCardClick = useCallback((status) => {
    router.push(`/applicants?status=${status}`)
  }, [router])

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 text-sm">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Here's what's happening with your school.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadDashboardData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md text-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 pb-8">
        {/* Stat Cards with Animation - Single Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Application Status Pie Chart */}
          <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Application Status</h3>
                <p className="text-sm text-gray-600 mt-1">Distribution of applications by status</p>
              </div>
            </div>
            {chartData.statusData.length > 0 ? (
              <ApplicationStatusPieChart data={chartData.statusData} />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No application data available
              </div>
            )}
          </div>

          {/* Applications by Course Chart */}
          <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Applications by Course</h3>
                <p className="text-sm text-gray-600 mt-1">Breakdown of applications per program</p>
              </div>
            </div>
             {chartData.courseData.length > 0 ? (
               <ApplicationsByCourseChart data={chartData.courseData} />
             ) : (
               <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                 <div className="text-sm mb-2">No course data available</div>
                 <div className="text-xs text-gray-400">
                   {applications.length > 0 
                     ? `${applications.length} applications found, but no course associations`
                     : 'No applications found'}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Trend Chart - Full Width */}
        <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.005] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Application Trends</h3>
              <p className="text-sm text-gray-600 mt-1">Applications, acceptances, and enrollments over the last 30 days</p>
            </div>
          </div>
          {chartData.trendDataArray.length > 0 ? (
            <ApplicationTrendChart data={chartData.trendDataArray} />
          ) : (
            <div className="flex items-center justify-center h-[400px] text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Pipeline Summary */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Pipeline</h3>
          {chartData.statusData.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {chartData.statusData.map((item, index) => (
                <div 
                  key={item.status} 
                  className="text-center p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => handleStatCardClick(item.status)}
                >
                  <div className="text-2xl font-bold text-gray-900 mb-1">{item.count || 0}</div>
                  <div className="text-sm text-gray-600 capitalize">{item.status.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No pipeline data available</div>
          )}
        </div>

        {/* Program Status */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Overview</h3>
          {programs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {programs.slice(0, 6).map((program) => (
                <div 
                  key={program.id} 
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/programs`)}
                >
                  <div className="font-medium text-gray-900">{program.name || program.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      program.open || program.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {program.open || program.status === 'active' ? 'Open' : 'Closed'}
                    </span>
                    <span className="ml-2">• {program.seats || 0} seats</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No programs available</div>
          )}
        </div>
      </div>
    </>
  )
}
