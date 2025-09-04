const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getIO } = require('../middleware/socket');
const { encrypt, decrypt } = require('../routes/encrypt');

exports.getChatUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 3) {
      return res.json([]); // return empty if less than 3 chars
    }

    const users = await User.find({
      name: { $regex: q, $options: 'i' }, // case-insensitive match
      sts: 1,
      dltSts: { $ne: 1 }
    })
      .limit(5)
      .select('uId name avtr ph loc')
      .lean(); // Add `.lean()` to get plain JS objects

    const result = users.map(u => ({
      ...u,
      ph: decrypt(u.ph) || ''
    }));

    return res.json(result); // ✅ send decrypted data
  } catch (error) {
    console.error('Error in getChatUsers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.addOrGetChat = async (req, res) => {
  console.log("🔥 /add-or-get-chat hit");
  console.log("📥 Request body:", req.body);
  console.log("👤 Initiator:", req.user.uid);
  try {
    const initiatorId = req.user.uid;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Missing user or user ID' });
    }

    let chat = await Chat.findOne({
      cht_usr: { $all: [initiatorId, userId], $size: 2 }
    });

    if (!chat) {
      chat = await Chat.create({
        cht_usr: [initiatorId, userId],
        cht_cru: initiatorId,
        cht_cri: req.ip
      });
    }

    // Get user info using uId
    const userInfo = await User.findOne({ uId: userId }).select('name ph loc uId').lean();

    if (!userInfo) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: chat._id,
      participants: chat.cht_usr,
      user: userInfo || null
    });
  } catch (error) {
    console.error('Error in addOrGetChat:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.uid;
    const chatId = req.params.chatId;
    
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Get messages before marking as read
    const messages = chat.cht_msg
      .filter(msg => msg.msg_sts !== 0)
      .map(msg => ({
        ...msg.toObject(),
        isCurrentUser: msg.msg_sid === userId
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Mark all unread messages as read
    const unreadMessages = chat.cht_msg.filter(msg => 
      msg.msg_rid === userId && msg.msg_sts === 1
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        msg.msg_sts = 2;
        msg.updatedAt = new Date();
      });

      await chat.save();

      // Emit update
      const io = getIO();
      io.to(chatId).emit('messages-read', {
        chatId,
        readerId: userId,
        unreadCount: 0
      });
    }

    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// Get user's chat list
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const chats = await Chat.find({
      cht_usr: userId
    })
      .sort({ updatedAt: -1 })
      .limit(5);

    const formattedChats = await Promise.all(chats.map(async (chat) => {
      try {
        const otherUserId = chat.cht_usr.find(id => id.toString() !== userId.toString());
        const otherUser = await User.findOne({ uId: otherUserId }).select('name ph loc uId').lean();

        if (!otherUser) {
          console.warn(`Participant ${otherUserId} not found for chat ${chat._id}`);
          return null;
        }

        // Get last non-deleted message
        const lastMessage = chat.cht_msg
          .filter(msg => msg.sts !== 0)
          .slice(-1)[0]; // Get last element


            // Calculate unread messages for this user
    const unreadCount = chat.cht_msg.filter(msg => 
      msg.msg_rid === userId && msg.msg_sts === 1
    ).length;

        return {
          chatId: chat._id,
          name: otherUser.name,
          userId: otherUser.uId, // Use uId here
          ph: otherUser.ph,
          lastMessage: lastMessage?.msg_cnt || '',
          lastMessageTime: lastMessage?.msg_crt || chat.cht_crt,
      unreadCount
        };
      } catch (e) {
        console.error(`Error formatting chat ${chat._id}:`, e);
        return null;
      }
    }));

    res.json(formattedChats.filter(chat => chat !== null));
  } catch (err) {
    console.error('Error getting user chats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update your sendMessage controller to update chat timestamp
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const userId = req.user.uid;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Find receiver ID (the other participant)
    const receiverId = chat.cht_usr.find(uid => uid.toString() !== userId.toString());
    if (!receiverId) {
      return res.status(400).json({ message: 'Could not determine message recipient' });
    }

    const newMsg = {
      _id: new mongoose.Types.ObjectId(),
      msg_sid: userId,
      msg_rid: receiverId,
      msg_cnt: content,
      // isSender: true, // This indicates the message was sent by the current user
       msg_sts: 1, // 1 = unread status
      msg_cru: userId,
      msg_cri: req.ip,
      createdAt: new Date(),
      updatedAt: new Date(),
      sts: 1,
      deleted: false
    };

    if (!chat.cht_msg) {
      chat.cht_msg = [];
    }

    chat.cht_msg.push(newMsg);
    chat.updatedAt = new Date();
    await chat.save();

    const io = getIO();

    const savedMessage = chat.cht_msg[chat.cht_msg.length - 1];
    const messageData = {
      chatId,
      _id: savedMessage._id,
      content: savedMessage.msg_cnt,
      senderId: savedMessage.msg_sid,
      receiverId: savedMessage.msg_rid,
      createdAt: savedMessage.createdAt,
      status: savedMessage.msg_sts,
      msg_sts: savedMessage.msg_sts, // Include status
      isCurrentUser: false
    };

     // Emit to both participants separately with appropriate flags
    io.to(userId.toString()).emit('new-message-sender', {
      ...messageData,
      isCurrentUser: true
    });
    
    io.to(receiverId.toString()).emit('new-message-receiver', {
      ...messageData,
      isCurrentUser: false,
        status: 1
    });

    // Also emit to the chat room for any other potential listeners
    io.to(chatId).emit('new-message', messageData);
    
    // Return the message with isSender=true for the sender
    return res.status(200).json({
      ...savedMessage.toObject(),
      isCurrentUser: true
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteMessages = async (req, res) => {
  try {
    const { chatId, messageIds } = req.body;
    const userId = req.user.uid;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Update messages - set msg_sts to 0 for selected messages
    chat.cht_msg = chat.cht_msg.map(msg => {
      if (messageIds.includes(msg._id.toString())) {
        return {
          ...msg.toObject(),
          msg_sts: 0, // Update status to 0
          deleted: true,
          deletedBy: userId,
          deletedAt: new Date()
        };
      }
      return msg;
    });

    await chat.save();

    // Return success response with updated messages
    const updatedMessages = chat.cht_msg.filter(msg => msg.msg_sts !== 0);
    res.json({
      success: true,
      messages: updatedMessages
    });
  } catch (err) {
    console.error('Delete messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { chatId, messageIds } = req.body; // Accept specific message IDs
    const userId = req.user.uid;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // If no specific message IDs provided, mark all unread messages as read
    const messagesToUpdate = messageIds 
      ? chat.cht_msg.filter(msg => messageIds.includes(msg._id.toString()))
      : chat.cht_msg.filter(msg => msg.msg_rid === userId && msg.msg_sts === 1);

    // Update messages
    messagesToUpdate.forEach(msg => {
      msg.msg_sts = 2; // Mark as read
      msg.updatedAt = new Date();
    });

    await chat.save();

    // Calculate new unread count for this chat
    const unreadCount = chat.cht_msg.filter(msg => 
      msg.msg_rid === userId && msg.msg_sts === 1
    ).length;

    // Emit update to both participants
    const io = getIO();
    io.to(chatId).emit('messages-read', { 
      chatId, 
      readerId: userId,
      unreadCount 
    });

    res.json({ 
      success: true,
      unreadCount
    });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ message: 'Server error' });
  }
};