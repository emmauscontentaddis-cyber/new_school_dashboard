'use client'

export default function Input({ className = '', ...props }) {
  return (
    <input
      className={[
        'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm',
        'placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500',
        'hover:border-gray-400',
        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
        'shadow-sm',
        'box-border',
        className,
      ].join(' ')}
      style={{ boxSizing: 'border-box' }}
      {...props}
    />
  )
}

