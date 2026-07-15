import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket = null;
let authenticatedPromise = null;

export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_URL);

  authenticatedPromise = new Promise((resolve) => {
    socket.on('connect', () => {
      socket.emit('authenticate', { token: localStorage.getItem('token') });
    });
    socket.on('authenticated', () => resolve(socket));
  });

  return socket;
}

export function subscribeToBot(botId) {
  const activeSocket = getSocket();
  authenticatedPromise.then(() => {
    activeSocket.emit('subscribe:bot', botId);
  });
}
