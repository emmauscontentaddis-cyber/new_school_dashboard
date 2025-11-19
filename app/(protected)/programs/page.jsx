'use client'

import StatCard from '@/components/ui/StatCard'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { usePrograms } from '@/context/ProgramsContext'
import NewProgramForm from '@/components/programs/newProgramForm'
import { useMemo, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

const ProgramDetail = dynamic(() => import('./components/ProgramDetail/ProgramDetail'), {
  ssr: false,
})

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
  const [detailProgramId, setDetailProgramId] = useState(null)
  const [editingProgramId, setEditingProgramId] = useState(null)

  const formatFee = (program) => {
    const amount = Number(program.fee ?? program.tuition ?? 0)
    const currency = program.currency || 'SEK'

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount)
    } catch {
      return `${amount.toLocaleString()} ${currency}`
    }
  }

  const formatDeadline = (program) => {
    const dateValue = program.application_deadline || program.deadline || program.end_date
    if (!dateValue) return '—'
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

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

  const handleDelete = useCallback(async (id) => {
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
  }, [deleteProgram])

  const tableColumns = useMemo(() => ([
    { header: 'Program', accessor: 'program' },
    { header: 'Modality', accessor: 'modality' },
    { header: 'Fee', accessor: 'fee' },
    { header: 'Capacity', accessor: 'capacity' },
    { header: 'Deadline', accessor: 'deadline' },
    { header: 'Status', accessor: 'status' },
    { header: 'Actions', accessor: 'actions' },
  ]), [])

  const tableData = useMemo(() => (
    filteredPrograms.map((program) => {
      const isOpen = program.open || program.status === 'active'
      const modalityLabel = program.modality || (program.online ? 'Online' : program.hybrid ? 'Hybrid' : 'On-campus')
      const capacity = program.seats ?? program.credits ?? 0

      return {
        program: (
          <div className="min-w-[180px]">
            <div className="font-semibold text-slate-900">{program.name || program.title}</div>
            {program.course_code && (
              <div className="text-xs text-slate-500 mt-0.5">{program.course_code}</div>
            )}
          </div>
        ),
        modality: (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {modalityLabel}
          </span>
        ),
        fee: (
          <span className="font-medium text-slate-900">
            {formatFee(program)}
          </span>
        ),
        capacity: (
          <span className="text-slate-700">{capacity.toLocaleString()} seats</span>
        ),
        deadline: (
          <span className="text-slate-700">{formatDeadline(program)}</span>
        ),
        status: (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
        ),
        actions: (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailProgramId(program.id)}
            >
              View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingProgramId(program.id)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(program.id)}
              disabled={deletingId === program.id}
            >
              {deletingId === program.id ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        ),
      }
    })
  ), [filteredPrograms, deletingId, handleDelete, formatFee, formatDeadline])

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Programs</h1>
            <p className="text-gray-600 text-sm">Manage your courses and programs</p>
          </div>
          <Button 
            onClick={() => {
              setShowForm(true)
              setEditingProgramId(null)
            }}
            className={editingProgramId ? 'bg-slate-900 hover:bg-slate-800' : ''}
          >
            {editingProgramId ? 'Edit Program' : 'Course Register'}
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

      {/* Programs Table */}
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
            Course Register
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0">
          <Table columns={tableColumns} data={tableData} />
        </div>
      )}

      {/* Course Registration/Edit Modal */}
      {(showForm || editingProgramId) && (
        <NewProgramForm
          programId={editingProgramId || null}
          onClose={() => {
            setShowForm(false)
            setEditingProgramId(null)
          }}
          onSuccess={(course) => {
            setShowForm(false)
            setEditingProgramId(null)
            fetchPrograms()
          }}
        />
      )}

      {/* Program Detail Modal */}
      {detailProgramId && (
        <ProgramDetail
          programId={detailProgramId}
          onClose={() => setDetailProgramId(null)}
          onEdit={() => {
            setEditingProgramId(detailProgramId)
            setDetailProgramId(null)
          }}
          onRefresh={() => {
            fetchPrograms()
          }}
        />
      )}
    </div>
  )
}
