import { supabase } from '@/lib/supabase'
import { getCachedSchoolId } from '@/utils/userCache'

async function getUserSchoolId() {
  return await getCachedSchoolId()
}

function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

/**
 * Get enrollment trends data
 */
export async function getEnrollmentTrends(dateRange = {}) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return { trends: [], yoy: 0, qoq: 0, mom: 0 }
    }

    // Get course IDs for this school
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', schoolId)

    const courseIds = courses?.map(c => c.id) || []
    if (courseIds.length === 0) {
      return { trends: [], yoy: 0, qoq: 0, mom: 0 }
    }

    let startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12) // Last 12 months
    let endDate = new Date()

    if (dateRange.startDate) {
      startDate = new Date(dateRange.startDate)
    }
    if (dateRange.endDate) {
      endDate = new Date(dateRange.endDate)
    }

    const { data: applications } = await withTimeout(
      supabase
        .from('applications')
        .select('created_at, status')
        .in('course_id', courseIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .limit(10000)
    )

    // Group by month
    const monthMap = new Map()
    applications?.forEach(app => {
      const date = new Date(app.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { applications: 0, enrolled: 0 })
      }
      const monthData = monthMap.get(monthKey)
      monthData.applications++
      if (app.status === 'enrolled') {
        monthData.enrolled++
      }
    })

    const trends = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        applications: data.applications,
        enrolled: data.enrolled,
        conversionRate: data.applications > 0 
          ? ((data.enrolled / data.applications) * 100).toFixed(1) 
          : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate YoY, QoQ, MoM
    const lastMonth = trends[trends.length - 1]
    const prevMonth = trends[trends.length - 2]
    const prevQuarter = trends[trends.length - 4]
    const prevYear = trends[trends.length - 13]

    const mom = prevMonth && lastMonth 
      ? (((lastMonth.enrolled - prevMonth.enrolled) / prevMonth.enrolled) * 100).toFixed(1)
      : 0
    const qoq = prevQuarter && lastMonth
      ? (((lastMonth.enrolled - prevQuarter.enrolled) / prevQuarter.enrolled) * 100).toFixed(1)
      : 0
    const yoy = prevYear && lastMonth
      ? (((lastMonth.enrolled - prevYear.enrolled) / prevYear.enrolled) * 100).toFixed(1)
      : 0

    return { trends, yoy: parseFloat(yoy), qoq: parseFloat(qoq), mom: parseFloat(mom) }
  } catch (error) {
    console.error('Error fetching enrollment trends:', error)
    return { trends: [], yoy: 0, qoq: 0, mom: 0 }
  }
}

/**
 * Get marketing source analysis
 */
export async function getMarketingSourceAnalysis(dateRange = {}) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return { sources: [], total: 0, conversionBySource: {} }
    }

    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', schoolId)

    const courseIds = courses?.map(c => c.id) || []
    if (courseIds.length === 0) {
      return { sources: [], total: 0, conversionBySource: {} }
    }

    let startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    let endDate = new Date()

    if (dateRange.startDate) {
      startDate = new Date(dateRange.startDate)
    }
    if (dateRange.endDate) {
      endDate = new Date(dateRange.endDate)
    }

    const { data: applications } = await withTimeout(
      supabase
        .from('applications')
        .select('marketing_source, status')
        .in('course_id', courseIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .limit(10000)
    )

    const sourceMap = new Map()
    let total = 0

    applications?.forEach(app => {
      const source = app.marketing_source || 'Unknown'
      total++
      
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { total: 0, accepted: 0, enrolled: 0 })
      }
      const sourceData = sourceMap.get(source)
      sourceData.total++
      if (app.status === 'accepted') sourceData.accepted++
      if (app.status === 'enrolled') sourceData.enrolled++
    })

    const sources = Array.from(sourceMap.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      accepted: data.accepted,
      enrolled: data.enrolled,
      conversionRate: data.total > 0 
        ? ((data.accepted / data.total) * 100).toFixed(1) 
        : 0,
      enrollmentRate: data.total > 0
        ? ((data.enrolled / data.total) * 100).toFixed(1)
        : 0
    }))

    return { sources, total, conversionBySource: {} }
  } catch (error) {
    console.error('Error fetching marketing source analysis:', error)
    return { sources: [], total: 0, conversionBySource: {} }
  }
}

/**
 * Get pipeline efficiency data
 */
export async function getPipelineEfficiency(dateRange = {}) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return { stages: [], avgTimeByStage: {}, dropoffRates: {}, totalTime: 0 }
    }

    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', schoolId)

    const courseIds = courses?.map(c => c.id) || []
    if (courseIds.length === 0) {
      return { stages: [], avgTimeByStage: {}, dropoffRates: {}, totalTime: 0 }
    }

    const { data: applications } = await withTimeout(
      supabase
        .from('applications')
        .select('status, created_at, reviewed_at')
        .in('course_id', courseIds)
        .limit(10000)
    )

    const statusCounts = {}
    applications?.forEach(app => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
    })

    const stages = [
      { name: 'Pending', count: statusCounts.pending || 0 },
      { name: 'Under Review', count: statusCounts.under_review || 0 },
      { name: 'Accepted', count: statusCounts.accepted || 0 },
      { name: 'Enrolled', count: statusCounts.enrolled || 0 },
      { name: 'Rejected', count: statusCounts.rejected || 0 },
    ].map(stage => ({
      ...stage,
      percentage: applications?.length > 0
        ? ((stage.count / applications.length) * 100).toFixed(1)
        : 0
    }))

    // Calculate average times
    const reviewedApps = applications?.filter(a => a.reviewed_at) || []
    let avgReviewTime = 0
    if (reviewedApps.length > 0) {
      const totalTime = reviewedApps.reduce((sum, app) => {
        const created = new Date(app.created_at)
        const reviewed = new Date(app.reviewed_at)
        return sum + (reviewed - created) / (1000 * 60 * 60 * 24)
      }, 0)
      avgReviewTime = Math.round(totalTime / reviewedApps.length)
    }

    return {
      stages,
      avgTimeByStage: {
        'pending_to_review': avgReviewTime,
        'review_to_decision': 2,
        'decision_to_enrollment': 5
      },
      dropoffRates: {},
      totalTime: 0
    }
  } catch (error) {
    console.error('Error fetching pipeline efficiency:', error)
    return { stages: [], avgTimeByStage: {}, dropoffRates: {}, totalTime: 0 }
  }
}

