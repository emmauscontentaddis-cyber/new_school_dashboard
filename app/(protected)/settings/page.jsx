'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import UsersManagement from '@/components/settings/UsersManagement'
import { updateSchool } from '@/services/schools'

export default function SettingsPage() {
  const { school, schoolId, user, loadUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [notifications, setNotifications] = useState({
    newApplications: true,
    courseUpdates: true,
    weeklyReports: false,
  })

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || '',
        email: school.email || '',
        phone: school.phone || '',
      })
    }
  }, [school])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!schoolId) {
        throw new Error('No school found. Please create a school first.')
      }

      const updates = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
      }

      await updateSchool(schoolId, updates)

      if (user?.id && loadUserProfile) {
        await loadUserProfile(user.id)
      }

      setSuccess('School profile updated successfully!')
    } catch (error) {
      console.error('Error updating school:', error)
      setError(error.message || 'Failed to update school profile')
    } finally {
      setLoading(false)
    }
  }

  if (!school) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-gray-600">
          No school found. Please create a school first.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your school dashboard preferences</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">School Information</h2>
          <p className="text-sm text-gray-600 mb-6">Update your school's basic information</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                {success}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="name">
                  School Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Springfield Academy"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                  Contact Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="admin@school.com"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="phone">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Notifications</h2>
          <p className="text-sm text-gray-600 mb-6">Configure how you receive notifications</p>

          <div className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">New Applications</div>
                <div className="text-sm text-gray-600">Receive emails for new student applications</div>
              </div>
              <Switch
                checked={notifications.newApplications}
                onChange={(checked) => setNotifications(prev => ({ ...prev, newApplications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">Course Updates</div>
                <div className="text-sm text-gray-600">Get notified about course changes</div>
              </div>
              <Switch
                checked={notifications.courseUpdates}
                onChange={(checked) => setNotifications(prev => ({ ...prev, courseUpdates: checked }))}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">Weekly Reports</div>
                <div className="text-sm text-gray-600">Receive weekly summary reports</div>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onChange={(checked) => setNotifications(prev => ({ ...prev, weeklyReports: checked }))}
              />
            </div>
          </div>
        </div>

        <UsersManagement />
      </div>
    </div>
  )
}
