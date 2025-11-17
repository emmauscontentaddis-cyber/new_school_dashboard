import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.activeRoom = null
  }

  connect({ schoolId, studentId } = {}) {
    if (this.socket) {
      this.disconnect()
    }

    const chatServerUrl = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001'

    this.socket = io(chatServerUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      autoConnect: true,
    })

    this.socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO server:', this.socket.id)
      this.isConnected = true

      if (schoolId) {
        this.joinSchoolChannel(schoolId)
      }

      if (studentId) {
        this.joinStudentChannel(studentId)
      }
    })

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.IO server')
      this.isConnected = false
      this.activeRoom = null
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error)
      this.isConnected = false
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      console.log('🔌 Socket disconnected manually')
    }
  }

  joinConversationRoom(schoolId, studentId) {
    if (!this.socket || !this.isConnected) return
    const roomId = `${schoolId}-${studentId}`
    this.socket.emit('join-room', roomId)
    this.activeRoom = roomId
    console.log('📨 Joined chat room:', roomId)
  }

  leaveConversationRoom(roomId = this.activeRoom) {
    if (this.socket && roomId) {
      this.socket.emit('leave-room', roomId)
      if (this.activeRoom === roomId) {
        this.activeRoom = null
      }
      console.log('📨 Left chat room:', roomId)
    }
  }

  joinSchoolChannel(schoolId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-school', schoolId)
      console.log('🏫 Listening for school updates:', schoolId)
    }
  }

  joinStudentChannel(studentId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-student', studentId)
      console.log('🎓 Listening for student updates:', studentId)
    }
  }

  sendMessage(messageData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send-message', messageData)
    } else {
      console.warn('Socket not connected. Message not sent via socket.')
    }
  }

  markRead(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark-read', data)
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new-message', callback)
    }
  }

  onNewStudentMessage(callback) {
    if (this.socket) {
      this.socket.on('new-student-message', callback)
    }
  }

  onNewReply(callback) {
    if (this.socket) {
      this.socket.on('new-reply', callback)
    }
  }

  offNewMessage(callback) {
    if (this.socket) {
      this.socket.off('new-message', callback)
    }
  }

  offNewStudentMessage(callback) {
    if (this.socket) {
      this.socket.off('new-student-message', callback)
    }
  }

  offNewReply(callback) {
    if (this.socket) {
      this.socket.off('new-reply', callback)
    }
  }

  // Check connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      activeRoom: this.activeRoom,
    }
  }
}

// Create singleton instance
const socketService = new SocketService()

export default socketService






