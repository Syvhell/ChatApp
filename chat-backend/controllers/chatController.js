const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Send a message
const sendMessage = async (req, res) => {
  const { receiverId, text, type, mediaUrls, replyTo } = req.body;

  if (!receiverId || (!text && (!mediaUrls || mediaUrls.length === 0))) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!mongoose.Types.ObjectId.isValid(req.user.id) || !mongoose.Types.ObjectId.isValid(receiverId)) {
    return res.status(400).json({ message: 'Invalid sender or receiver ID' });
  }

  if (replyTo && !mongoose.Types.ObjectId.isValid(replyTo)) {
    return res.status(400).json({ message: 'Invalid replyTo ID' });
  }

  try {
    const message = new Message({
      sender: req.user.id,
      receiver: receiverId,
      text: text || '',
      type: type || 'text',
      mediaUrls: mediaUrls || [],
      replyTo: replyTo || null,
    });

    await message.save();

    // Correct population: use Message.findById
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .populate({
        path: 'replyTo',
        select: 'text type sender',
        populate: { path: 'sender', select: 'username avatar' },
      });

    res.status(201).json({ message: populatedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get messages with a specific user
const getMessages = async (req, res) => {
  const { chatWith } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatWith)) {
    return res.status(400).json({ message: 'Invalid chatWith ID' });
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: chatWith },
        { sender: chatWith, receiver: req.user.id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .populate({
        path: 'replyTo',
        select: 'text type sender',
        populate: { path: 'sender', select: 'username avatar' },
      });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get chat users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('username avatar active').lean();

    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMsg = await Message.findOne({
          $or: [
            { sender: req.user.id, receiver: user._id },
            { sender: user._id, receiver: req.user.id },
          ],
        }).sort({ createdAt: -1 }).lean();

        return {
          id: user._id.toString(),
          username: user.username,
          avatar: user.avatar || '',
          active: user.active,
          lastMessage: lastMsg ? lastMsg.text : 'No messages yet',
        };
      })
    );

    res.json({ users: usersWithLastMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Logout
const logout = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.active = false;
    await user.save();
  }
  res.json({ message: 'Logged out successfully' });
};

module.exports = { sendMessage, getMessages, getUsers, logout };
