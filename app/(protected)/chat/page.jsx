'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
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
  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [socketStatus, setSocketStatus] = useState({ isConnected: false })
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  // Track recently processed message IDs to prevent rapid duplicates
  const processedMessageIdsRef = useRef(new Set())

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Deduplicate and sort messages before rendering
  const uniqueMessages = useMemo(() => {
    const messageMap = new Map()
    messages.forEach(msg => {
      if (msg.id && !messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg)
      }
    })
    
    return Array.from(messageMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.sent_at || 0)
        const dateB = new Date(b.sent_at || 0)
        return dateA - dateB
      })
  }, [messages])

  useEffect(scrollToBottom, [uniqueMessages])

  const loadContacts = useCallback(async () => {
    if (!schoolId) return
    setLoadingContacts(true)
    try {
      const data = await getConversations({ schoolId })
      // Deduplicate conversations by conversationId and normalize lastMessage
      const uniqueConversations = Array.from(
        new Map(data.map(conv => [conv.conversationId, conv])).values()
      ).map(conv => ({
        ...conv,
        // Ensure lastMessage is always a string, not an object
        lastMessage: typeof conv.lastMessage === 'object' 
          ? (conv.lastMessage?.text || conv.lastMessage?.message || '') 
          : (conv.lastMessage || ''),
        timestamp: typeof conv.lastMessage === 'object' 
          ? (conv.lastMessage?.sentAt || conv.timestamp) 
          : conv.timestamp,
      }))
      setContacts(uniqueConversations || [])
      setError(null)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setError(error.message || 'Unable to load conversations')
    } finally {
      setLoadingContacts(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const upsertContactFromMessage = useCallback(
    (message) => {
      setContacts((prev) => {
        const key = getConversationKey(message.student_id, message.program_id)
        const existing = prev.find((contact) => contact.conversationId === key)

        const lastMessage = {
          text: message.message,
          sentAt: message.sent_at,
          senderType: message.sender_type,
        }

        if (!existing) {
          return [
            {
              conversationId: key,
              studentId: message.student_id,
              studentName: message.student_name,
              studentEmail: message.student_email,
              programId: message.program_id,
              programTitle: message.program_title,
              schoolId: message.school_id,
              schoolName: message.school_name,
              lastMessage: lastMessage.text,
              timestamp: message.sent_at,
              unreadCount: message.receiver_type === 'school' && !message.is_read ? 1 : 0,
            },
            ...prev,
          ]
        }

        return prev.map((contact) => {
          if (contact.conversationId !== key) return contact
          const unreadIncrement =
            message.receiver_type === 'school' && !message.is_read ? 1 : 0
          return {
            ...contact,
            lastMessage: lastMessage.text,
            timestamp: lastMessage.sentAt,
            unreadCount:
              selectedConversation && selectedConversation.conversationId === key
                ? 0
                : Math.max(0, (contact.unreadCount || 0) + unreadIncrement),
          }
        })
      })
    },
    [selectedConversation]
  )

  const handleIncomingMessage = useCallback(
    (message) => {
      if (!message || !message.id || !schoolId) return
      if (message.school_id !== schoolId) return
      
      // Ignore messages sent by the school (we already added them locally)
      // Only process messages from students
      if (message.sender_type === 'school') {
        console.log('Ignoring echo of own message:', message.id)
        return
      }

      // Check if we've already processed this message ID recently
      if (processedMessageIdsRef.current.has(message.id)) {
        console.log('Ignoring duplicate message:', message.id)
        return
      }

      console.log('Received incoming message from student:', message.id)
      
      // Mark as processed
      processedMessageIdsRef.current.add(message.id)
      
      // Clean up old IDs after 5 minutes to prevent memory leak
      setTimeout(() => {
        processedMessageIdsRef.current.delete(message.id)
      }, 5 * 60 * 1000)
      
      upsertContactFromMessage(message)

      const currentProgramKey = selectedConversation?.programId || 'general'
      const messageProgramKey = message.program_id || 'general'
      if (
        selectedConversation &&
        selectedConversation.studentId === message.student_id &&
        currentProgramKey === messageProgramKey
      ) {
        setMessages((prev) => {
          // Use Map for efficient deduplication
          const messageMap = new Map(prev.map(m => [m.id, m]))
          
          // Only add if it doesn't exist
          if (!messageMap.has(message.id)) {
            messageMap.set(message.id, message)
            const sorted = Array.from(messageMap.values()).sort((a, b) => {
              const dateA = new Date(a.sent_at || 0)
              const dateB = new Date(b.sent_at || 0)
              return dateA - dateB
            })
            return sorted
          }
          
          return prev
        })
        if (message.sender_type === 'student') {
          markMessagesAsRead({ schoolId, studentId: message.student_id }).catch(() => {})
        }
        
        // Ensure input stays focused and enabled after receiving a message
        setTimeout(() => {
          if (inputRef.current) {
            const wasFocused = document.activeElement === inputRef.current
            const hasText = inputRef.current.value.trim().length > 0
            
            if (wasFocused || hasText) {
              inputRef.current.focus()
            }
          }
        }, 100)
      }
    },
    [schoolId, selectedConversation, upsertContactFromMessage]
  )

  useEffect(() => {
    if (!schoolId) return

    socketService.connect({ schoolId })
    const updateStatus = () => setSocketStatus(socketService.getConnectionStatus())
    const interval = setInterval(updateStatus, 2000)

    socketService.onNewMessage(handleIncomingMessage)
    socketService.onNewStudentMessage(handleIncomingMessage)

    return () => {
      clearInterval(interval)
      socketService.offNewMessage(handleIncomingMessage)
      socketService.offNewStudentMessage(handleIncomingMessage)
      socketService.disconnect()
    }
  }, [handleIncomingMessage, schoolId])

  const selectConversation = useCallback(
    async (conversation) => {
      setSelectedConversation(conversation)
      if (!conversation || !conversation.studentId || !schoolId) return
      setLoadingMessages(true)
      try {
        const data = await getMessages({
          schoolId,
          studentId: conversation.studentId,
        })
        // Deduplicate messages by ID and sort by sent_at
        const messageMap = new Map()
        ;(data || []).forEach(msg => {
          if (msg.id && !messageMap.has(msg.id)) {
            messageMap.set(msg.id, msg)
            // Mark as processed to prevent duplicates from socket
            processedMessageIdsRef.current.add(msg.id)
          }
        })
        const uniqueMessages = Array.from(messageMap.values())
          .sort((a, b) => new Date(a.sent_at || 0) - new Date(b.sent_at || 0))
        setMessages(uniqueMessages)
        setError(null)
        await markMessagesAsRead({
          schoolId,
          studentId: conversation.studentId,
        })
        setContacts((prev) =>
          prev.map((item) =>
            item.conversationId === conversation.conversationId ? { ...item, unreadCount: 0 } : item
          )
        )
        if (schoolId && conversation) {
          socketService.joinConversationRoom(schoolId, conversation.studentId)
        }
        
        // Focus input after loading messages
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 200)
      } catch (error) {
        console.error('Failed to load messages:', error)
        setError(error.message || 'Unable to load messages')
      } finally {
        setLoadingMessages(false)
      }
    },
    [schoolId]
  )

  const handleSendMessage = async (event) => {
    event.preventDefault()
    
    // Validate inputs
    if (!messageText.trim()) {
      console.warn('Cannot send: message is empty')
      return
    }
    
    if (!selectedConversation) {
      console.warn('Cannot send: no conversation selected')
      setError('Please select a conversation first')
      return
    }
    
    if (!schoolId) {
      console.warn('Cannot send: schoolId is missing')
      setError('School ID is missing')
      return
    }

    const messageToSend = messageText.trim()
    console.log('Sending message:', { 
      messageLength: messageToSend.length,
      studentId: selectedConversation.studentId,
      hasConversation: !!selectedConversation
    })

    try {
      console.log('Calling sendChatMessage with:', {
        studentId: selectedConversation.studentId,
        studentName: selectedConversation.studentName,
        messageLength: messageToSend.length
      })

      const saved = await sendChatMessage({
        studentId: selectedConversation.studentId,
        studentName: selectedConversation.studentName,
        studentEmail: selectedConversation.studentEmail,
        programId: selectedConversation.programId,
        programTitle: selectedConversation.programTitle,
        message: messageToSend,
      })

      console.log('Response from sendChatMessage:', saved)
      console.log('Type of saved:', typeof saved)
      console.log('Is array?', Array.isArray(saved))
      console.log('Saved message ID:', saved?.id)

      // Validate that we got a valid response - check for array (empty response)
      if (Array.isArray(saved)) {
        throw new Error('Server returned an array instead of a message object. Message was not saved.')
      }

      // Validate that we got a valid message object
      if (!saved || typeof saved !== 'object') {
        throw new Error(`Invalid response from server: expected object, got ${typeof saved}. Message was not saved.`)
      }

      // Check for required fields
      if (!saved.id && !saved.sender_id) {
        throw new Error('Invalid response from server: message object missing required fields (id or sender_id). Message was not saved.')
      }

      console.log('Validation passed, clearing input and updating UI')

      // Only clear input after successful send and validation
      setMessageText('')

      // Mark as processed to prevent duplicates
      if (saved?.id) {
        processedMessageIdsRef.current.add(saved.id)
      }

      setMessages((prev) => {
        // Use Map for efficient deduplication
        const messageMap = new Map(prev.map(m => [m.id, m]))
        
        // Only add if it doesn't exist
        if (saved?.id && !messageMap.has(saved.id)) {
          messageMap.set(saved.id, saved)
          const sorted = Array.from(messageMap.values()).sort((a, b) => {
            const dateA = new Date(a.sent_at || 0)
            const dateB = new Date(b.sent_at || 0)
            return dateA - dateB
          })
          return sorted
        }
        
        return prev
      })
      setError(null)
      upsertContactFromMessage(saved)
      
      // Send via socket for real-time delivery
      try {
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
      } catch (socketError) {
        console.warn('Socket send failed (non-critical):', socketError)
        // Don't fail the whole operation if socket fails
      }
      
      // Keep input focused after sending
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    } catch (error) {
      console.error('Failed to send message:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      // Show error to user - make it visible
      const errorMessage = error.message || 'Unable to send message. Please try again.'
      setError(errorMessage)
      
      // Restore message text on error so user doesn't lose it
      setMessageText(messageToSend)
      
      // Scroll error into view if it exists
      setTimeout(() => {
        const errorElement = document.querySelector('[data-error-message]')
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
      
      // Keep input focused even on error
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  const conversationsToDisplay = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return contacts.filter((contact) => {
      if (!query) return true
      return (
        contact.studentName?.toLowerCase().includes(query) ||
        contact.programTitle?.toLowerCase().includes(query) ||
        (typeof contact.lastMessage === 'string' && contact.lastMessage.toLowerCase().includes(query))
      )
    })
  }, [contacts, searchQuery])

  const renderMessage = (message, index) => {
    const isMine = message.sender_type === 'school'
    const bubbleStyle = {
      maxWidth: '70%',
      padding: '14px 18px',
      borderRadius: 4,
      marginBottom: 12,
      alignSelf: isMine ? 'flex-end' : 'flex-start',
      backgroundColor: isMine ? '#2563eb' : '#ffffff',
      color: isMine ? '#ffffff' : '#1f2937',
      border: isMine ? 'none' : '1px solid #e5e7eb',
      boxShadow: isMine ? '0 1px 2px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
      lineHeight: '1.5',
    }
    
    // Create a truly unique key using ID + index to handle any edge cases
    const uniqueKey = message.id 
      ? `${message.id}-${index}` 
      : `msg-${index}-${message.sent_at || Date.now()}-${Math.random()}`
    
    return (
      <div key={uniqueKey} style={bubbleStyle}>
        <div style={{ fontSize: 15, wordWrap: 'break-word' }}>
          {message.message || message.text}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            opacity: 0.7,
            textAlign: 'right',
            fontWeight: 400,
          }}
        >
          {new Date(message.sent_at || message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    )
  }

  if (loadingContacts) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: '#f8fafc',
        padding: '20px',
        overflow: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {error && (
        <div
          data-error-message
          style={{
            maxWidth: 1400,
            margin: '0 auto 20px',
            backgroundColor: '#fef2f2',
            border: '2px solid #dc2626',
            color: '#b91c1c',
            padding: '14px 18px',
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#b91c1c',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 8px',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>
      )}
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: 0,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          height: 'calc(100vh - 100px)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: '380px',
            minWidth: '380px',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: 20, 
                  fontWeight: 600,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}>
                  Messages
                </h2>
                <p style={{ 
                  margin: '4px 0 0', 
                  fontSize: 13, 
                  color: '#64748b',
                  fontWeight: 400,
                }}>
                  Student Communications
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: '5px 10px',
                  borderRadius: 3,
                  backgroundColor: socketStatus.isConnected ? '#d1fae5' : '#fee2e2',
                  color: socketStatus.isConnected ? '#065f46' : '#991b1b',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {socketStatus.isConnected ? '● Live' : '○ Offline'}
              </span>
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#94a3b8'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1'
              }}
            />
          </div>
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
          }}>
            {conversationsToDisplay.length === 0 && (
              <div style={{ 
                padding: '32px 24px', 
                textAlign: 'center',
                color: '#94a3b8',
              }}>
                <p style={{ margin: 0, fontSize: 14 }}>No conversations available</p>
              </div>
            )}
            {conversationsToDisplay.map((contact) => {
              const isActive = selectedConversation?.conversationId === contact.conversationId
              return (
                <button
                  key={contact.conversationId || `conv-${contact.studentId}-${Date.now()}`}
                  onClick={() => selectConversation(contact)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px 24px',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: 600,
                      fontSize: 15,
                      color: '#0f172a',
                    }}>
                      {contact.studentName || 'Unnamed student'}
                    </p>
                    {contact.unreadCount > 0 && (
                      <span
                        style={{
                          backgroundColor: '#1e40af',
                          color: '#ffffff',
                          borderRadius: 10,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          minWidth: 20,
                          textAlign: 'center',
                        }}
                      >
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <p style={{ 
                    margin: '0 0 8px', 
                    fontSize: 13, 
                    color: '#64748b',
                    fontWeight: 500,
                  }}>
                    {contact.programTitle || 'General Inquiry'}
                  </p>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    <span style={{ 
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {typeof contact.lastMessage === 'string' 
                        ? contact.lastMessage 
                        : (typeof contact.lastMessage === 'object' 
                          ? (contact.lastMessage?.text || contact.lastMessage?.message || 'No messages yet')
                          : 'No messages yet')}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}>
          {selectedConversation ? (
            <>
              <div
                style={{
                  padding: '20px 28px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div>
                  <h3 style={{ 
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#0f172a',
                    letterSpacing: '-0.01em',
                  }}>
                    {selectedConversation.studentName || 'Unnamed student'}
                  </h3>
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: 13,
                    color: '#64748b',
                    fontWeight: 500,
                  }}>
                    {selectedConversation.programTitle || 'General Inquiry'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedConversation(null)
                    setMessages([])
                  }}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    color: '#475569',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9'
                    e.currentTarget.style.borderColor = '#94a3b8'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = '#cbd5e1'
                  }}
                >
                  Close
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '28px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#f8fafc',
                }}
              >
                {loadingMessages && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#94a3b8',
                    padding: '60px 20px',
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: 15,
                      fontWeight: 500,
                    }}>
                      No messages yet
                    </p>
                    <p style={{ 
                      margin: '8px 0 0', 
                      fontSize: 13,
                      color: '#cbd5e1',
                    }}>
                      Start the conversation with this student
                    </p>
                  </div>
                )}
                {!loadingMessages && uniqueMessages.map((msg, idx) => renderMessage(msg, idx))}
                <div ref={messagesEndRef} />
              </div>
              <form 
                onSubmit={handleSendMessage} 
                style={{ 
                  padding: '20px 28px', 
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    padding: '4px 4px 4px 16px',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      // Allow Enter to submit
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (messageText.trim() && selectedConversation) {
                          handleSendMessage(e)
                        }
                      }
                    }}
                    autoFocus
                    disabled={false}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: 15,
                      backgroundColor: 'transparent',
                      color: '#0f172a',
                      padding: '10px 0',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    style={{
                      backgroundColor: messageText.trim() ? '#1e40af' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '10px 24px',
                      cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (messageText.trim()) {
                        e.currentTarget.style.backgroundColor = '#1e3a8a'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (messageText.trim()) {
                        e.currentTarget.style.backgroundColor = '#1e40af'
                      }
                    }}
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#94a3b8',
                gap: 16,
                padding: 48,
                textAlign: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <h2 style={{ 
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: '#475569',
                letterSpacing: '-0.01em',
              }}>
                Select a Conversation
              </h2>
              <p style={{ 
                margin: 0,
                fontSize: 14,
                color: '#94a3b8',
                maxWidth: 400,
                lineHeight: '1.6',
              }}>
                Choose a conversation from the sidebar to begin messaging with students.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
