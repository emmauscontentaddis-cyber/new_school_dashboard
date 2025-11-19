'use client'

import { useState, useEffect } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import StatCard from '@/components/ui/StatCard'
import CapacityIndicator from './CapacityIndicator'
import ApplicationCyclesManager from './ApplicationCyclesManager'
import ScholarshipManager from './ScholarshipManager'
import { getProgramCapacity, getProgramStatistics } from '@/services/programs'
import { getScholarshipStatistics } from '@/services/scholarships'
import { usePrograms } from '@/context/ProgramsContext'

// Simple inline spinner component
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

export default function ProgramDetail({ programId, onClose, onEdit, onRefresh }) {
  const { programs } = usePrograms()
  const program = programs.find(p => p.id === programId)
  
  const [capacity, setCapacity] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [scholarshipStats, setScholarshipStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadData()
  }, [programId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [capacityData, statsData, scholarshipData] = await Promise.all([
        getProgramCapacity(programId),
        getProgramStatistics(programId),
        getScholarshipStatistics(programId)
      ])
      setCapacity(capacityData)
      setStatistics(statsData)
      setScholarshipStats(scholarshipData)
    } catch (error) {
      console.error('Error loading program data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!program) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <GlassCard className="max-w-2xl w-full">
          <div className="text-center py-8">
            <div className="text-red-500 text-2xl mb-2">⚠️</div>
            <div className="text-lg font-semibold text-slate-900 mb-2">Program not found</div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 mt-4"
            >
              Close
            </button>
          </div>
        </GlassCard>
      </div>
    )
  }

  const deadline = program.application_deadline || program.deadline
  const deadlineDate = deadline ? new Date(deadline) : null
  const isDeadlinePassed = deadlineDate && deadlineDate < new Date()
  const daysUntilDeadline = deadlineDate 
    ? Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl  my-8">
        <GlassCard>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4  border-b border-slate-200">
            <div className="flex-1 mt-[50px]">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {program.name || program.title || 'Untitled Program'}
              </h2>
              {program.course_code && (
                <div className="text-sm text-slate-500">Code: {program.course_code}</div>
              )}
            </div>
            <div className="flex items-center mt-[50px] gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12">
              <Spinner size="lg" text="Loading program details..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="border-b border-slate-200">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('cycles')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'cycles'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Application Cycles
                  </button>
                  <button
                    onClick={() => setActiveTab('scholarships')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'scholarships'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Scholarships
                  </button>
                </div>
              </div>

              {activeTab === 'overview' && (
                <>
              {/* Capacity Overview */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Capacity & Enrollment</h3>
                {capacity && (
                  <div className="space-y-4">
                    <CapacityIndicator
                      totalSeats={capacity.totalSeats}
                      enrolled={capacity.enrolled}
                      reserved={capacity.reserved}
                      available={capacity.available}
                      showLabels={true}
                      size="lg"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard
                        label="Total Seats"
                        value={capacity.totalSeats}
                        icon="🪑"
                        tone="slate"
                      />
                      <StatCard
                        label="Enrolled"
                        value={capacity.enrolled}
                        icon="✅"
                        tone="emerald"
                      />
                      <StatCard
                        label="Reserved"
                        value={capacity.reserved}
                        icon="🔒"
                        tone="blue"
                      />
                      <StatCard
                        label="Available"
                        value={capacity.available}
                        icon="📋"
                        tone={capacity.available > 0 ? 'indigo' : 'amber'}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Program Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <GlassCard title="Program Details" subtitle="Basic information">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Category:</span>
                      <span className="font-medium text-slate-900">{program.category || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Level:</span>
                      <span className="font-medium text-slate-900 capitalize">{program.level || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Modality:</span>
                      <span className="font-medium text-slate-900">{program.modality || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Duration:</span>
                      <span className="font-medium text-slate-900">
                        {program.duration_weeks ? `${program.duration_weeks} weeks` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tuition:</span>
                      <span className="font-medium text-slate-900">
                        {program.fee > 0 ? `$${program.fee.toLocaleString()}` : 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Scholarship:</span>
                      <span className="font-medium text-slate-900">
                        {program.scholarship ? '✓ Available' : '✗ Not available'}
                      </span>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard title="Important Dates" subtitle="Deadlines and schedule">
                  <div className="space-y-3 text-sm">
                    {program.start_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Start Date:</span>
                        <span className="font-medium text-slate-900">
                          {new Date(program.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {program.end_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">End Date:</span>
                        <span className="font-medium text-slate-900">
                          {new Date(program.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {deadline ? (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Application Deadline:</span>
                        <span className={`font-medium ${
                          isDeadlinePassed 
                            ? 'text-red-600' 
                            : daysUntilDeadline !== null && daysUntilDeadline <= 7
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}>
                          {deadlineDate.toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">No deadline set</div>
                    )}
                    {daysUntilDeadline !== null && !isDeadlinePassed && (
                      <div className={`p-3 rounded-lg ${
                        daysUntilDeadline <= 7 
                          ? 'bg-amber-50 border border-amber-200' 
                          : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <div className={`text-sm font-medium ${
                          daysUntilDeadline <= 7 ? 'text-amber-800' : 'text-slate-700'
                        }`}>
                          {daysUntilDeadline === 0 
                            ? '⚠️ Deadline is today!'
                            : daysUntilDeadline === 1
                            ? '⚠️ Deadline is tomorrow'
                            : daysUntilDeadline <= 7
                            ? `⚠️ ${daysUntilDeadline} days until deadline`
                            : `${daysUntilDeadline} days until deadline`}
                        </div>
                      </div>
                    )}
                    {isDeadlinePassed && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="text-sm font-medium text-red-800">
                          ⚠️ Application deadline has passed
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>

              {/* Statistics */}
              {statistics && statistics.totalApplications > 0 && (
                <GlassCard title="Program Statistics" subtitle="Application metrics">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <StatCard
                      label="Total Applications"
                      value={statistics.totalApplications}
                      icon="📝"
                      tone="indigo"
                    />
                    <StatCard
                      label="Conversion Rate"
                      value={`${statistics.conversionRate}%`}
                      icon="📈"
                      tone="emerald"
                    />
                    <StatCard
                      label="Status Breakdown"
                      value={Object.keys(statistics.byStatus).length}
                      icon="📊"
                      tone="slate"
                    />
                  </div>

                  {Object.keys(statistics.byStatus).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Applications by Status</h4>
                      <div className="space-y-2">
                        {Object.entries(statistics.byStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 capitalize">{status.replace('_', ' ')}</span>
                            <span className="font-medium text-slate-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(statistics.byMarketingSource).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Marketing Sources</h4>
                      <div className="space-y-2">
                        {Object.entries(statistics.byMarketingSource)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([source, count]) => (
                            <div key={source} className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">{source}</span>
                              <span className="font-medium text-slate-900">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </GlassCard>
              )}

              {/* Description */}
              {program.description && (
                <GlassCard title="Description" subtitle="Program overview">
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {program.description}
                  </div>
                </GlassCard>
              )}
                </>
              )}

              {activeTab === 'cycles' && (
                <GlassCard title="Application Cycles" subtitle="Manage multiple application cycles for this program">
                  <ApplicationCyclesManager courseId={programId} />
                </GlassCard>
              )}

              {activeTab === 'scholarships' && (
                <div className="space-y-6">
                  {scholarshipStats && scholarshipStats.totalScholarships > 0 && (
                    <div className="grid md:grid-cols-4 gap-4">
                      <StatCard
                        label="Total Scholarships"
                        value={scholarshipStats.totalScholarships}
                        icon="💰"
                        tone="indigo"
                      />
                      <StatCard
                        label="Total Budget"
                        value={`${program.currency || 'SEK'} ${scholarshipStats.totalBudget.toLocaleString()}`}
                        icon="💵"
                        tone="emerald"
                      />
                      <StatCard
                        label="Awarded"
                        value={scholarshipStats.awardedCount}
                        icon="✅"
                        tone="slate"
                      />
                      <StatCard
                        label="Available"
                        value={scholarshipStats.availableCount}
                        icon="📋"
                        tone="blue"
                      />
                    </div>
                  )}
                  <GlassCard title="Scholarship Management" subtitle="Manage scholarships for this program">
                    <ScholarshipManager courseId={programId} />
                  </GlassCard>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

