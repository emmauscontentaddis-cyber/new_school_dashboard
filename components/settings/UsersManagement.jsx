'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function UsersManagement() {
  const { schoolId } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const fetchMembers = useCallback(async () => {
    if (!schoolId) {
      setMembers([])
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, role')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      console.error('Failed to load team members:', err)
      setError(err.message || 'Unable to load team members right now.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const filteredMembers = useMemo(() => {
    if (!filter) return members
    const query = filter.toLowerCase()
    return members.filter(member => {
      return (
        member.full_name?.toLowerCase().includes(query) ||
        member.role?.toLowerCase().includes(query) ||
        member.user_id?.toLowerCase().includes(query)
      )
    })
  }, [filter, members])

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Team Members</h2>
          <p className="text-sm text-gray-600">Manage who has access to your dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Search members..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-64"
          />
          <Button type="button" onClick={fetchMembers} disabled={loading || !schoolId}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {!schoolId && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Add your school information first to invite team members.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Member
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Role
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                User ID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                  {loading ? 'Loading team members...' : 'No team members found yet.'}
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {member.full_name || 'Unnamed member'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {member.role || 'member'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <code className="text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      {member.user_id}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

