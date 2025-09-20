import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:3001';
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function initializeSocket() {
  return getSocket();
}

export function subscribeToWorkOrderUpdates(callback: (data: any) => void) {
  const socket = getSocket();
  socket.on('work-order-updated', callback);
  socket.on('work-order-created', callback);
  socket.on('work-order-status-changed', callback);
  
  return () => {
    socket.off('work-order-updated', callback);
    socket.off('work-order-created', callback);
    socket.off('work-order-status-changed', callback);
  };
}

export function subscribeToApprovalUpdates(callback: (data: any) => void) {
  const socket = getSocket();
  socket.on('approval-requested', callback);
  socket.on('approval-approved', callback);
  socket.on('approval-rejected', callback);
  
  return () => {
    socket.off('approval-requested', callback);
    socket.off('approval-approved', callback);  
    socket.off('approval-rejected', callback);
  };
}

export function subscribeToNotifications(callback: (data: any) => void) {
  const socket = getSocket();
  socket.on('notification', callback);
  
  return () => {
    socket.off('notification', callback);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}