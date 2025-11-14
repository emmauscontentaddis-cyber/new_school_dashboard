'use client'

import StatCard from '@/components/ui/StatCard'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { usePrograms } from '@/context/ProgramsContext'
import ProgramForm from '@/components/programs/ProgramForm'
import { useMemo, useState, useEffect } from 'react'

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

export default function ProgramsPage() {
  const { programs, loading, error, fetchPrograms, deleteProgram } = usePrograms()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  const stats = useMemo(() => ({
    total: programs.length,
    open: programs.filter((p) => p.open || p.status === 'active').length,
    closed: programs.filter((p) => !p.open && p.status !== 'active').length,
    totalSeats: programs.reduce((sum, p) => sum + (p.seats || p.credits || 0), 0),
  }), [programs])

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          p.name?.toLowerCase().includes(query) ||
          p.title?.toLowerCase().includes(query) ||
          p.course_code?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      if (statusFilter === 'open' && !p.open && p.status !== 'active') return false
      if (statusFilter === 'closed' && (p.open || p.status === 'active')) return false

      return true
    })
  }, [programs, searchQuery, statusFilter])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this program?')) return
    
    setDeletingId(id)
    try {
      await deleteProgram(id)
    } catch (error) {
      console.error('Error deleting program:', error)
      alert('Failed to delete program')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Programs</h1>
            <p className="text-gray-600 text-sm">Manage your courses and programs</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            + New Program
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Total Programs" value={stats.total} icon="📚" tone="blue" />
        <StatCard label="Open Programs" value={stats.open} icon="✅" tone="emerald" />
        <StatCard label="Closed Programs" value={stats.closed} icon="🔒" tone="red" />
        <StatCard label="Total Seats" value={stats.totalSeats} icon="🪑" tone="indigo" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <Input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Programs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" text="Loading programs..." />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-200 text-center">
          <div className="text-gray-500 mb-4">No programs found</div>
          <Button onClick={() => setShowForm(true)}>
            Create Your First Program
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => (
            <div key={program.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {program.name || program.title}
                  </h3>
                  {program.course_code && (
                    <div className="text-sm text-gray-500">{program.course_code}</div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  program.open || program.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {program.open || program.status === 'active' ? 'Open' : 'Closed'}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                {program.short_description && (
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {program.short_description}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Seats: {program.seats || program.credits || 0}</span>
                  {program.modality && <span>{program.modality}</span>}
                </div>
                {program.category && (
                  <div className="text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {program.category}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => alert('Edit form will be implemented')}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(program.id)}
                  disabled={deletingId === program.id}
                  className="flex-1"
                >
                  {deletingId === program.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Form Modal */}
      {showForm && (
        <ProgramForm
          onClose={() => setShowForm(false)}
          onSuccess={(newProgram) => {
            setShowForm(false)
            fetchPrograms()
          }}
        />
      )}
    </div>
  )
}
