const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Redis = require('redis');

class FixzitSocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Redis client for scaling across multiple servers
    this.redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.connectedUsers = new Map(); // userId -> socket mapping
    this.userRooms = new Map(); // userId -> rooms array
    
    this.setupMiddleware();
    this.setupEventHandlers();
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      await this.redisClient.connect();
      console.log('✅ Redis connected for Socket.IO scaling');
    } catch (error) {
      console.log('⚠️ Redis not available, using in-memory storage');
    }
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await this.getUserById(decoded.userId);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        socket.organizationId = user.organizationId;
        socket.permissions = user.permissions || [];
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.userId} connected`);
      
      this.handleUserConnection(socket);
      this.setupUserEventHandlers(socket);
    });
  }

  handleUserConnection(socket) {
    const userId = socket.userId;
    
    // Store user connection
    this.connectedUsers.set(userId, socket);
    
    // Join user to their personal room
    socket.join(`user:${userId}`);
    
    // Join organization room
    if (socket.organizationId) {
      socket.join(`org:${socket.organizationId}`);
    }
    
    // Join role-based rooms
    socket.join(`role:${socket.userRole}`);
    
    // Join department rooms based on permissions
    this.joinDepartmentRooms(socket);
    
    // Send user online status
    this.broadcastUserStatus(userId, 'online');
    
    // Send pending notifications
    this.sendPendingNotifications(socket);
  }

  setupUserEventHandlers(socket) {
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User ${socket.userId} disconnected`);
      this.connectedUsers.delete(socket.userId);
      this.broadcastUserStatus(socket.userId, 'offline');
    });

    // Join specific rooms (e.g., property, work order)
    socket.on('join_room', (roomId) => {
      if (this.canJoinRoom(socket, roomId)) {
        socket.join(roomId);
        socket.emit('room_joined', { roomId });
      }
    });

    // Leave specific rooms
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      socket.emit('room_left', { roomId });
    });

    // Mark notification as read
    socket.on('mark_notification_read', async (notificationId) => {
      await this.markNotificationRead(socket.userId, notificationId);
      socket.emit('notification_marked_read', { notificationId });
    });

    // Get unread notification count
    socket.on('get_unread_count', async () => {
      const count = await this.getUnreadNotificationCount(socket.userId);
      socket.emit('unread_count', { count });
    });

    // Real-time chat messages
    socket.on('send_message', (data) => {
      this.handleChatMessage(socket, data);
    });

    // Work order status updates
    socket.on('work_order_update', (data) => {
      this.handleWorkOrderUpdate(socket, data);
    });

    // Property alerts
    socket.on('property_alert', (data) => {
      this.handlePropertyAlert(socket, data);
    });
  }

  joinDepartmentRooms(socket) {
    const departmentRooms = {
      'properties': 'dept:properties',
      'maintenance': 'dept:maintenance',
      'finance': 'dept:finance',
      'hr': 'dept:hr',
      'support': 'dept:support'
    };

    socket.permissions.forEach(permission => {
      const [module] = permission.split('.');
      if (departmentRooms[module]) {
        socket.join(departmentRooms[module]);
      }
    });
  }

  canJoinRoom(socket, roomId) {
    // Implement room access control based on user permissions
    const [type, id] = roomId.split(':');
    
    switch (type) {
      case 'property':
        return socket.permissions.includes('properties.read');
      case 'workorder':
        return socket.permissions.includes('work-orders.read');
      case 'chat':
        return true; // Basic chat access for all authenticated users
      default:
        return false;
    }
  }

  // Notification Methods
  async sendNotification(userId, notification) {
    const socket = this.connectedUsers.get(userId);
    
    if (socket) {
      // User is online, send immediately
      socket.emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: new Date().toISOString(),
        read: false
      });
    } else {
      // User is offline, store in database
      await this.storeNotification(userId, notification);
    }
  }

  async broadcastToRole(role, notification) {
    this.io.to(`role:${role}`).emit('notification', notification);
  }

  async broadcastToOrganization(orgId, notification) {
    this.io.to(`org:${orgId}`).emit('notification', notification);
  }

  async broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // Real-time Updates
  async notifyWorkOrderUpdate(workOrderId, update) {
    const notification = {
      type: 'work_order_update',
      title: 'Work Order Updated',
      message: `Work Order #${workOrderId} has been ${update.status}`,
      data: { workOrderId, update },
      timestamp: new Date().toISOString()
    };

    // Notify all users in the work order room
    this.io.to(`workorder:${workOrderId}`).emit('work_order_updated', {
      workOrderId,
      update,
      notification
    });

    // Notify property managers and admins
    this.broadcastToRole('property_manager', notification);
    this.broadcastToRole('admin', notification);
  }

  async notifyPropertyAlert(propertyId, alert) {
    const notification = {
      type: 'property_alert',
      title: 'Property Alert',
      message: alert.message,
      data: { propertyId, alert },
      timestamp: new Date().toISOString(),
      priority: alert.priority || 'medium'
    };

    // Notify all users in the property room
    this.io.to(`property:${propertyId}`).emit('property_alert', {
      propertyId,
      alert,
      notification
    });

    // Notify based on alert severity
    if (alert.priority === 'critical') {
      this.broadcastToRole('admin', notification);
      this.broadcastToRole('property_manager', notification);
    }
  }

  async notifyPaymentUpdate(invoiceId, payment) {
    const notification = {
      type: 'payment_update',
      title: 'Payment Received',
      message: `Payment of ${payment.amount} received for invoice #${invoiceId}`,
      data: { invoiceId, payment },
      timestamp: new Date().toISOString()
    };

    // Notify finance team
    this.io.to('dept:finance').emit('payment_update', {
      invoiceId,
      payment,
      notification
    });
  }

  // Chat System
  handleChatMessage(socket, data) {
    const { roomId, message, type = 'text' } = data;
    
    if (!this.canJoinRoom(socket, roomId)) {
      socket.emit('error', { message: 'Access denied to chat room' });
      return;
    }

    const chatMessage = {
      id: this.generateId(),
      roomId,
      userId: socket.userId,
      message,
      type,
      timestamp: new Date().toISOString(),
      user: {
        id: socket.userId,
        name: socket.userName || 'Unknown User',
        role: socket.userRole
      }
    };

    // Broadcast to room
    this.io.to(roomId).emit('chat_message', chatMessage);
    
    // Store message in database
    this.storeChatMessage(chatMessage);
  }

  // User Status Management
  broadcastUserStatus(userId, status) {
    this.io.emit('user_status_change', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  // Database Methods (implement based on your database)
  async getUserById(userId) {
    // Implement user lookup from your database
    return {
      id: userId,
      role: 'admin', // placeholder
      organizationId: 'org1',
      permissions: ['properties.read', 'work-orders.read']
    };
  }

  async storeNotification(userId, notification) {
    // Implement notification storage
    console.log(`Storing notification for offline user ${userId}:`, notification);
  }

  async sendPendingNotifications(socket) {
    // Implement sending stored notifications for user
    const notifications = []; // Get from database
    notifications.forEach(notification => {
      socket.emit('notification', notification);
    });
  }

  async markNotificationRead(userId, notificationId) {
    // Implement marking notification as read
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);
  }

  async getUnreadNotificationCount(userId) {
    // Implement getting unread count
    return 0; // placeholder
  }

  async storeChatMessage(message) {
    // Implement chat message storage
    console.log('Storing chat message:', message);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public API for other parts of the application
  getIO() {
    return this.io;
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = FixzitSocketServer;