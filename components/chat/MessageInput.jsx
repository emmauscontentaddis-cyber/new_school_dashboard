'use client'

import { useState } from 'react'

export default function MessageInput({ onSend, disabled = false }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!message.trim() || disabled) return
    onSend?.(message.trim())
    setMessage('')
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 bg-white px-6 py-4">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2">
        <textarea
          className="flex-1 resize-none border-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          rows={1}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type your message..."
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </form>
  )
}

