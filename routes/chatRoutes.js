const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/verifyToken');

router.get('/chat-users', verifyToken, chatController.getChatUsers);
router.post('/add-or-get-chat', verifyToken, chatController.addOrGetChat);
router.get('/messages/:chatId', verifyToken, chatController.getMessages);
router.post('/send-message', verifyToken, chatController.sendMessage);
router.get('/chats', verifyToken, chatController.getUserChats);
router.post('/delete-messages', verifyToken, chatController.deleteMessages);


module.exports = router;
