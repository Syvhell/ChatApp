require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const authMiddleware = require('./middleware/authMiddleware');

// Connect DB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Public
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/chat', authMiddleware, chatRoutes);

// --- SOCKET.IO REALTIME LOGIC ---
io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId); // each user has room
  });

  socket.on("sendMessage", (msg) => {
    io.to(msg.receiverId).emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Start
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
