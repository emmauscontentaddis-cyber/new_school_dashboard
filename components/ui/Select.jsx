'use client'

export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={[
        'w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  )
}

