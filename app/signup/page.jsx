'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signup, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password || !name) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    const result = await signup({
      email,
      password,
      name,
      school: schoolName ? { name: schoolName } : null,
    })
    setLoading(false)

    if (result.success) {
      if (result.needsConfirmation) {
        setError('Please check your email to confirm your account')
      } else {
        router.push('/dashboard')
      }
    } else {
      setError(result.error || 'Failed to create account')
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
            <h2 className="text-3xl font-bold mb-2">Create account</h2>
            <p className="text-slate-300 text-sm">Get started with Taleema Dashboard</p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {error && (
              <div className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                error.includes('check your email') 
                  ? 'bg-blue-50 border border-blue-200 text-blue-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="name">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full"
                />
              </div>

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
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="schoolName">
                  School Name (Optional)
                </label>
                <Input
                  id="schoolName"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="My School"
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-slate-900 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

