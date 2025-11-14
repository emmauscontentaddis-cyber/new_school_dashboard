'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthenticated, loading: authLoading, schoolId } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (!schoolId) {
        router.push('/school-setup')
      } else {
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, authLoading, schoolId, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please enter both email and password')
      setLoading(false)
      return
    }

    const result = await login({ email, password })
    setLoading(false)

    if (result.success) {
      // Navigation handled by useEffect
    } else {
      setError(result.error || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md">
        <form 
          onSubmit={handleSubmit} 
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-8 text-white">
            <h2 className="text-3xl font-bold mb-2">Sign in</h2>
            <p className="text-slate-300 text-sm">Welcome back to Taleema Dashboard</p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-900'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link href="/signup" className="text-slate-900 font-semibold hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

