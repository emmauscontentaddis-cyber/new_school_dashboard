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
  const { schoolId, user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [socketStatus, setSocketStatus] = useState({ isConnected: false })
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  // Track recently processed message IDs to prevent rapid duplicates
  const processedMessageIdsRef = useRef(new Set())
  // Cache messages per conversation for instant loading
  const messagesCacheRef = useRef(new Map())
  // Track if we've auto-selected the first conversation
  const hasAutoSelectedRef = useRef(false)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Deduplicate and sort messages before rendering
  const uniqueMessages = useMemo(() => {
    const messageMap = new Map()
    messages.forEach(msg => {
      if (msg && msg.id && !messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg)
      }
    })
    
    const sorted = Array.from(messageMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.sent_at || a.sentAt || 0)
        const dateB = new Date(b.sent_at || b.sentAt || 0)
        return dateA - dateB
      })
    
    console.log('🔄 [uniqueMessages] Computed', {
      count: sorted.length,
      timestamp: new Date().toISOString(),
      messageIds: sorted.map(m => m.id)
    })
    return sorted
  }, [messages])

  useEffect(scrollToBottom, [uniqueMessages])

  // Debug: Log when messages change
  useEffect(() => {
    console.log('📬 [Messages State] Updated', {
      count: messages.length,
      timestamp: new Date().toISOString(),
      messageIds: messages.map(m => m.id),
      lastMessage: messages.length > 0 ? {
        id: messages[messages.length - 1].id,
        message: messages[messages.length - 1].message?.substring(0, 50),
        sender_type: messages[messages.length - 1].sender_type,
        sent_at: messages[messages.length - 1].sent_at
      } : null
    })
  }, [messages])

  // Ensure input stays enabled when conversation is selected
  useEffect(() => {
    if (selectedConversation && inputRef.current) {
      // Always ensure input reflects the correct state
      const input = inputRef.current
      const shouldBeEnabled = !loadingMessages && !isSending
      
      if (shouldBeEnabled) {
        input.disabled = false
        input.readOnly = false
        input.style.pointerEvents = 'auto'
        input.style.cursor = 'text'
      } else {
        // Only disable if actually loading or sending
        input.disabled = loadingMessages || isSending
        input.readOnly = loadingMessages || isSending
        input.style.pointerEvents = (loadingMessages || isSending) ? 'none' : 'auto'
        input.style.cursor = (loadingMessages || isSending) ? 'not-allowed' : 'text'
      }
    }
  }, [selectedConversation, loadingMessages, isSending])
  
  // Safety mechanism: Reset isSending if it gets stuck
  useEffect(() => {
    if (!isSending) return

    const timeout = setTimeout(() => {
      console.warn('⚠️ isSending has been true for 5+ seconds, resetting...')
      setIsSending(false)
    }, 5000)

    return () => clearTimeout(timeout)
  }, [isSending])

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
      
      // Check if we've already processed this message ID recently
      if (processedMessageIdsRef.current.has(message.id)) {
        console.log('Ignoring duplicate message:', message.id)
        return
      }

      // For school messages, only process if we're in the correct conversation
      // This allows socket echoes to update the UI if the API response was incomplete
      if (message.sender_type === 'school') {
        const currentProgramKey = selectedConversation?.programId || 'general'
        const messageProgramKey = message.program_id || 'general'
        const isCurrentConversation = 
          selectedConversation &&
          selectedConversation.studentId === message.student_id &&
          currentProgramKey === messageProgramKey
        
        if (!isCurrentConversation) {
          // Not in the current conversation, ignore
          return
        }
        
        // Check if message already exists in state
        setMessages((prev) => {
          const exists = prev.some(m => m.id === message.id)
          if (exists) {
            // Already exists, ignore
            return prev
          }
          
          // Add the message (socket echo might have more complete data)
          const messageMap = new Map(prev.map(m => [m.id, m]))
          messageMap.set(message.id, message)
          const sorted = Array.from(messageMap.values()).sort((a, b) => {
            const dateA = new Date(a.sent_at || 0)
            const dateB = new Date(b.sent_at || 0)
            return dateA - dateB
          })
          
          // Update cache for current conversation
          if (selectedConversation?.conversationId) {
            messagesCacheRef.current.set(selectedConversation.conversationId, sorted)
          }
          
          return sorted
        })
        
        // Mark as processed
        processedMessageIdsRef.current.add(message.id)
        setTimeout(() => {
          processedMessageIdsRef.current.delete(message.id)
        }, 5 * 60 * 1000)
        
        upsertContactFromMessage(message)
        return
      }

      // Process student messages
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
      const conversationKey = getConversationKey(message.student_id, message.program_id)
      
      // Update cache for this conversation even if not currently selected
      const cachedMessages = messagesCacheRef.current.get(conversationKey) || []
      const cachedMap = new Map(cachedMessages.map(m => [m.id, m]))
      if (!cachedMap.has(message.id)) {
        cachedMap.set(message.id, message)
        const sortedCached = Array.from(cachedMap.values()).sort((a, b) => {
          const dateA = new Date(a.sent_at || 0)
          const dateB = new Date(b.sent_at || 0)
          return dateA - dateB
        })
        messagesCacheRef.current.set(conversationKey, sortedCached)
      }
      
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
            
            // Update cache for current conversation
            if (selectedConversation?.conversationId) {
              messagesCacheRef.current.set(selectedConversation.conversationId, sorted)
            }
            
            return sorted
          }
          
          return prev
        })
        if (message.sender_type === 'student') {
          markMessagesAsRead({ schoolId, studentId: message.student_id }).catch(() => {})
        }
        
        // Ensure input stays focused and enabled after receiving a message
        // Don't interfere if we're currently sending
        if (!isSending) {
          setTimeout(() => {
            if (inputRef.current && !loadingMessages && !isSending) {
              // Ensure input is enabled
              inputRef.current.disabled = false
              inputRef.current.readOnly = false
              inputRef.current.style.pointerEvents = 'auto'
              inputRef.current.style.cursor = 'text'
              
              // Refocus if it was focused or has text
              const wasFocused = document.activeElement === inputRef.current
              const hasText = inputRef.current.value.trim().length > 0
              
              if (wasFocused || hasText) {
                inputRef.current.focus()
              }
            }
          }, 100)
        }
      }
    },
    [schoolId, selectedConversation, upsertContactFromMessage, isSending]
  )

  useEffect(() => {
    if (!schoolId) return

    socketService.connect({ schoolId })
    const updateStatus = () => setSocketStatus(socketService.getConnectionStatus())
    const interval = setInterval(updateStatus, 2000)

    socketService.onNewMessage(handleIncomingMessage)
    socketService.onNewStudentMessage(handleIncomingMessage)
    socketService.onNewReply(handleIncomingMessage)

    return () => {
      clearInterval(interval)
      socketService.offNewMessage(handleIncomingMessage)
      socketService.offNewStudentMessage(handleIncomingMessage)
      socketService.offNewReply(handleIncomingMessage)
      socketService.disconnect()
    }
  }, [handleIncomingMessage, schoolId])

  const selectConversation = useCallback(
    async (conversation) => {
      if (!conversation || !conversation.studentId || !schoolId) return
      
      const conversationKey = conversation.conversationId
      
      // Immediately show cached messages if available for instant loading
      const cachedMessages = messagesCacheRef.current.get(conversationKey)
      if (cachedMessages && cachedMessages.length > 0) {
        setSelectedConversation(conversation)
        setMessages(cachedMessages)
        setLoadingMessages(false)
        setError(null)
        
        // Mark messages as read in background
        markMessagesAsRead({
          schoolId,
          studentId: conversation.studentId,
        }).catch(() => {})
        
        setContacts((prev) =>
          prev.map((item) =>
            item.conversationId === conversation.conversationId ? { ...item, unreadCount: 0 } : item
          )
        )
        
        if (schoolId && conversation) {
          socketService.joinConversationRoom(schoolId, conversation.studentId)
        }
        
        // Focus input immediately
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 50)
      } else {
        // No cache, show loading state
        setSelectedConversation(conversation)
        setLoadingMessages(true)
      }
      
      try {
        // Load only the most recent 100 messages initially for faster loading
        const data = await getMessages({
          schoolId,
          studentId: conversation.studentId,
          limit: 100, // Load only recent messages first
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
        
        // Update cache
        messagesCacheRef.current.set(conversationKey, uniqueMessages)
        
        setMessages(uniqueMessages)
        setError(null)
        
        // Mark messages as read in background (non-blocking)
        markMessagesAsRead({
          schoolId,
          studentId: conversation.studentId,
        }).catch(() => {})
        
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
        }, 100)
      } catch (error) {
        console.error('Failed to load messages:', error)
        setError(error.message || 'Unable to load messages')
      } finally {
        setLoadingMessages(false)
      }
    },
    [schoolId]
  )

  // Auto-select the most recent conversation when contacts are loaded
  useEffect(() => {
    // Only auto-select if:
    // 1. Contacts are loaded (not loading)
    // 2. We have contacts
    // 3. No conversation is currently selected
    // 4. We haven't auto-selected yet (to prevent re-selecting when contacts update)
    if (
      !loadingContacts &&
      contacts.length > 0 &&
      !selectedConversation &&
      !hasAutoSelectedRef.current
    ) {
      // Find the most recent conversation by timestamp
      const mostRecent = contacts.reduce((latest, current) => {
        const latestTime = new Date(latest.timestamp || 0).getTime()
        const currentTime = new Date(current.timestamp || 0).getTime()
        return currentTime > latestTime ? current : latest
      })

      if (mostRecent) {
        hasAutoSelectedRef.current = true
        selectConversation(mostRecent)
      }
    }
  }, [contacts, loadingContacts, selectedConversation, selectConversation])

  const handleSendMessage = async (event) => {
    const startTime = Date.now()
    console.log('🚀 [handleSendMessage] START', new Date().toISOString())
    event.preventDefault()
    
    // Prevent double submission
    if (isSending) {
      console.warn('⚠️ [handleSendMessage] Already sending, ignoring duplicate request')
      return
    }
    
    // Validate inputs
    if (!messageText.trim()) {
      console.warn('❌ [handleSendMessage] Cannot send: message is empty')
      return
    }
    
    if (!selectedConversation) {
      console.warn('❌ [handleSendMessage] Cannot send: no conversation selected')
      setError('Please select a conversation first')
      return
    }
    
    if (!schoolId) {
      console.warn('❌ [handleSendMessage] Cannot send: schoolId is missing')
      setError('School ID is missing')
      return
    }

    const messageToSend = messageText.trim()
    
    // Set sending state and clear input immediately for better UX
    setIsSending(true)
    setMessageText('')
    setError(null)
    console.log('📤 [handleSendMessage] Preparing to send:', { 
      messageLength: messageToSend.length,
      messagePreview: messageToSend.substring(0, 50),
      studentId: selectedConversation.studentId,
      studentName: selectedConversation.studentName,
      hasConversation: !!selectedConversation,
      currentMessagesCount: messages.length
    })

    try {
      console.log('📡 [handleSendMessage] Calling sendChatMessage API...', {
        studentId: selectedConversation.studentId,
        studentName: selectedConversation.studentName,
        studentEmail: selectedConversation.studentEmail,
        programId: selectedConversation.programId,
        programTitle: selectedConversation.programTitle,
        messageLength: messageToSend.length,
        timestamp: new Date().toISOString()
      })

      // Add timeout to prevent hanging
      const sendPromise = sendChatMessage({
        studentId: selectedConversation.studentId,
        studentName: selectedConversation.studentName,
        studentEmail: selectedConversation.studentEmail,
        programId: selectedConversation.programId,
        programTitle: selectedConversation.programTitle,
        message: messageToSend,
        schoolId: schoolId, // Pass schoolId directly to avoid refetching
        userId: user?.id || null, // Pass userId from context to avoid refetching
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Message send timeout after 10 seconds')), 10000)
      })

      const apiCallStart = Date.now()
      const saved = await Promise.race([sendPromise, timeoutPromise])
      const apiCallDuration = Date.now() - apiCallStart
      
      console.log('✅ [handleSendMessage] API Response received', {
        duration: `${apiCallDuration}ms`,
        timestamp: new Date().toISOString(),
        response: saved,
        type: typeof saved,
        isArray: Array.isArray(saved),
        hasId: !!saved?.id,
        messageId: saved?.id,
        fullResponse: JSON.stringify(saved, null, 2)
      })

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

      console.log('✅ [handleSendMessage] Validation passed, preparing to update UI')
      console.log('📋 [handleSendMessage] Saved message object:', JSON.stringify(saved, null, 2))
      console.log('📊 [handleSendMessage] Current state:', {
        messagesCount: messages.length,
        messageIds: messages.map(m => m.id),
        timestamp: new Date().toISOString()
      })

      // Normalize message format to ensure it has all required fields
      const normalizedMessage = {
        ...saved,
        id: saved.id || saved.sender_id,
        message: saved.message || saved.text || messageToSend,
        sent_at: saved.sent_at || saved.sentAt || new Date().toISOString(),
        sender_type: saved.sender_type || 'school',
        student_id: saved.student_id || selectedConversation.studentId,
        program_id: saved.program_id || selectedConversation.programId,
      }

      console.log('🔄 [handleSendMessage] Normalized message:', {
        id: normalizedMessage.id,
        message: normalizedMessage.message?.substring(0, 50),
        sent_at: normalizedMessage.sent_at,
        sender_type: normalizedMessage.sender_type,
        student_id: normalizedMessage.student_id,
        program_id: normalizedMessage.program_id,
        fullMessage: JSON.stringify(normalizedMessage, null, 2)
      })

      // Add message to state FIRST, before marking as processed
      console.log('🔄 [handleSendMessage] Calling setMessages to update state...')
      setMessages((prev) => {
        console.log('📝 [setMessages] State update function called', {
          prevCount: prev.length,
          prevIds: prev.map(m => m.id),
          newMessageId: normalizedMessage.id,
          timestamp: new Date().toISOString()
        })
        
        // Use Map for efficient deduplication
        const messageMap = new Map(prev.map(m => [m.id, m]))
        
        console.log('🔍 [setMessages] Checking for duplicates:', {
          existingIds: Array.from(messageMap.keys()),
          newId: normalizedMessage.id,
          alreadyExists: messageMap.has(normalizedMessage.id),
          hasValidId: !!normalizedMessage?.id
        })
        
        // Always add the message if it has an ID (even if it exists, update it)
        if (normalizedMessage?.id) {
          console.log('➕ [setMessages] Adding/updating message in state')
          messageMap.set(normalizedMessage.id, normalizedMessage)
          const sorted = Array.from(messageMap.values()).sort((a, b) => {
            const dateA = new Date(a.sent_at || a.sentAt || 0)
            const dateB = new Date(b.sent_at || b.sentAt || 0)
            return dateA - dateB
          })
          
          // Update cache for current conversation
          if (selectedConversation?.conversationId) {
            messagesCacheRef.current.set(selectedConversation.conversationId, sorted)
          }
          
          console.log('✅ [setMessages] State update complete', {
            newCount: sorted.length,
            allIds: sorted.map(m => m.id),
            lastMessage: sorted[sorted.length - 1] ? {
              id: sorted[sorted.length - 1].id,
              message: sorted[sorted.length - 1].message?.substring(0, 50),
              sent_at: sorted[sorted.length - 1].sent_at
            } : null,
            timestamp: new Date().toISOString()
          })
          return sorted
        } else {
          console.error('❌ [setMessages] Message not added - missing ID!', normalizedMessage)
          return prev
        }
      })

      // Mark as processed AFTER adding to state (with a small delay to ensure state update)
      if (normalizedMessage?.id) {
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          processedMessageIdsRef.current.add(normalizedMessage.id)
        }, 100)
      }
      
      setError(null)
      console.log('📞 [handleSendMessage] Updating contact list...')
      upsertContactFromMessage(normalizedMessage)
      
      // Send via socket for real-time delivery (if not already sent by API)
      // The API route should notify the socket server, but we send here as backup
      console.log('🔌 [handleSendMessage] Sending via socket...', {
        messageId: normalizedMessage.id,
        studentId: normalizedMessage.student_id,
        timestamp: new Date().toISOString()
      })
      try {
        const socketPayload = {
          senderId: normalizedMessage.sender_id || normalizedMessage.senderId,
          senderType: normalizedMessage.sender_type || 'school',
          receiverId: normalizedMessage.receiver_id || normalizedMessage.receiverId,
          receiverType: normalizedMessage.receiver_type || 'student',
          message: normalizedMessage.message,
          schoolId: normalizedMessage.school_id || schoolId,
          studentId: normalizedMessage.student_id || selectedConversation.studentId,
          studentName: normalizedMessage.student_name || selectedConversation.studentName,
          studentEmail: normalizedMessage.student_email || selectedConversation.studentEmail,
          schoolName: normalizedMessage.school_name || normalizedMessage.schoolName,
          programId: normalizedMessage.program_id || selectedConversation.programId,
          programTitle: normalizedMessage.program_title || selectedConversation.programTitle,
        }
        console.log('📡 [handleSendMessage] Socket payload:', socketPayload)
        socketService.sendMessage(socketPayload)
        console.log('✅ [handleSendMessage] Socket message sent successfully')
      } catch (socketError) {
        console.warn('⚠️ [handleSendMessage] Socket send failed (non-critical):', socketError)
        // Don't fail the whole operation if socket fails
      }
      
      const totalDuration = Date.now() - startTime
      console.log('🎉 [handleSendMessage] COMPLETE', {
        totalDuration: `${totalDuration}ms`,
        messageId: normalizedMessage.id,
        timestamp: new Date().toISOString()
      })
      
      // Keep input focused and enabled after sending
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.disabled = false
          inputRef.current.readOnly = false
          inputRef.current.style.pointerEvents = 'auto'
          inputRef.current.style.cursor = 'text'
          inputRef.current.focus()
        }
      }, 100)
    } catch (error) {
      const errorDuration = Date.now() - startTime
      console.error('❌ [handleSendMessage] FAILED', {
        duration: `${errorDuration}ms`,
        timestamp: new Date().toISOString(),
        error: error
      })
      console.error('❌ [handleSendMessage] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error: error,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      })
      
      // Show error to user - make it visible
      let errorMessage = 'Unable to send message. Please try again.'
      if (error.message) {
        errorMessage = error.message
      } else if (error.error) {
        errorMessage = error.error
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
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
      
      // Keep input focused and enabled even on error
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.disabled = false
          inputRef.current.readOnly = false
          inputRef.current.style.pointerEvents = 'auto'
          inputRef.current.style.cursor = 'text'
          inputRef.current.focus()
        }
      }, 100)
    } finally {
      // Always reset sending state
      setIsSending(false)
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
                      if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                        e.preventDefault()
                        if (messageText.trim() && selectedConversation && !loadingMessages && !isSending) {
                          handleSendMessage(e)
                        }
                      }
                    }}
                    autoFocus
                    disabled={loadingMessages || isSending}
                    readOnly={loadingMessages || isSending}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: 15,
                      backgroundColor: 'transparent',
                      color: '#0f172a',
                      padding: '10px 0',
                      pointerEvents: (loadingMessages || isSending) ? 'none' : 'auto',
                      cursor: (loadingMessages || isSending) ? 'not-allowed' : 'text',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || loadingMessages || isSending}
                    onClick={(e) => {
                      // Backup handler in case form submission doesn't work
                      if (messageText.trim() && selectedConversation && !loadingMessages && !isSending) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                    style={{
                      backgroundColor: (messageText.trim() && !loadingMessages && !isSending) ? '#1e40af' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '10px 24px',
                      cursor: (messageText.trim() && !loadingMessages && !isSending) ? 'pointer' : 'not-allowed',
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'background-color 0.2s',
                      pointerEvents: (loadingMessages || isSending) ? 'none' : 'auto',
                      opacity: (messageText.trim() && !loadingMessages && !isSending) ? 1 : 0.6,
                    }}
                    onMouseEnter={(e) => {
                      if (messageText.trim() && !loadingMessages && !isSending) {
                        e.currentTarget.style.backgroundColor = '#1e3a8a'
                        e.currentTarget.style.opacity = '1'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (messageText.trim() && !loadingMessages && !isSending) {
                        e.currentTarget.style.backgroundColor = '#1e40af'
                        e.currentTarget.style.opacity = '1'
                      }
                    }}
                  >
                    {isSending ? 'Sending...' : 'Send'}
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
