'use client'

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react'

import {
  getMessagesGroupedByStudent,
  getStudentMessages,
  sendReply as sendReplyService,
} from '@/services/chat'

const initialState = {
  contacts: [],
  selectedContact: null,
  messages: [],
  loading: true,
  sendingMessage: false,
  error: null,
  pendingReplies: [],
}

const CHAT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_SENDING: 'SET_SENDING',
  SET_ERROR: 'SET_ERROR',
  SET_CONTACTS: 'SET_CONTACTS',
  SET_SELECTED_CONTACT: 'SET_SELECTED_CONTACT',
  SET_MESSAGES: 'SET_MESSAGES',
  CLEAR_SELECTED: 'CLEAR_SELECTED',
  UPDATE_CONTACT: 'UPDATE_CONTACT',
  ADD_OPTIMISTIC_REPLY: 'ADD_OPTIMISTIC_REPLY',
  REMOVE_OPTIMISTIC_REPLY: 'REMOVE_OPTIMISTIC_REPLY',
}

function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }

    case CHAT_ACTIONS.SET_SENDING:
      return { ...state, sendingMessage: action.payload }

    case CHAT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload }

    case CHAT_ACTIONS.SET_CONTACTS:
      return { ...state, contacts: action.payload }

    case CHAT_ACTIONS.SET_SELECTED_CONTACT:
      return { ...state, selectedContact: action.payload }

    case CHAT_ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload }

    case CHAT_ACTIONS.CLEAR_SELECTED:
      return { ...state, selectedContact: null, messages: [] }

    case CHAT_ACTIONS.UPDATE_CONTACT:
      return {
        ...state,
        selectedContact: action.payload.contact,
        messages: action.payload.messages || state.messages,
      }

    case CHAT_ACTIONS.ADD_OPTIMISTIC_REPLY:
      const { messageId: optMessageId, replyText: optReplyText, tempReplyId } = action.payload
      
      // Check if optimistic message already exists to avoid duplicates
      const existingOptimistic = state.messages.find(
        m => m.isOptimistic && m.parentMessageId === optMessageId
      )
      if (existingOptimistic) {
        return state // Don't add duplicate
      }
      
      const newReply = {
        id: tempReplyId || `temp_${optMessageId}_${Date.now()}`,
        text: optReplyText,
        sender: 'school',
        timestamp: new Date().toISOString(),
        fullTimestamp: Date.now(),
        messageType: 'reply',
        status: 'sending',
        isOptimistic: true,
        parentMessageId: optMessageId,
      }
      
      // Create new array with the optimistic message added and sorted
      const updatedMessages = [...state.messages, newReply].sort((a, b) => {
        const timeA = a.fullTimestamp || new Date(a.timestamp).getTime()
        const timeB = b.fullTimestamp || new Date(b.timestamp).getTime()
        return timeA - timeB
      })
      
      return {
        ...state,
        messages: updatedMessages,
        pendingReplies: state.pendingReplies.includes(tempReplyId || optMessageId)
          ? state.pendingReplies
          : [...state.pendingReplies, tempReplyId || optMessageId],
      }

    case CHAT_ACTIONS.REMOVE_OPTIMISTIC_REPLY:
      const { messageId: removeMessageId, realMessageId, realMessage } = action.payload
      const cleanedMessages = state.messages.filter(msg => {
        // Remove optimistic messages that match
        if (msg.isOptimistic && (msg.id === removeMessageId || msg.parentMessageId === removeMessageId)) {
          return false
        }
        return true
      })
      
      // Add the real message if provided
      if (realMessage) {
        cleanedMessages.push({
          ...realMessage,
          id: realMessageId || realMessage.id,
          isOptimistic: false,
          status: 'sent',
        })
        // Sort by timestamp
        cleanedMessages.sort((a, b) => {
          const timeA = a.fullTimestamp || new Date(a.timestamp).getTime()
          const timeB = b.fullTimestamp || new Date(b.timestamp).getTime()
          return timeA - timeB
        })
      }
      
      const newPendingReplies = state.pendingReplies.filter(id => id !== removeMessageId)
      
      return {
        ...state,
        messages: cleanedMessages,
        pendingReplies: newPendingReplies,
      }

    default:
      return state
  }
}

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const pendingFetchRef = useRef(null)

  const fetchWithTimeout = async (promiseFn, timeoutMs = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const result = await promiseFn(controller.signal)
      return result
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  const fetchConversations = useCallback(async (silent = false) => {
    if (pendingFetchRef.current) return pendingFetchRef.current

    if (!silent) {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true })
      dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: null })
    }

    const promise = fetchWithTimeout(async (signal) => {
      const contacts = await getMessagesGroupedByStudent({ signal, cache: 'default' })
      dispatch({ type: CHAT_ACTIONS.SET_CONTACTS, payload: contacts || [] })

      const { selectedContact, messages } = stateRef.current

      if (selectedContact) {
        const updated = contacts.find((c) => c.id === selectedContact.id)
        if (updated) {
          dispatch({
            type: CHAT_ACTIONS.UPDATE_CONTACT,
            payload: { contact: updated, messages },
          })
        }
      }

      if (!silent) dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false })
      return contacts
    })

    pendingFetchRef.current = promise

    try {
      return await promise
    } finally {
      pendingFetchRef.current = null
    }
  }, [])

  const selectConversation = useCallback(async (contactId, silent = false) => {
    const contacts = stateRef.current.contacts
    const contact = contacts.find((c) => c.id === contactId)

    if (!contact) {
      dispatch({ type: CHAT_ACTIONS.CLEAR_SELECTED })
      return
    }

    dispatch({ type: CHAT_ACTIONS.SET_SELECTED_CONTACT, payload: contact })

    if (!silent) {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true })
      dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: null })
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)
      
      const messages = await getStudentMessages(
        contact.studentId, 
        contact.programId,
        { signal: controller.signal, cache: 'default' }
      )
      
      clearTimeout(timeoutId)
      
      // When refreshing silently (after sending), merge with existing optimistic messages
      if (silent) {
        const currentState = stateRef.current
        const optimisticMessages = currentState.messages.filter(m => m.isOptimistic)
        const allMessages = [...(messages || []), ...optimisticMessages]
        
        // Remove duplicates and sort
        const uniqueMessages = Array.from(
          new Map(allMessages.map(msg => [msg.id, msg])).values()
        )
        uniqueMessages.sort((a, b) => {
          const timeA = a.fullTimestamp || new Date(a.timestamp).getTime()
          const timeB = b.fullTimestamp || new Date(b.timestamp).getTime()
          return timeA - timeB
        })
        
        dispatch({ type: CHAT_ACTIONS.SET_MESSAGES, payload: uniqueMessages })
      } else {
        dispatch({ type: CHAT_ACTIONS.SET_MESSAGES, payload: messages || [] })
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
      dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: err.message })
    }

    dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false })
  }, [])

  const sendReply = useCallback(async (messageId, replyText) => {
    if (!replyText.trim()) return

    const currentState = stateRef.current
    if (currentState.sendingMessage) {
      console.log('Already sending a message, please wait...')
    }

    dispatch({ type: CHAT_ACTIONS.SET_SENDING, payload: true })
    dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: null })

    const tempReplyId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Add optimistic message immediately
    dispatch({
      type: CHAT_ACTIONS.ADD_OPTIMISTIC_REPLY,
      payload: { messageId, replyText: replyText.trim(), tempReplyId },
    })
    
    // Force a small delay to ensure state update is processed
    await new Promise(resolve => setTimeout(resolve, 0))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)
      
      const reply = await sendReplyService(messageId, replyText.trim(), {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      // Convert the reply to the message format
      const realMessage = reply ? {
        id: reply.id,
        text: reply.message,
        sender: 'school',
        timestamp: reply.sent_at || new Date().toISOString(),
        fullTimestamp: new Date(reply.sent_at || Date.now()).getTime(),
        messageType: 'reply',
        status: 'sent',
      } : null

      dispatch({
        type: CHAT_ACTIONS.REMOVE_OPTIMISTIC_REPLY,
        payload: { 
          messageId: tempReplyId, 
          realMessageId: reply?.id,
          realMessage: realMessage
        },
      })

      // Refresh conversations in background
      fetchConversations(true).catch(err => {
        console.error('Background refresh failed:', err)
      })
      
      // Note: We don't need to refresh messages here because we've already added the real message
      // The background refresh will update it if needed

      return reply
    } catch (err) {
      const tempReply = stateRef.current.messages.find(
        m => m.isOptimistic && m.parentMessageId === messageId
      )
      if (tempReply) {
        dispatch({
          type: CHAT_ACTIONS.REMOVE_OPTIMISTIC_REPLY,
          payload: { messageId: tempReply.id },
        })
        const errorMessages = stateRef.current.messages.filter(m => m.id !== tempReply.id)
        dispatch({ type: CHAT_ACTIONS.SET_MESSAGES, payload: errorMessages })
      }
      
      dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: err.message })
      throw err
    } finally {
      dispatch({ type: CHAT_ACTIONS.SET_SENDING, payload: false })
    }
  }, [fetchConversations, selectConversation])

  const clearSelected = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_SELECTED })
  }, [])

  // Auto-refresh messages for selected conversation
  useEffect(() => {
    const handleRefresh = () => {
      const { selectedContact } = stateRef.current
      if (selectedContact) {
        selectConversation(selectedContact.id, true).catch(err => {
          console.error('Auto-refresh failed:', err)
        })
      }
    }

    window.addEventListener('refresh-messages', handleRefresh)
    return () => {
      window.removeEventListener('refresh-messages', handleRefresh)
    }
  }, [selectConversation])

  const value = useMemo(
    () => ({
      ...state,
      fetchConversations,
      selectConversation,
      sendReply,
      clearSelected,
    }),
    [state, fetchConversations, selectConversation, sendReply, clearSelected]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used inside ChatProvider')
  return context
}

