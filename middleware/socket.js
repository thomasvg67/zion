// socket.js
const { Server } = require("socket.io");

let io;

function initSocket(server) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.on('connection', socket => {
    console.log('Socket connected:', socket.id);

    socket.on('join-user-room', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their personal room`);
    });


    socket.on('join-chat', chatId => {
      socket.join(chatId);
      console.log(`🔗 Socket ${socket.id} joined chat room: ${chatId}`);
    });

    socket.on('send-message', msg => {
      io.to(msg.chatId).emit('new-message', msg);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

module.exports = {
  initSocket,
  getIO,
};
