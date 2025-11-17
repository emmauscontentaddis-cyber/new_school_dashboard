'use client'

import MessageList from './MessageList'
import MessageInput from './MessageInput'

export default function ChatWindow({
  conversation,
  messages = [],
  onSendMessage,
  isSending = false,
  onRefresh,
  connectionStatus,
}) {
  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">No student selected</p>
          <p className="mt-2 text-sm text-gray-500">
            Choose a student conversation from the sidebar to start chatting.
          </p>
        </div>
      </div>
    )
  }

  const handleSend = (text) => {
    if (!text || isSending) return
    onSendMessage?.(text)
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {conversation.studentName || 'Unnamed student'}
          </p>
          <p className="text-xs text-gray-500">{conversation.studentEmail}</p>
          <p className="text-xs text-gray-400">
            {conversation.programTitle || 'General inquiry'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {connectionStatus && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                connectionStatus.isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span
                className={`mr-1 h-2 w-2 rounded-full ${
                  connectionStatus.isConnected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              {connectionStatus.isConnected ? 'Live' : 'Offline'}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 transition hover:border-indigo-500 hover:text-indigo-600"
          >
            Refresh
          </button>
        </div>
      </header>

      <MessageList messages={messages} currentUserType="school" />
      <MessageInput onSend={handleSend} disabled={isSending} />
    </div>
  )
}

