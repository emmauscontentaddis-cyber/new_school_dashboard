'use client'

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  ...props 
}) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900',
    secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={[
        'rounded-lg font-medium transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

