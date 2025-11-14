'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat } from '@/context/ChatContext'
import ChatMessage from './ChatMessage'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ChatWindow({ contact }) {
  const { messages, sendingMessage, sendReply } = useChat()
  const [replyText, setReplyText] = useState('')
  const messagesEndRef = useRef(null)
  
  // Sort messages by timestamp to ensure proper order
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = a.fullTimestamp || new Date(a.timestamp).getTime()
      const timeB = b.fullTimestamp || new Date(b.timestamp).getTime()
      return timeA - timeB
    })
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [sortedMessages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || sendingMessage || !contact) {
      return
    }

    const studentMessages = sortedMessages.filter(m => m.sender === 'student')
    
    if (studentMessages.length === 0) {
      alert('No student messages found to reply to')
      return
    }

    const messageToReply = studentMessages[studentMessages.length - 1]
    
    if (!messageToReply) {
      return
    }
    
    const messageId = messageToReply.id.replace('_reply', '')

    try {
      await sendReply(messageId, replyText)
      setReplyText('')
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('Failed to send reply: ' + error.message)
    }
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="text-gray-900 font-medium mb-1">Select a student to start chatting</div>
          <div className="text-sm text-gray-500">Choose a conversation from the sidebar</div>
        </div>
      </div>
    )
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

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${getAvatarColor(contact.studentName)} flex items-center justify-center text-white font-medium text-sm`}>
            {getInitials(contact.studentName || contact.studentEmail)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{contact.studentName || contact.studentEmail}</div>
            <div className="text-sm text-gray-500 truncate">{contact.studentEmail}</div>
            {contact.programTitle && (
              <div className="text-xs text-gray-400 mt-0.5 truncate">{contact.programTitle}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {sortedMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">No messages yet</div>
              <div className="text-xs text-gray-500">Start the conversation by sending a reply</div>
            </div>
          ) : (
            sortedMessages.map((message, index) => (
              <ChatMessage 
                key={message.id || `${message.timestamp}-${message.sender}-${index}`} 
                message={message} 
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-6 py-4 flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-3">
          <Input
            type="text"
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={sendingMessage}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!replyText.trim() || sendingMessage}
            size="md"
          >
            {sendingMessage ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  )
}

