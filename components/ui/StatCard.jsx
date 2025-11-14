'use client'

import { memo } from 'react'
import Link from 'next/link'

const accents = {
  slate: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  indigo: {
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  red: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  blue: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
}

function StatCard({ label, value, icon = '⬤', tone = 'slate', onClick, href, className = '' }) {
  const a = accents[tone] || accents.slate
  const baseClasses = [
    'bg-white rounded-xl shadow-md p-4 md:p-5 border border-gray-200',
    className
  ].join(' ')
  
  const interactiveClasses = onClick || href 
    ? 'cursor-pointer hover:shadow-xl hover:border-gray-400 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 hover:-translate-y-1' 
    : ''

  const content = (
    <div className={[baseClasses, interactiveClasses].join(' ')} onClick={onClick}>
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${a.iconBg} flex items-center justify-center shadow-sm transition-transform duration-200 ${onClick || href ? 'group-hover:scale-110' : ''}`}>
          <span className={`text-lg md:text-xl ${a.iconColor}`}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-1.5">{value}</div>
      <div className="text-xs md:text-sm font-medium text-gray-600 leading-tight">{label}</div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} prefetch={true} className="block no-underline">
        {content}
      </Link>
    )
  }

  return content
}

export default memo(StatCard)

