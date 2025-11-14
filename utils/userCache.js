import { supabase } from '@/lib/supabase'

// Simple in-memory cache with TTL (Time To Live)
const cache = {
  user: null,
  schoolId: null,
  school: null,
  profile: null,
  timestamp: null,
  ttl: 60000, // 1 minute cache
}

/**
 * Get cached user or fetch from Supabase
 * Caches for 1 minute to reduce redundant API calls
 */
export async function getCachedUser() {
  const now = Date.now()
  
  // Return cached user if still valid
  if (cache.user && cache.timestamp && (now - cache.timestamp) < cache.ttl) {
    return cache.user
  }

  // Fetch fresh user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    cache.user = user
    cache.timestamp = now
  }
  
  return user
}

/**
 * Get cached school_id or fetch from database
 * Caches for 1 minute to reduce redundant queries
 */
export async function getCachedSchoolId() {
  const now = Date.now()
  
  // Return cached schoolId if still valid
  if (cache.schoolId !== null && cache.timestamp && (now - cache.timestamp) < cache.ttl) {
    return cache.schoolId
  }

  // Fetch fresh data
  const user = await getCachedUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const schoolId = profile?.school_id || null
  
  // Update cache
  cache.schoolId = schoolId
  cache.profile = profile
  cache.timestamp = now
  
  return schoolId
}

/**
 * Get cached user profile with school info
 * Caches for 1 minute
 */
export async function getCachedProfile() {
  const now = Date.now()
  
  // Return cached profile if still valid
  if (cache.profile && cache.timestamp && (now - cache.timestamp) < cache.ttl) {
    return cache.profile
  }

  // Fetch fresh profile
  const user = await getCachedUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('school_id, schools (*)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile) {
    cache.profile = profile
    cache.schoolId = profile.school_id
    cache.school = profile.schools
    cache.timestamp = now
  }
  
  return profile
}

/**
 * Clear the cache (useful after login/logout or profile updates)
 */
export function clearUserCache() {
  cache.user = null
  cache.schoolId = null
  cache.school = null
  cache.profile = null
  cache.timestamp = null
}

/**
 * Get current user ID (cached)
 */
export async function getCachedUserId() {
  const user = await getCachedUser()
  return user?.id || null
}

