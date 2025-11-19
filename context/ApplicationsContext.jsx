'use client'

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import { listApplications, getApplication, updateApplicationStatus, getApplicationStats } from '@/services/applications'

const initialState = {
  applications: [],
  selectedApplication: null,
  stats: {
    total: 0,
    pending: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
    waitlisted: 0,
    enrolled: 0,
    withdrawn: 0,
  },
  loading: false,
  error: null,
}

const APPLICATIONS_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_APPLICATIONS: 'SET_APPLICATIONS',
  SET_SELECTED_APPLICATION: 'SET_SELECTED_APPLICATION',
  UPDATE_APPLICATION: 'UPDATE_APPLICATION',
  SET_STATS: 'SET_STATS',
  CLEAR_SELECTED: 'CLEAR_SELECTED',
}

function applicationsReducer(state, action) {
  switch (action.type) {
    case APPLICATIONS_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }
    
    case APPLICATIONS_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload }
    
    case APPLICATIONS_ACTIONS.SET_APPLICATIONS:
      return { ...state, applications: action.payload }
    
    case APPLICATIONS_ACTIONS.SET_SELECTED_APPLICATION:
      return { ...state, selectedApplication: action.payload }
    
    case APPLICATIONS_ACTIONS.UPDATE_APPLICATION:
      return {
        ...state,
        applications: state.applications.map(app => 
          app.id === action.payload.id ? { ...app, ...action.payload.updates } : app
        ),
        selectedApplication: state.selectedApplication?.id === action.payload.id
          ? { ...state.selectedApplication, ...action.payload.updates }
          : state.selectedApplication,
      }
    
    case APPLICATIONS_ACTIONS.SET_STATS:
      return { ...state, stats: action.payload }
    
    case APPLICATIONS_ACTIONS.CLEAR_SELECTED:
      return { ...state, selectedApplication: null }
    
    default:
      return state
  }
}

const ApplicationsContext = createContext(null)

export function ApplicationsProvider({ children }) {
  const [state, dispatch] = useReducer(applicationsReducer, initialState)

  const fetchApplications = useCallback(async (filters = {}) => {
    dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: true })
    dispatch({ type: APPLICATIONS_ACTIONS.SET_ERROR, payload: null })
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout. Please try again.')), 30000)
      )
      
      const applications = await Promise.race([
        listApplications(filters),
        timeoutPromise
      ])
      
      dispatch({ type: APPLICATIONS_ACTIONS.SET_APPLICATIONS, payload: applications || [] })
      dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: false })
    } catch (error) {
      console.error('Error fetching applications:', error)
      dispatch({ type: APPLICATIONS_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: APPLICATIONS_ACTIONS.SET_APPLICATIONS, payload: [] })
      dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: false })
    }
  }, [])

  const fetchApplication = useCallback(async (id) => {
    dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: true })
    dispatch({ type: APPLICATIONS_ACTIONS.SET_ERROR, payload: null })
    
    try {
      const application = await getApplication(id)
      dispatch({ type: APPLICATIONS_ACTIONS.SET_SELECTED_APPLICATION, payload: application })
      dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: false })
      return application
    } catch (error) {
      console.error('Error fetching application:', error)
      dispatch({ type: APPLICATIONS_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: false })
      throw error
    }
  }, [])

  const updateApplication = useCallback(async (id, updates) => {
    try {
      dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: true })
      dispatch({ type: APPLICATIONS_ACTIONS.SET_ERROR, payload: null })
      
      const updated = await updateApplicationStatus(id, updates)
      
      dispatch({
        type: APPLICATIONS_ACTIONS.UPDATE_APPLICATION,
        payload: { id, updates: updated },
      })
      
      dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: false })
      
      await fetchStats()
      
      return updated
    } catch (error) {
      console.error('Error updating application:', error)
      dispatch({ type: APPLICATIONS_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: APPLICATIONS_ACTIONS.SET_LOADING, payload: false })
      throw error
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const stats = await getApplicationStats()
      dispatch({ type: APPLICATIONS_ACTIONS.SET_STATS, payload: stats })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  const clearSelected = useCallback(() => {
    dispatch({ type: APPLICATIONS_ACTIONS.CLEAR_SELECTED })
  }, [])

  const value = useMemo(() => ({
    ...state,
    fetchApplications,
    fetchApplication,
    updateApplication,
    fetchStats,
    clearSelected,
  }), [state, fetchApplications, fetchApplication, updateApplication, fetchStats, clearSelected])

  return (
    <ApplicationsContext.Provider value={value}>
      {children}
    </ApplicationsContext.Provider>
  )
}

export function useApplications() {
  const context = useContext(ApplicationsContext)
  if (!context) {
    throw new Error('useApplications must be used within an ApplicationsProvider')
  }
  return context
}