/**
 * Get demographics report
 */
export async function getDemographicsReport(dateRange = {}) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return { ageGroups: {}, genders: {}, countries: {}, education: {} }
    }

    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', schoolId)

    const courseIds = courses?.map(c => c.id) || []
    if (courseIds.length === 0) {
      return { ageGroups: {}, genders: {}, countries: {}, education: {} }
    }

    const { data: applications } = await withTimeout(
      supabase
        .from('applications')
        .select('date_of_birth, gender, country, education_level')
        .in('course_id', courseIds)
        .limit(10000)
    )

    const ageGroups = {}
    const genders = {}
    const countries = {}
    const education = {}

    applications?.forEach(app => {
      // Age groups
      if (app.date_of_birth) {
        const age = new Date().getFullYear() - new Date(app.date_of_birth).getFullYear()
        let ageGroup = 'Unknown'
        if (age < 18) ageGroup = 'Under 18'
        else if (age < 25) ageGroup = '18-24'
        else if (age < 35) ageGroup = '25-34'
        else if (age < 45) ageGroup = '35-44'
        else if (age < 55) ageGroup = '45-54'
        else ageGroup = '55+'
        ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1
      }

      // Gender
      const gender = app.gender || 'Unknown'
      genders[gender] = (genders[gender] || 0) + 1

      // Country
      const country = app.country || 'Unknown'
      countries[country] = (countries[country] || 0) + 1

      // Education
      const edu = app.education_level || 'Unknown'
      education[edu] = (education[edu] || 0) + 1
    })

    return { ageGroups, genders, countries, education }
  } catch (error) {
    console.error('Error fetching demographics report:', error)
    return { ageGroups: {}, genders: {}, countries: {}, education: {} }
  }
}

/**
 * Get conversion rate analysis
 */
export async function getConversionRateAnalysis(dateRange = {}) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return { overall: 0, byProgram: [], bySource: [], byMonth: [] }
    }

    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .eq('school_id', schoolId)

    const courseIds = courses?.map(c => c.id) || []
    if (courseIds.length === 0) {
      return { overall: 0, byProgram: [], bySource: [], byMonth: [] }
    }

    const { data: applications } = await withTimeout(
      supabase
        .from('applications')
        .select('course_id, status, marketing_source, created_at, courses(title)')
        .in('course_id', courseIds)
        .limit(10000)
    )

    // Overall conversion
    const total = applications?.length || 0
    const accepted = applications?.filter(a => a.status === 'accepted').length || 0
    const overall = total > 0 ? ((accepted / total) * 100).toFixed(1) : 0

    // By program
    const programMap = new Map()
    applications?.forEach(app => {
      const courseId = app.course_id
      const courseName = app.courses?.title || `Course ${courseId}`
      if (!programMap.has(courseId)) {
        programMap.set(courseId, { name: courseName, total: 0, accepted: 0 })
      }
      const programData = programMap.get(courseId)
      programData.total++
      if (app.status === 'accepted') programData.accepted++
    })

    const byProgram = Array.from(programMap.values()).map(p => ({
      name: p.name,
      total: p.total,
      accepted: p.accepted,
      rate: p.total > 0 ? ((p.accepted / p.total) * 100).toFixed(1) : 0
    }))

    // By source
    const sourceMap = new Map()
    applications?.forEach(app => {
      const source = app.marketing_source || 'Unknown'
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { name: source, total: 0, accepted: 0 })
      }
      const sourceData = sourceMap.get(source)
      sourceData.total++
      if (app.status === 'accepted') sourceData.accepted++
    })

    const bySource = Array.from(sourceMap.values()).map(s => ({
      name: s.name,
      total: s.total,
      accepted: s.accepted,
      rate: s.total > 0 ? ((s.accepted / s.total) * 100).toFixed(1) : 0
    }))

    // By month
    const monthMap = new Map()
    applications?.forEach(app => {
      const date = new Date(app.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthKey, total: 0, accepted: 0 })
      }
      const monthData = monthMap.get(monthKey)
      monthData.total++
      if (app.status === 'accepted') monthData.accepted++
    })

    const byMonth = Array.from(monthMap.values())
      .map(m => ({
        month: m.month,
        total: m.total,
        accepted: m.accepted,
        rate: m.total > 0 ? ((m.accepted / m.total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return { overall: parseFloat(overall), byProgram, bySource, byMonth }
  } catch (error) {
    console.error('Error fetching conversion rate analysis:', error)
    return { overall: 0, byProgram: [], bySource: [], byMonth: [] }
  }
}

