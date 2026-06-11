require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.json());

// Fail fast if required env vars are missing
if (!process.env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD env var is required');
if (!process.env.ROOM_USER || !process.env.ROOM_PASSWORD) throw new Error('ROOM_USER and ROOM_PASSWORD env vars are required');

const state = {
  isStreaming: false,
  adminSocketId: null,
  initChunk: null,
  recentChunks: [],        // max 60 chunks
  validAdminTokens: new Set(),
  validViewerTokens: new Set(),
  viewerNicknames: new Map(),
  viewerCount: 0,
};

const ADJECTIVES = ['Tigre','Rayo','Cobra','Furia','Tormenta','Llama','Puma','Condor','Aguila','Lobo'];
const NOUNS = ['Salvaje','Veloz','Oscuro','Feroz','Mistico','Estelar','Bravo','Libre','Eterno','Rugiente'];
function randomNickname() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}${Math.floor(Math.random() * 99) + 1}`;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// REST routes

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    const token = generateToken();
    state.validAdminTokens.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

app.post('/api/room/auth', (req, res) => {
  const { user, password } = req.body;
  if (user === process.env.ROOM_USER && password === process.env.ROOM_PASSWORD) {
    const token = generateToken();
    state.validViewerTokens.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Socket.io auth middleware
io.use((socket, next) => {
  const { token, role } = socket.handshake.auth;
  if (role === 'admin' && state.validAdminTokens.has(token)) return next();
  if (role === 'viewer' && state.validViewerTokens.has(token)) return next();
  next(new Error('unauthorized'));
});

// Socket.io connection handler
io.on('connection', (socket) => {
  const { role } = socket.handshake.auth;

  if (role === 'viewer') {
    // Join rooms
    socket.join('viewers');
    socket.join('room');

    // Assign nickname
    const nickname = randomNickname();
    state.viewerNicknames.set(socket.id, nickname);

    // Update count
    state.viewerCount++;
    io.to('room').emit('viewer:count', state.viewerCount);

    // Send current stream state if streaming
    if (state.isStreaming) {
      socket.emit('stream:start');
      if (state.initChunk) socket.emit('stream:chunk', state.initChunk);
      // Skip initChunk from recentChunks to avoid duplicate init segment
      state.recentChunks
        .filter(chunk => chunk !== state.initChunk)
        .forEach(chunk => socket.emit('stream:chunk', chunk));
    }
  }

  if (role === 'admin') {
    socket.join('room');
    state.adminSocketId = socket.id;
    socket.emit('stream:state', { isStreaming: state.isStreaming, viewerCount: state.viewerCount });
  }

  // --- Events ---

  socket.on('stream:start', () => {
    if (role !== 'admin') return;
    state.isStreaming = true;
    state.initChunk = null;
    state.recentChunks = [];
    io.to('viewers').emit('stream:start');
  });

  socket.on('stream:chunk', (chunk) => {
    if (role !== 'admin') return;
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (!state.initChunk) state.initChunk = buffer;
    state.recentChunks.push(buffer);
    if (state.recentChunks.length > 60) state.recentChunks.shift();
    io.to('viewers').emit('stream:chunk', buffer);
  });

  socket.on('stream:stop', () => {
    if (role !== 'admin') return;
    state.isStreaming = false;
    io.to('viewers').emit('stream:stop');
  });

  socket.on('chat:message', ({ text }) => {
    if (typeof text !== 'string' || text.trim().length === 0 || text.length > 300) return;
    const nickname = role === 'admin' ? 'Admin' : (state.viewerNicknames.get(socket.id) || 'Anónimo');
    io.to('room').emit('chat:message', { nickname, text: text.trim(), ts: Date.now() });
  });

  socket.on('disconnect', () => {
    if (role === 'viewer') {
      state.viewerNicknames.delete(socket.id);
      state.viewerCount = Math.max(0, state.viewerCount - 1);
      io.to('room').emit('viewer:count', state.viewerCount);
    }
    if (role === 'admin' && socket.id === state.adminSocketId) {
      state.adminSocketId = null;
      if (state.isStreaming) {
        state.isStreaming = false;
        io.to('viewers').emit('stream:stop');
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
