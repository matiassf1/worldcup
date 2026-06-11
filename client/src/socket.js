import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token, role) {
  if (socket) socket.disconnect();
  socket = io({ auth: { token, role }, autoConnect: false, transports: ['websocket'] });
  socket.connect();
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
