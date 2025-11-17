const express = require('express');
const router = express.Router();
const { getUsers, sendMessage, getMessages, logout } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/users', authMiddleware, getUsers);
router.post('/send', authMiddleware, sendMessage);
router.get('/:chatWith', authMiddleware, getMessages);
router.post('/logout', authMiddleware, logout);

module.exports = router;
