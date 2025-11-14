'use client'

import React from 'react'
import { useAuth } from './AuthContext'

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

export default function AuthLoadingWrapper({ children }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner size="lg" text="Loading authentication..." />
      </div>
    )
  }

  return <>{children}</>
}

