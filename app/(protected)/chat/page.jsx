'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import { useChat } from '@/context/ChatContext'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

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

export default function ChatPage() {
  const { contacts, selectedContact, loading, error, fetchConversations } = useChat()
  const { schoolId } = useAuth()
  const hasFetchedRef = useRef(false)

  useLayoutEffect(() => {
    if (schoolId && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchConversations()
    }
  }, [schoolId, fetchConversations])

  useEffect(() => {
    const handleChatNavClick = () => {
      fetchConversations()
    }

    window.addEventListener('chat-nav-clicked', handleChatNavClick)
    return () => {
      window.removeEventListener('chat-nav-clicked', handleChatNavClick)
    }
  }, [fetchConversations])

  useEffect(() => {
    let channel = null
    let pollIntervalId = null
    let refreshIntervalId = null
    
    const channelName = `student_messages_${Date.now()}`
    
    const stopPolling = () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId)
        pollIntervalId = null
      }
    }
    
    const startPolling = () => {
      if (!pollIntervalId) {
        pollIntervalId = setInterval(() => {
          fetchConversations(true)
        }, 10000)
      }
    }
    
    // Auto-refresh every 0.1 seconds (100ms)
    const startAutoRefresh = () => {
      if (!refreshIntervalId) {
        refreshIntervalId = setInterval(() => {
          fetchConversations(true)
          // Also refresh messages if a conversation is selected
          if (selectedContact) {
            // Trigger a silent refresh of messages
            const event = new CustomEvent('refresh-messages')
            window.dispatchEvent(event)
          }
        }, 100) // 0.1 seconds = 100ms
      }
    }
    
    const stopAutoRefresh = () => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId)
        refreshIntervalId = null
      }
    }
    
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_messages'
        },
        (payload) => {
          fetchConversations(true)
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Subscription error:', err)
        }
        
        if (status === 'SUBSCRIBED') {
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startPolling()
        }
      })

    startPolling()
    startAutoRefresh()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
      stopPolling()
      stopAutoRefresh()
    }
  }, [fetchConversations, selectedContact])

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      {/* Chat List Sidebar */}
      <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && contacts.length === 0 ? (
            <Spinner size="md" text="Loading conversations..." />
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : (
            <ChatList />
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {selectedContact ? (
          <ChatWindow contact={selectedContact} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-gray-900 font-medium mb-1">Select a conversation</div>
              <div className="text-sm text-gray-500">Choose a student from the sidebar to view messages</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
