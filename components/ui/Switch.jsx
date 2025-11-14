'use client'

export default function Switch({ checked, onChange, label, name, disabled = false }) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {label && <span className="text-sm text-slate-700">{label}</span>}
      <span className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-blue-600' : 'bg-gray-300',
        disabled ? 'opacity-50' : ''
      ].join(' ')}>
        <input 
          type="checkbox" 
          name={name} 
          className="sr-only" 
          checked={checked} 
          onChange={(e) => onChange?.(e.target.checked)} 
          disabled={disabled}
        />
        <span className={[
          'inline-block h-4 w-4 transform rounded-full bg-white transition shadow-sm',
          checked ? 'translate-x-6' : 'translate-x-1'
        ].join(' ')} />
      </span>
    </label>
  )
}

