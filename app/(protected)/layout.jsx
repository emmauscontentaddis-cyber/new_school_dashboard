'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'

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

export default function ProtectedLayout({ children }) {
  const { isAuthenticated, schoolId, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push(`/login?from=${pathname}`)
        return
      }

      if (!schoolId && pathname !== '/school-setup') {
        router.push('/school-setup')
        return
      }

      if (schoolId && pathname === '/school-setup') {
        router.push('/dashboard')
        return
      }
    }
  }, [loading, isAuthenticated, schoolId, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner size="lg" text="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <AppLayout>{children}</AppLayout>
}

