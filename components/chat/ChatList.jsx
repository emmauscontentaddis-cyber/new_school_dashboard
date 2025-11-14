'use client'

import { useChat } from '@/context/ChatContext'

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

function formatMessageTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return date.toLocaleDateString()
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getAvatarColor(name) {
  const shades = [
    'bg-gray-900',
    'bg-gray-800',
    'bg-gray-700',
    'bg-gray-600',
  ]
  if (!name) return shades[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return shades[Math.abs(hash) % shades.length]
}

export default function ChatList() {
  const { contacts, selectedContact, loading, selectConversation } = useChat()

  if (loading && contacts.length === 0) {
    return (
      <div className="py-12">
        <Spinner size="md" text="Loading conversations..." />
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <div className="text-sm font-medium">No conversations yet</div>
        <div className="text-xs mt-1 text-gray-400">Messages will appear here when students contact you</div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {contacts.map((contact) => {
        const isSelected = selectedContact?.id === contact.id
        const studentName = contact.studentName || 'Unknown Student'
        
        return (
          <button
            key={contact.id}
            onClick={() => selectConversation(contact.id)}
            className={`w-full text-left p-4 rounded-lg bg-white border transition-colors ${
              isSelected
                ? 'bg-gray-100 border-gray-300'
                : 'border-transparent hover:bg-gray-50'
            }`}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className={`w-11 h-11 rounded-full ${getAvatarColor(studentName)} flex items-center justify-center text-white font-medium text-sm`}>
                  {getInitials(studentName)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className={`font-medium text-sm truncate ${
                    isSelected ? 'text-gray-900' : 'text-gray-900'
                  }`}>
                    {studentName}
                  </div>
                  <div className={`text-xs whitespace-nowrap flex-shrink-0 ${
                    isSelected ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {formatMessageTime(contact.timestamp)}
                  </div>
                </div>
                
                <div className={`text-xs mb-1.5 truncate ${
                  isSelected ? 'text-gray-600' : 'text-gray-500'
                }`}>
                  {contact.studentEmail}
                </div>

                <div 
                  className={`text-sm leading-snug ${
                    isSelected ? 'text-gray-700' : 'text-gray-600'
                  }`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {contact.lastMessage || 'No message preview'}
                </div>

                {contact.unread && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                      New
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

