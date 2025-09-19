import { useEffect, useState, useContext, createContext } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
};

export const useSocketStatus = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketStatus must be used within a SocketProvider');
  }
  return {
    isConnected: context.isConnected,
    connectionError: context.connectionError
  };
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Get auth token from localStorage or cookies
    const getAuthToken = () => {
      return localStorage.getItem('token') || 
             document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
    };

    const token = getAuthToken();
    if (!token) {
      setConnectionError('No authentication token found');
      return;
    }

    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Authentication error
    socketInstance.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionError(error);
      setIsConnected(false);
    });

    // Reconnection events
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error.message);
      setConnectionError(`Reconnection failed: ${error.message}`);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    connectionError
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hooks for specific socket events
export const useSocketEvent = (event: string, handler: (data: any) => void) => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
};

export const useSocketEmit = () => {
  const socket = useSocket();

  return (event: string, data?: any) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };
};

// Real-time data hooks
export const useRealTimeWorkOrders = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for work order updates
    socket.on('work_order_updated', (data) => {
      setWorkOrders(prev => 
        prev.map(wo => 
          wo.id === data.workOrderId 
            ? { ...wo, ...data.update }
            : wo
        )
      );
    });

    socket.on('work_order_created', (workOrder) => {
      setWorkOrders(prev => [workOrder, ...prev]);
    });

    socket.on('work_order_deleted', (workOrderId) => {
      setWorkOrders(prev => prev.filter(wo => wo.id !== workOrderId));
    });

    return () => {
      socket.off('work_order_updated');
      socket.off('work_order_created');
      socket.off('work_order_deleted');
    };
  }, [socket]);

  return workOrders;
};

export const useRealTimeChat = (roomId: string) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join chat room
    socket.emit('join_room', roomId);

    // Listen for messages
    socket.on('chat_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    socket.on('user_typing', ({ userId, isTyping }) => {
      setIsTyping(isTyping);
    });

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('chat_message');
      socket.off('user_typing');
    };
  }, [socket, roomId]);

  const sendMessage = (message: string) => {
    if (socket && message.trim()) {
      socket.emit('send_message', {
        roomId,
        message: message.trim(),
        type: 'text'
      });
    }
  };

  const sendTypingIndicator = (typing: boolean) => {
    if (socket) {
      socket.emit('typing', { roomId, isTyping: typing });
    }
  };

  return {
    messages,
    isTyping,
    sendMessage,
    sendTypingIndicator
  };
};

export const useUserPresence = () => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('user_status_change', ({ userId, status }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status === 'online') {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    });

    return () => {
      socket.off('user_status_change');
    };
  }, [socket]);

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline: (userId: string) => onlineUsers.has(userId)
  };
};

export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on('notification_marked_read', ({ notificationId }) => {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    socket.on('unread_count', ({ count }) => {
      setUnreadCount(count);
    });

    // Request initial data
    socket.emit('get_unread_count');

    return () => {
      socket.off('notification');
      socket.off('notification_marked_read');
      socket.off('unread_count');
    };
  }, [socket]);

  const markAsRead = (notificationId: string) => {
    if (socket) {
      socket.emit('mark_notification_read', notificationId);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead
  };
};