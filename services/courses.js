import { supabase } from '@/lib/supabase'
import { getCachedSchoolId } from '@/utils/userCache'

// Helper to get current user's school_id - uses cache
async function getUserSchoolId() {
  return await getCachedSchoolId()
}

export async function createCourse(course) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in again.')
    }

    const schoolId = await getUserSchoolId()
    if (!schoolId) {
      throw new Error('User must be associated with a school')
    }

    const courseData = { ...course, school_id: schoolId }
    
    Object.keys(courseData).forEach(key => {
      if (courseData[key] === undefined) {
        delete courseData[key]
      }
    })
    
    if (!schoolId || typeof schoolId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)) {
      throw new Error(`Invalid school_id format: ${schoolId}`)
    }

    const TIMEOUT_MS = 120000
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, TIMEOUT_MS)
    })

    const insertPromise = supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single()
    
    let data, error
    try {
      const result = await Promise.race([insertPromise, timeoutPromise])
      if (timeoutId) clearTimeout(timeoutId)
      data = result.data
      error = result.error
    } catch (raceError) {
      if (timeoutId) clearTimeout(timeoutId)
      if (raceError.message === 'Request timeout') {
        throw new Error(`INSERT operation timed out after ${Math.round(TIMEOUT_MS/1000)}s.`)
      }
      throw raceError
    }

    if (error) {
      if (error.message && error.message.includes('school_id does not exist')) {
        throw new Error('Database schema missing school_id column. Please run the migration script.')
      }
      
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error(`RLS Policy Error: ${error.message}`)
      }
      
      if (error.code === '23505') {
        throw new Error('A course with this information already exists.')
      }
      
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error creating course:', error)
    throw error
  }
}

export async function listCourses() {
  try {
    const schoolId = await getUserSchoolId()
    
    if (!schoolId) {
      return []
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.message && error.message.includes('school_id does not exist')) {
        throw new Error('Database schema missing school_id column.')
      }
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error listing courses:', error)
    throw error
  }
}

export async function updateCourse(id, updates) {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('courses')
      .select('id, school_id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw new Error('Course not found or you do not have permission to update it')
    }

    const schoolId = await getUserSchoolId()
    
    if (existing.school_id && existing.school_id !== schoolId) {
      throw new Error('You do not have permission to update this course')
    }

    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating course:', error)
    throw error
  }
}

export async function deleteCourse(id) {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('courses')
      .select('id, school_id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      throw new Error('Course not found or you do not have permission to delete it')
    }

    const schoolId = await getUserSchoolId()
    
    if (existing.school_id && existing.school_id !== schoolId) {
      throw new Error('You do not have permission to delete this course')
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting course:', error)
    throw error
  }
}

