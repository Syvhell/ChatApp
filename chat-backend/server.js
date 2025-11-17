require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const authMiddleware = require('./middleware/authMiddleware');
const mongoose = require('mongoose');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

const onlineUsers = new Map(); // userId -> socket.id

// Connect DB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  // join chat (user sends userId)
  socket.on('join', (userId) => {
    socket.userId = userId.toString();
    socket.join(userId.toString());
    onlineUsers.set(userId.toString(), socket.id);

    // Notify all users except sender
    socket.broadcast.emit('onlineStatus', { userId: userId.toString(), online: true });

    // Send current online users to this client
    for (let [id] of onlineUsers.entries()) {
      if (id !== userId.toString()) {
        socket.emit('onlineStatus', { userId: id, online: true });
      }
    }
  });

  // Typing indicator
  socket.on('typing', ({ chatId, typing }) => {
    const receiverSocketId = onlineUsers.get(chatId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { userId: socket.userId, typing });
    }
  });

  // Sending messages
  socket.on('sendMessage', (msg) => {
    const receiverSocketId = onlineUsers.get(msg.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receiveMessage', msg);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit('onlineStatus', { userId: socket.userId, online: false });
    }
    console.log('User disconnected', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
