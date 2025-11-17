'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import ConversationList from '@/components/chat/ConversationList'
import ChatWindow from '@/components/chat/ChatWindow'
import socketService from '@/services/socketService'
import {
  getConversations,
  getMessages,
  sendMessage as sendChatMessage,
  markMessagesAsRead,
} from '@/services/chat'

const getConversationKey = (studentId, programId) => `${studentId}-${programId || 'general'}`

export default function ChatPage() {
  const { schoolId } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [socketStatus, setSocketStatus] = useState({ isConnected: false })
  const [error, setError] = useState(null)

  const loadConversations = useCallback(async () => {
    if (!schoolId) return
    setLoadingConversations(true)
    try {
      const data = await getConversations({ schoolId })
      setConversations(data)
      setError(null)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setError(error.message || 'Unable to load conversations')
    } finally {
      setLoadingConversations(false)
    }
  }, [schoolId])

  const loadMessages = useCallback(
    async (conversation) => {
      if (!conversation || !schoolId) return
      setLoadingMessages(true)
      try {
        const data = await getMessages({
          schoolId,
          studentId: conversation.studentId,
        })
        setMessages(data)
        setError(null)
        await markMessagesAsRead({
          schoolId,
          studentId: conversation.studentId,
        })
        setConversations((prev) =>
          prev.map((item) =>
            item.conversationId === conversation.conversationId
              ? { ...item, unreadCount: 0 }
              : item
          )
        )
      } catch (error) {
        console.error('Failed to load messages:', error)
        setError(error.message || 'Unable to load messages')
      } finally {
        setLoadingMessages(false)
      }
    },
    [schoolId]
  )

  const handleConversationSelect = async (conversation) => {
    setSelectedConversation(conversation)
    await loadMessages(conversation)
    if (schoolId && conversation) {
      socketService.joinConversationRoom(schoolId, conversation.studentId)
    }
  }

  const upsertConversationFromMessage = useCallback(
    (message) => {
      setConversations((prev) => {
        const conversationId = getConversationKey(message.student_id, message.program_id)
        const existing = prev.find((item) => item.conversationId === conversationId)
        const lastMessage = {
          text: message.message,
          senderType: message.sender_type,
          messageType: message.message_type,
          sentAt: message.sent_at,
        }

        if (!existing) {
          return [
            {
              conversationId,
              studentId: message.student_id,
              studentName: message.student_name,
              studentEmail: message.student_email,
              programId: message.program_id,
              programTitle: message.program_title,
              schoolId: message.school_id,
              schoolName: message.school_name,
              roomId: message.room_id,
              lastMessage,
              unreadCount: message.receiver_type === 'school' ? 1 : 0,
            },
            ...prev,
          ]
        }

        return prev.map((item) => {
          if (item.conversationId !== conversationId) {
            return item
          }

          const unreadIncrement =
            message.receiver_type === 'school' &&
            (!selectedConversation || selectedConversation.conversationId !== conversationId)
              ? 1
              : 0

          return {
            ...item,
            lastMessage,
            unreadCount: Math.max(0, item.unreadCount + unreadIncrement),
          }
        })
      })
    },
    [selectedConversation]
  )

  const handleIncomingMessage = useCallback(
    (message) => {
      if (!message || message.school_id !== schoolId) {
        return
      }

      upsertConversationFromMessage(message)

      if (
        selectedConversation &&
        selectedConversation.studentId === message.student_id
      ) {
        setMessages((prev) => [...prev, message])
        if (message.receiver_type === 'school') {
          markMessagesAsRead({ schoolId, studentId: message.student_id }).catch(() => {})
        }
      }
    },
    [schoolId, selectedConversation, upsertConversationFromMessage]
  )

  const handleSendMessage = async (text) => {
    if (!selectedConversation) return

    setIsSending(true)
    try {
      const saved = await sendChatMessage({
        studentId: selectedConversation.studentId,
        studentName: selectedConversation.studentName,
        studentEmail: selectedConversation.studentEmail,
        programId: selectedConversation.programId,
        programTitle: selectedConversation.programTitle,
        message: text,
      })

      setMessages((prev) => [...prev, saved])
      setError(null)
      upsertConversationFromMessage(saved)
      socketService.sendMessage({
        senderId: saved.sender_id,
        senderType: saved.sender_type,
        receiverId: saved.receiver_id,
        receiverType: saved.receiver_type,
        message: saved.message,
        schoolId: saved.school_id,
        studentId: saved.student_id,
        studentName: saved.student_name,
        studentEmail: saved.student_email,
        schoolName: saved.school_name,
        programId: saved.program_id,
        programTitle: saved.program_title,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(error.message || 'Unable to send message')
    } finally {
      setIsSending(false)
    }
  }

  const refreshMessages = useCallback(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
    }
  }, [loadMessages, selectedConversation])

  useEffect(() => {
    if (!schoolId) return
    loadConversations()
  }, [loadConversations, schoolId])

  useEffect(() => {
    if (!schoolId) return

    socketService.connect({ schoolId })

    const interval = setInterval(() => {
      setSocketStatus(socketService.getConnectionStatus())
    }, 2000)

    const messageHandler = (payload) => handleIncomingMessage(payload)
    socketService.onNewMessage(messageHandler)
    socketService.onNewStudentMessage(messageHandler)

    return () => {
      clearInterval(interval)
      socketService.offNewMessage(messageHandler)
      socketService.offNewStudentMessage(messageHandler)
      socketService.disconnect()
    }
  }, [schoolId, handleIncomingMessage])

  const hasSelection = Boolean(selectedConversation)

  const currentMessages = useMemo(() => {
    if (loadingMessages) {
      return []
    }
    return messages
  }, [loadingMessages, messages])

  return (
    <div className="flex h-full flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex h-full min-h-[calc(100vh-160px)] rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-full max-w-sm">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversation?.conversationId}
          onSelect={handleConversationSelect}
          loading={loadingConversations}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <div className="flex flex-1 flex-col">
        {hasSelection ? (
          <ChatWindow
            conversation={selectedConversation}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            onRefresh={refreshMessages}
            connectionStatus={socketStatus}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                Select a conversation to begin
              </p>
              <p className="mt-2 text-gray-500">
                Students who apply to your programs will appear in the sidebar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

