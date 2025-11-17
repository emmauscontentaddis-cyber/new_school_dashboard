require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

// Initialize Supabase client
// Try to use Next.js env vars first, then fallback to direct env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
  console.error('You can use NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3020', 'http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Store active rooms: roomId -> Set of socketIds
const activeRooms = new Map();

const sanitizeId = (value, label) => {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${label}`);
  }
  return value.trim();
};

// Helper function to generate deterministic room ID
function getRoomId(rawSchoolId, rawStudentId) {
  const schoolId = sanitizeId(rawSchoolId, 'schoolId');
  const studentId = sanitizeId(rawStudentId, 'studentId');
  return `${schoolId}-${studentId}`;
}

async function buildMessagePayload(payload) {
  const {
    senderId,
    senderType,
    receiverId,
    receiverType,
    message,
    schoolId,
    studentId,
    studentName,
    studentEmail,
    schoolName,
    programId,
    programTitle,
  } = payload;

  if (!senderId || !receiverId) {
    throw new Error('senderId and receiverId are required');
  }

  if (!senderType || !['student', 'school'].includes(senderType)) {
    throw new Error('senderType must be "student" or "school"');
  }

  if (!receiverType || !['student', 'school'].includes(receiverType)) {
    throw new Error('receiverType must be "student" or "school"');
  }

  if (!message?.trim()) {
    throw new Error('message text is required');
  }

  const school = sanitizeId(schoolId, 'schoolId');
  const roomId = getRoomId(schoolId, studentId);
  const timestamp = new Date().toISOString();

  // Fetch school name from database if not provided
  let resolvedSchoolName = schoolName;
  if (!resolvedSchoolName) {
    const { data: schoolRecord } = await supabase
      .from('schools')
      .select('name')
      .eq('id', school)
      .maybeSingle();
    
    resolvedSchoolName = schoolRecord?.name || 'School';
  }

  return {
    row: {
      sender_id: senderId,
      sender_type: senderType,
      receiver_id: receiverId,
      receiver_type: receiverType,
      message: message.trim(),
      school_id: school,
      school_name: resolvedSchoolName,
      student_id: sanitizeId(studentId, 'studentId'),
      student_name: studentName || null,
      student_email: studentEmail || null,
      program_id: programId || null,
      program_title: programTitle || null,
      room_id: roomId,
      sent_at: timestamp,
      is_read: false,
      message_type: senderType === 'school' ? 'school_reply' : 'general',
    },
    roomId,
  };
}

// REST API endpoint: Send message
app.post('/api/messages', async (req, res) => {
  try {
    const { row, roomId } = await buildMessagePayload(req.body);

    const { data, error } = await supabase
      .from('student_messages')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error inserting message:', error);
      return res.status(500).json({ error: 'Failed to save message', details: error.message });
    }

    io.to(roomId).emit('new-message', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

// REST API endpoint: Get chat history
app.get('/api/messages', async (req, res) => {
  try {
    const { studentId, schoolId } = req.query;

    if (!studentId || !schoolId) {
      return res.status(400).json({ error: 'studentId and schoolId are required' });
    }

    const roomId = getRoomId(schoolId, studentId);

    const { data, error } = await supabase
      .from('student_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a chat room
  socket.on('join-room', async (roomId) => {
    try {
      socket.join(roomId);
      
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set());
      }
      activeRooms.get(roomId).add(socket.id);

      console.log(`Socket ${socket.id} joined room: ${roomId}`);
      socket.emit('joined-room', { roomId });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave a chat room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId).delete(socket.id);
      if (activeRooms.get(roomId).size === 0) {
        activeRooms.delete(roomId);
      }
    }
    console.log(`Socket ${socket.id} left room: ${roomId}`);
  });

  // Send a message
  socket.on('join-student', (studentId) => {
    if (!studentId) return;
    socket.join(`student-${studentId}`);
  });

  socket.on('join-school', (schoolId) => {
    if (!schoolId) return;
    socket.join(`school-${schoolId}`);
  });

  socket.on('send-message', async (messageData) => {
    try {
      const { row, roomId } = await buildMessagePayload(messageData);

      const { data, error } = await supabase
        .from('student_messages')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('Error inserting message:', error);
        socket.emit('error', { message: 'Failed to save message', details: error.message });
        return;
      }

      io.to(roomId).emit('new-message', data);

      // Notify direct school/student rooms for dashboard counters, etc.
      if (row.sender_type === 'student') {
        io.to(`school-${row.school_id}`).emit('new-student-message', data);
      } else {
        io.to(`student-${row.student_id}`).emit('new-reply', data);
      }
    } catch (error) {
      console.error('Error in send-message:', error);
      socket.emit('error', { message: error.message || 'Internal server error' });
    }
  });

  // Mark messages as read
  socket.on('mark-read', async (data) => {
    try {
      const { roomId, receiverId, receiverType } = data;

      if (!roomId || !receiverId || !receiverType) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Update unread messages in the room
      const { error } = await supabase
        .from('student_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .eq('receiver_id', receiverId)
        .eq('receiver_type', receiverType)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
        return;
      }

      // Notify room participants
      io.to(roomId).emit('messages-read', { roomId, receiverId, receiverType });
    } catch (error) {
      console.error('Error in mark-read:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove socket from all rooms
    activeRooms.forEach((sockets, roomId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        activeRooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});






