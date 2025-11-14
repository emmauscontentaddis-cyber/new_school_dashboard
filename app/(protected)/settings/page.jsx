'use client'

import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useState } from 'react'

export default function SettingsPage() {
  const { user, school } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setMessage('')
    
    // Settings save functionality will be implemented
    setTimeout(() => {
      setLoading(false)
      setMessage('Settings saved successfully!')
    }, 1000)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 text-sm">Manage your account and school settings</p>
      </div>

      <div className="grid gap-6">
        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <Input
                type="text"
                value={user?.id || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* School Settings */}
        {school && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">School Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                <Input
                  type="text"
                  value={school.name || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              {school.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">School Email</label>
                  <Input
                    type="email"
                    value={school.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="space-y-3">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('success') 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
