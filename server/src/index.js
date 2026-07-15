require('dotenv').config();

const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bots');
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const leadRoutes = require('./routes/leads');
const { setupSocket } = require('./socket');

const app = express();
const PORT = process.env.PORT || 4000;

connectDB();

const publicPathPrefixes = ['/api/chat', '/api/bots/public'];

app.use((req, res, next) => {
  const isPublicPath = publicPathPrefixes.some((prefix) => req.path.startsWith(prefix));
  return cors({ origin: isPublicPath ? '*' : process.env.CLIENT_URL })(req, res, next);
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server scaffold running');
});

app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', conversationRoutes);
app.use('/api', leadRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL } });
setupSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
