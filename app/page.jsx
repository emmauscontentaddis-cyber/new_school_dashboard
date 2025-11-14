'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, loading, schoolId } = useAuth()

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      return
    }

    // Redirect based on auth state
    if (isAuthenticated) {
      if (schoolId) {
        router.replace('/dashboard')
      } else {
        router.replace('/school-setup')
      }
    } else {
      router.replace('/login')
    }
  }, [isAuthenticated, loading, schoolId, router])

  // Show loading state while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
        <div className="text-gray-600">Loading...</div>
      </div>
    </div>
  )
}

