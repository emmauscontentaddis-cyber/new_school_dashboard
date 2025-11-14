'use client'

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatMessage({ message }) {
  const isSchool = message.sender === 'school'
  const isOptimistic = message.isOptimistic
  const isSending = message.status === 'sending'

  return (
    <div className={`flex ${isSchool ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
        isSchool
          ? 'bg-slate-900 text-white'
          : 'bg-white text-gray-900 border border-gray-200'
      } ${isOptimistic || isSending ? 'opacity-70' : ''}`}>
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.text}
        </div>
        <div className={`text-xs mt-1 ${
          isSchool ? 'text-slate-300' : 'text-gray-500'
        }`}>
          {formatTime(message.timestamp)}
          {isSending && <span className="ml-2">Sending...</span>}
        </div>
      </div>
    </div>
  )
}

