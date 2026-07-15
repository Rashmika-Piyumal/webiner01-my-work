const jwt = require('jsonwebtoken');
const Bot = require('../models/Bot');

let ioInstance = null;

function setupSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('authenticate', ({ token }) => {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = payload.userId;
        socket.emit('authenticated');
      } catch (err) {
        socket.emit('auth:error', { error: 'Invalid or expired token' });
        socket.disconnect();
      }
    });

    socket.on('subscribe:bot', async (botId) => {
      try {
        if (!socket.userId) {
          return socket.emit('auth:error', { error: 'Not authenticated' });
        }

        const bot = await Bot.findOne({ _id: botId, userId: socket.userId });
        if (!bot) {
          return socket.emit('auth:error', { error: 'Bot not found' });
        }

        socket.join(`bot:${botId}`);
        socket.emit('subscribed', { botId });
      } catch (err) {
        socket.emit('auth:error', { error: 'Failed to subscribe' });
      }
    });
  });
}

function getIo() {
  return ioInstance;
}

module.exports = { setupSocket, getIo };
