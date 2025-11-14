import { supabase } from '@/lib/supabase'
import { getCachedSchoolId } from '@/utils/userCache'

// Helper to get current user's school_id
async function getUserSchoolId() {
  return await getCachedSchoolId()
}

/**
 * Get program capacity and enrollment data
 */
export async function getProgramCapacity(programId) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return {
        totalSeats: 0,
        enrolled: 0,
        reserved: 0,
        available: 0,
        utilization: 0,
      }
    }

    const { data: program, error: programError } = await supabase
      .from('courses')
      .select('id, title, credits, scholarship')
      .eq('id', programId)
      .eq('school_id', schoolId)
      .single()

    if (programError) throw programError

    const totalSeats = Number(program.credits) || 0

    const { data: enrolledApps, error: enrolledError } = await supabase
      .from('applications')
      .select('id')
      .eq('school_id', schoolId)
      .eq('course_id', programId)
      .eq('status', 'enrolled')

    if (enrolledError) throw enrolledError

    const enrolled = enrolledApps?.length || 0

    const { data: acceptedApps, error: acceptedError } = await supabase
      .from('applications')
      .select('id')
      .eq('school_id', schoolId)
      .eq('course_id', programId)
      .eq('status', 'accepted')

    if (acceptedError) throw acceptedError

    const reserved = acceptedApps?.length || 0
    const available = Math.max(0, totalSeats - enrolled - reserved)
    const utilization = totalSeats > 0 ? (enrolled / totalSeats) * 100 : 0

    return {
      totalSeats,
      enrolled,
      reserved,
      available,
      utilization: Math.round(utilization),
    }
  } catch (error) {
    console.error('Error fetching program capacity:', error)
    return {
      totalSeats: 0,
      enrolled: 0,
      reserved: 0,
      available: 0,
      utilization: 0,
    }
  }
}

/**
 * Get program statistics (conversion metrics, demographics, marketing)
 */
export async function getProgramStatistics(programId) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return {
        totalApplications: 0,
        conversionRate: 0,
        byStatus: {},
        byMarketingSource: {},
        demographics: {},
      }
    }

    const { data: applications, error } = await supabase
      .from('applications')
      .select('id, status, marketing_source, additional_info, created_at')
      .eq('school_id', schoolId)
      .eq('course_id', programId)

    if (error) throw error

    const totalApplications = applications?.length || 0
    const accepted = applications?.filter(a => a.status === 'accepted').length || 0
    const conversionRate = totalApplications > 0 ? (accepted / totalApplications) * 100 : 0

    const byStatus = {}
    applications?.forEach(app => {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1
    })

    const byMarketingSource = {}
    applications?.forEach(app => {
      const source = app.marketing_source || 
                    app.additional_info?.marketing_source || 
                    'Unknown'
      byMarketingSource[source] = (byMarketingSource[source] || 0) + 1
    })

    const demographics = {
      ageGroups: {},
      genders: {},
      countries: {},
    }

    applications?.forEach(app => {
      const info = app.additional_info || {}
      if (info.age) {
        const ageGroup = info.age < 25 ? '18-24' : info.age < 35 ? '25-34' : info.age < 45 ? '35-44' : '45+'
        demographics.ageGroups[ageGroup] = (demographics.ageGroups[ageGroup] || 0) + 1
      }
      if (info.gender) {
        demographics.genders[info.gender] = (demographics.genders[info.gender] || 0) + 1
      }
      if (info.country) {
        demographics.countries[info.country] = (demographics.countries[info.country] || 0) + 1
      }
    })

    return {
      totalApplications,
      conversionRate: Math.round(conversionRate * 10) / 10,
      byStatus,
      byMarketingSource,
      demographics,
    }
  } catch (error) {
    console.error('Error fetching program statistics:', error)
    return {
      totalApplications: 0,
      conversionRate: 0,
      byStatus: {},
      byMarketingSource: {},
      demographics: {},
    }
  }
}

/**
 * Get all programs with capacity data
 */
export async function getProgramsWithCapacity() {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) return []

    const { data: programs, error } = await supabase
      .from('courses')
      .select('id, title, credits, application_deadline, status, scholarship')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const { data: enrolledApps, error: enrolledError } = await supabase
      .from('applications')
      .select('course_id')
      .eq('school_id', schoolId)
      .eq('status', 'enrolled')

    if (enrolledError) throw enrolledError

    const enrolledCounts = {}
    enrolledApps?.forEach(app => {
      if (app.course_id) {
        enrolledCounts[app.course_id] = (enrolledCounts[app.course_id] || 0) + 1
      }
    })

    const { data: acceptedApps, error: acceptedError } = await supabase
      .from('applications')
      .select('course_id')
      .eq('school_id', schoolId)
      .eq('status', 'accepted')

    if (acceptedError) throw acceptedError

    const reservedCounts = {}
    acceptedApps?.forEach(app => {
      if (app.course_id) {
        reservedCounts[app.course_id] = (reservedCounts[app.course_id] || 0) + 1
      }
    })

    return programs?.map(program => {
      const totalSeats = Number(program.credits) || 0
      const enrolled = enrolledCounts[program.id] || 0
      const reserved = reservedCounts[program.id] || 0
      const available = Math.max(0, totalSeats - enrolled - reserved)
      const utilization = totalSeats > 0 ? (enrolled / totalSeats) * 100 : 0

      return {
        ...program,
        capacity: {
          totalSeats,
          enrolled,
          reserved,
          available,
          utilization: Math.round(utilization),
        },
      }
    }) || []
  } catch (error) {
    console.error('Error fetching programs with capacity:', error)
    return []
  }
}

