import { supabase } from '@/lib/supabase'
import { getCachedSchoolId } from '@/utils/userCache'

// Helper to get current user's school_id
async function getUserSchoolId() {
  return await getCachedSchoolId()
}

/**
 * Get scholarship statistics for a program
 */
export async function getScholarshipStatistics(programId) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return {
        totalScholarships: 0,
        totalBudget: 0,
        awardedCount: 0,
        availableCount: 0,
      }
    }

    // TODO: Implement when scholarships table is available
    // For now, return default values
    return {
      totalScholarships: 0,
      totalBudget: 0,
      awardedCount: 0,
      availableCount: 0,
    }
  } catch (error) {
    console.error('Error fetching scholarship statistics:', error)
    return {
      totalScholarships: 0,
      totalBudget: 0,
      awardedCount: 0,
      availableCount: 0,
    }
  }
}

/**
 * List scholarships for a program
 */
export async function listScholarships(programId) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      return []
    }

    // TODO: Implement when scholarships table is available
    return []
  } catch (error) {
    console.error('Error listing scholarships:', error)
    return []
  }
}

/**
 * Create a new scholarship
 */
export async function createScholarship(programId, scholarshipData) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    // TODO: Implement when scholarships table is available
    throw new Error('Scholarship creation not yet implemented')
  } catch (error) {
    console.error('Error creating scholarship:', error)
    throw error
  }
}

/**
 * Update a scholarship
 */
export async function updateScholarship(scholarshipId, updates) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    // TODO: Implement when scholarships table is available
    throw new Error('Scholarship update not yet implemented')
  } catch (error) {
    console.error('Error updating scholarship:', error)
    throw error
  }
}

/**
 * Delete a scholarship
 */
export async function deleteScholarship(scholarshipId) {
  try {
    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    // TODO: Implement when scholarships table is available
    throw new Error('Scholarship deletion not yet implemented')
  } catch (error) {
    console.error('Error deleting scholarship:', error)
    throw error
  }
}

