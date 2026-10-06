import { io } from 'socket.io-client';

let socket;
let subscriberCount = 0;

function socketOrigin() {
  const apiBase = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  return new URL(apiBase, window.location.origin).origin;
}

function getSocket() {
  if (!socket) {
    socket = io(`${socketOrigin()}/notifications`, {
      path: '/api/v1/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

export function subscribeToRealtimeNotifications(listener) {
  const client = getSocket();
  subscriberCount += 1;
  client.on('notification.created', listener);
  if (!client.connected) client.connect();

  return () => {
    client.off('notification.created', listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) client.disconnect();
  };
}
