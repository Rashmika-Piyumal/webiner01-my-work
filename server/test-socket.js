const { io } = require('socket.io-client');

const token = process.argv[2];
const botId = process.argv[3];

if (!token || !botId) {
  console.error('Usage: node test-socket.js <token> <botId>');
  process.exit(1);
}

const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('authenticate', { token });
});

socket.on('authenticated', () => {
  console.log('authenticated');
  socket.emit('subscribe:bot', botId);
});

socket.on('subscribed', (data) => {
  console.log('subscribed', data);
});

socket.on('auth:error', (data) => {
  console.log('auth:error', data);
});

socket.on('conversation:new', (data) => {
  console.log('conversation:new', JSON.stringify(data));
});

socket.on('message:new', (data) => {
  console.log('message:new', JSON.stringify(data));
});

socket.on('lead:new', (data) => {
  console.log('lead:new', JSON.stringify(data));
});

socket.on('disconnect', () => {
  console.log('disconnected');
});
