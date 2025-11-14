'use client'

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import { createCourse, listCourses, updateCourse, deleteCourse } from '@/services/courses'

const initialState = {
  programs: [],
  loading: false,
  error: null,
}

const PROGRAMS_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_PROGRAMS: 'SET_PROGRAMS',
}

function programsReducer(state, action) {
  switch (action.type) {
    case PROGRAMS_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }
    
    case PROGRAMS_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload }
    
    case PROGRAMS_ACTIONS.SET_PROGRAMS:
      return { ...state, programs: action.payload }
    
    default:
      return state
  }
}

const ProgramsContext = createContext(null)

export function ProgramsProvider({ children }) {
  const [state, dispatch] = useReducer(programsReducer, initialState)

  const fetchPrograms = useCallback(async () => {
    dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: true })
    dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: null })
    
    try {
      const courses = await listCourses()
      const programs = courses.map((course) => ({
        id: course.id,
        name: course.title,
        modality: course.online ? 'Online' : course.hybrid ? 'Hybrid' : 'On-campus',
        fee: course.tuition || 0,
        seats: course.credits || 0,
        open: course.status === 'active',
        ...course,
      }))
      dispatch({ type: PROGRAMS_ACTIONS.SET_PROGRAMS, payload: programs })
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
    } catch (error) {
      console.error('Error fetching programs:', error)
      dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
    }
  }, [])

  const createProgram = useCallback(async (program) => {
    dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: true })
    dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: null })
    
    try {
      const courseData = {
        title: program.title || program.name,
        course_code: program.course_code || null,
        short_description: program.short_description || '',
        description: program.description || program.short_description || '',
        category: program.category || 'General',
        subcategory: program.subcategory || null,
        tags: Array.isArray(program.tags) ? program.tags : [],
        level: program.level || 'mixed',
        duration_weeks: program.duration_weeks || 0,
        duration_hours: program.duration_hours || 0,
        duration_full_time: program.duration_full_time || false,
        credits: program.credits || program.seats || 0,
        prerequisites: Array.isArray(program.prerequisites) ? program.prerequisites : [],
        provider_name: program.provider_name || '',
        provider_type: program.provider_type || 'other',
        provider_website: program.provider_website || null,
        provider_accreditation: Array.isArray(program.provider_accreditation) ? program.provider_accreditation : [],
        municipality: program.municipality || null,
        county: program.county || null,
        region: program.region || null,
        address: program.address || null,
        coordinates_lat: program.coordinates_lat || null,
        coordinates_lng: program.coordinates_lng || null,
        online: program.online || false,
        hybrid: program.hybrid || false,
        career_paths: Array.isArray(program.career_paths) ? program.career_paths : [],
        skills: Array.isArray(program.skills) ? program.skills : [],
        tuition: program.tuition || program.fee || 0,
        currency: program.currency || 'SEK',
        free: program.free || false,
        scholarship: program.scholarship || false,
        start_date: program.start_date || null,
        end_date: program.end_date || null,
        application_deadline: program.application_deadline || null,
        flexible: program.flexible || false,
        difficulty_score: program.difficulty_score || 5,
        status: program.status || 'active',
        requirements_text: program.requirements_text || null,
        full_requirements_link: program.full_requirements_link || null,
        course_structure_details: program.course_structure_details || null,
        contact_email: program.contact_email || null,
        contact_phone: program.contact_phone || null,
        contact_website: program.contact_website || null,
        contact_address: program.contact_address || null,
        pace_percentage: program.pace_percentage || 100,
        distance_learning: program.distance_learning || false,
        time_of_day: program.time_of_day || 'day',
        student_aid_available: program.student_aid_available || false,
        about_course_benefits: Array.isArray(program.about_course_benefits) ? program.about_course_benefits : [],
        learning_outcomes: Array.isArray(program.learning_outcomes) ? program.learning_outcomes : [],
        job_opportunities_description: program.job_opportunities_description || null,
        job_opportunities_callout: program.job_opportunities_callout || null,
        job_roles: Array.isArray(program.job_roles) ? program.job_roles : [],
        financing_free: program.financing_free || false,
        financing_student_aid: program.financing_student_aid || false,
        financing_transitional_support: program.financing_transitional_support || false,
      }

      const created = await createCourse(courseData)
      
      fetchPrograms().catch(err => {
        console.warn('Error refreshing programs list (non-critical):', err)
      })
      
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
      return created
    } catch (error) {
      console.error('Error creating program:', error)
      dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
      throw error
    }
  }, [fetchPrograms])

  const updateProgram = useCallback(async (id, updates) => {
    try {
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: true })
      dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: null })
      
      const updateData = {
        title: updates.title || updates.name,
        course_code: updates.course_code || null,
        short_description: updates.short_description || '',
        description: updates.description || updates.short_description || '',
        category: updates.category || 'General',
        subcategory: updates.subcategory || null,
        tags: Array.isArray(updates.tags) ? updates.tags : [],
        level: updates.level || 'mixed',
        duration_weeks: updates.duration_weeks || 0,
        duration_hours: updates.duration_hours || 0,
        duration_full_time: updates.duration_full_time || false,
        credits: updates.credits || updates.seats || 0,
        prerequisites: Array.isArray(updates.prerequisites) ? updates.prerequisites : [],
        provider_name: updates.provider_name || '',
        provider_type: updates.provider_type || 'other',
        provider_website: updates.provider_website || null,
        provider_accreditation: Array.isArray(updates.provider_accreditation) ? updates.provider_accreditation : [],
        municipality: updates.municipality || null,
        county: updates.county || null,
        region: updates.region || null,
        address: updates.address || null,
        coordinates_lat: updates.coordinates_lat || null,
        coordinates_lng: updates.coordinates_lng || null,
        online: updates.online || false,
        hybrid: updates.hybrid || false,
        career_paths: Array.isArray(updates.career_paths) ? updates.career_paths : [],
        skills: Array.isArray(updates.skills) ? updates.skills : [],
        tuition: updates.tuition || updates.fee || 0,
        currency: updates.currency || 'SEK',
        free: updates.free || false,
        scholarship: updates.scholarship || false,
        start_date: updates.start_date || null,
        end_date: updates.end_date || null,
        application_deadline: updates.application_deadline || null,
        flexible: updates.flexible || false,
        difficulty_score: updates.difficulty_score || 5,
        status: updates.status || 'active',
        requirements_text: updates.requirements_text || null,
        full_requirements_link: updates.full_requirements_link || null,
        course_structure_details: updates.course_structure_details || null,
        contact_email: updates.contact_email || null,
        contact_phone: updates.contact_phone || null,
        contact_website: updates.contact_website || null,
        contact_address: updates.contact_address || null,
        pace_percentage: updates.pace_percentage || 100,
        distance_learning: updates.distance_learning || false,
        time_of_day: updates.time_of_day || 'day',
        student_aid_available: updates.student_aid_available || false,
        about_course_benefits: Array.isArray(updates.about_course_benefits) ? updates.about_course_benefits : [],
        learning_outcomes: Array.isArray(updates.learning_outcomes) ? updates.learning_outcomes : [],
        job_opportunities_description: updates.job_opportunities_description || null,
        job_opportunities_callout: updates.job_opportunities_callout || null,
        job_roles: Array.isArray(updates.job_roles) ? updates.job_roles : [],
        financing_free: updates.financing_free || false,
        financing_student_aid: updates.financing_student_aid || false,
        financing_transitional_support: updates.financing_transitional_support || false,
      }

      await updateCourse(id, updateData)
      await fetchPrograms()
      
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
    } catch (error) {
      console.error('Error updating program:', error)
      dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
      throw error
    }
  }, [fetchPrograms])

  const deleteProgram = useCallback(async (id) => {
    try {
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: true })
      dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: null })
      
      await deleteCourse(id)
      await fetchPrograms()
      
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
    } catch (error) {
      console.error('Error deleting program:', error)
      dispatch({ type: PROGRAMS_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: PROGRAMS_ACTIONS.SET_LOADING, payload: false })
      throw error
    }
  }, [fetchPrograms])

  const value = useMemo(() => ({
    ...state,
    fetchPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
  }), [state, fetchPrograms, createProgram, updateProgram, deleteProgram])

  return (
    <ProgramsContext.Provider value={value}>
      {children}
    </ProgramsContext.Provider>
  )
}

export function usePrograms() {
  const context = useContext(ProgramsContext)
  if (!context) {
    throw new Error('usePrograms must be used within a ProgramsProvider')
  }
  return context
}

