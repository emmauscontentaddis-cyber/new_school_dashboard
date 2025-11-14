'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { clearUserCache } from '@/utils/userCache'

// Initial state
const initialState = {
  user: null,
  session: null,
  role: null,
  schoolId: null,
  school: null,
  isAuthenticated: false,
  loading: true,
}

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_SESSION: 'SET_SESSION',
  SET_ROLE: 'SET_ROLE',
  SET_SCHOOL: 'SET_SCHOOL',
  SET_SCHOOL_ID: 'SET_SCHOOL_ID',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  RESET_AUTH: 'RESET_AUTH',
  UPDATE_AUTH: 'UPDATE_AUTH',
}

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }
    
    case AUTH_ACTIONS.UPDATE_AUTH:
      return { ...state, ...action.payload }
    
    case AUTH_ACTIONS.RESET_AUTH:
      return {
        ...initialState,
        loading: false,
      }
    
    default:
      return state
  }
}

// Create context
const AuthContext = createContext(null)

// Provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Load user profile
  const loadUserProfile = useCallback(async (userId) => {
    try {
      clearUserCache()
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          schools (*)
        `)
        .eq('user_id', userId)
        .maybeSingle()

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
        return
      }

      if (profileError) {
        console.error('Error loading user profile:', profileError)
        dispatch({
          type: AUTH_ACTIONS.UPDATE_AUTH,
          payload: {
            user: session.user,
            session,
            isAuthenticated: true,
            role: 'owner',
            schoolId: null,
            school: null,
            loading: false,
          },
        })
        return
      }

      if (profile) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_AUTH,
          payload: {
            user: session.user,
            session,
            isAuthenticated: true,
            role: profile.role || 'owner',
            schoolId: profile.school_id,
            school: profile.schools || null,
            loading: false,
          },
        })
      } else {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_AUTH,
          payload: {
            user: session.user,
            session,
            isAuthenticated: true,
            role: 'owner',
            schoolId: null,
            school: null,
            loading: false,
          },
        })
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_AUTH,
          payload: {
            user: session.user,
            session,
            isAuthenticated: true,
            role: 'owner',
            schoolId: null,
            school: null,
            loading: false,
          },
        })
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      }
    }
  }, [])

  // Initialize auth
  const initialize = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

      if (session) {
        await loadUserProfile(session.user.id)
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          await loadUserProfile(session.user.id)
        } else {
          dispatch({ type: AUTH_ACTIONS.RESET_AUTH })
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
    }
  }, [loadUserProfile])

  // Signup
  const signup = useCallback(async ({ email, password, name, school }) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true })
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            role: 'owner',
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
        return { success: false, error: 'Failed to create account' }
      }

      let schoolId = null
      if (authData.session) {
        try {
          const profileData = {
            user_id: authData.user.id,
            role: 'owner',
            full_name: name || null,
          }

          if (school && school.name) {
            const slug = school.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
            
            const { data: schoolData, error: schoolError } = await supabase
              .from('schools')
              .insert([{
                name: school.name,
                slug: slug,
                email: school.email || null,
                phone: school.phone || null,
                address: school.address || null,
                status: 'active',
              }])
              .select()
              .single()

            if (schoolError) {
              console.error('Error creating school:', schoolError)
            } else {
              schoolId = schoolData.id
              profileData.school_id = schoolId
            }
          }

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([profileData])

          if (profileError) {
            console.error('Error creating user profile:', profileError)
          }
        } catch (setupError) {
          console.error('Error during profile setup:', setupError)
        }
      }

      if (authData.session) {
        await loadUserProfile(authData.user.id)
      }

      return { 
        success: true, 
        user: authData.user, 
        needsConfirmation: !authData.session 
      }
    } catch (error) {
      console.error('Error signing up:', error)
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      return { success: false, error: error.message }
    }
  }, [loadUserProfile])

  // Login
  const login = useCallback(async ({ email, password }) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true })
      
      if (!supabase) {
        throw new Error('Supabase client not initialized.')
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        console.error('Supabase login error:', error)
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before logging in.')
        } else {
          throw error
        }
      }

      if (data.user && data.session) {
        await loadUserProfile(data.user.id)
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
        return { success: true }
      }

      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      return { success: false, error: 'Login failed' }
    } catch (error) {
      console.error('Error logging in:', error)
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      return { success: false, error: error.message || 'An unexpected error occurred' }
    }
  }, [loadUserProfile])

  // Logout
  const logout = useCallback(async () => {
    try {
      clearUserCache()
      dispatch({ type: AUTH_ACTIONS.RESET_AUTH })
      supabase.auth.signOut().catch((error) => {
        console.error('Error signing out from Supabase:', error)
      })
    } catch (error) {
      console.error('Error logging out:', error)
      dispatch({ type: AUTH_ACTIONS.RESET_AUTH })
    }
  }, [])

  // Reset password
  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '',
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error resetting password:', error)
      return { success: false, error: error.message }
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initialize()
    }
  }, [initialize])

  // Memoized context value
  const value = useMemo(() => ({
    ...state,
    initialize,
    loadUserProfile,
    signup,
    login,
    logout,
    resetPassword,
  }), [state, initialize, loadUserProfile, signup, login, logout, resetPassword])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

