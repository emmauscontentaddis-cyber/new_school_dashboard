'use client'

import { useEffect, useRef } from 'react'

const formatTime = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

export default function MessageList({ messages = [], currentUserType = 'school' }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
        No messages yet. Start the conversation!
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender_type === currentUserType
          return (
            <div key={message.id} className="flex flex-col">
              <div
                className={`inline-flex max-w-[75%] flex-col rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  isOwnMessage
                    ? 'self-end rounded-br-none bg-indigo-600 text-white'
                    : 'self-start rounded-bl-none bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-line">{message.message}</p>
                <span
                  className={`mt-1 text-xs ${
                    isOwnMessage ? 'text-indigo-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.sent_at)}
                  {isOwnMessage && (
                    <span className="ml-2">
                      {message.is_read ? 'Seen' : 'Sent'}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

