'use client'

export default function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={[
        'w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'resize-y min-h-[100px]',
        className,
      ].join(' ')}
      {...props}
    />
  )
}

