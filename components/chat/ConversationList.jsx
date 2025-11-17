'use client'

import { useMemo } from 'react'

export default function ConversationList({
  conversations = [],
  selectedConversationId,
  onSelect,
  loading = false,
  searchTerm,
  onSearchChange,
}) {
  const filtered = useMemo(() => {
    if (!searchTerm) {
      return conversations
    }
    const query = searchTerm.toLowerCase()
    return conversations.filter((conversation) => {
      return (
        conversation.studentName?.toLowerCase().includes(query) ||
        conversation.studentEmail?.toLowerCase().includes(query) ||
        conversation.programTitle?.toLowerCase().includes(query)
      )
    })
  }, [conversations, searchTerm])

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Search students or programs"
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-sm text-gray-500">Loading conversations…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-4 text-sm text-gray-500">
            No conversations yet. Select a student from your applicants list.
          </div>
        )}

        <ul className="divide-y divide-gray-100">
          {filtered.map((conversation) => {
            const isActive = selectedConversationId === conversation.conversationId
            return (
              <li
                key={conversation.conversationId}
                className={`cursor-pointer px-4 py-3 transition hover:bg-indigo-50 ${
                  isActive ? 'bg-indigo-50' : 'bg-white'
                }`}
                onClick={() => onSelect?.(conversation)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {conversation.studentName || 'Unnamed student'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {conversation.programTitle || 'General inquiry'}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="rounded-full bg-indigo-600 px-2 text-xs font-semibold text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                {conversation.lastMessage?.text && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                    {conversation.lastMessage.text}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

