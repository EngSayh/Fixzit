import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notifications: any[];
  unreadCount: number;
  registerForPushNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { socket } = useSocket();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
      setupNotificationListeners();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (socket && isAuthenticated) {
      setupSocketListeners();
    }
  }, [socket, isAuthenticated]);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      Alert.alert('Error', 'Push notifications only work on physical devices');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Error', 'Failed to get push token for push notification!');
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      setExpoPushToken(token.data);
      
      // Send token to server
      if (socket && token.data) {
        socket.emit('register_push_token', {
          token: token.data,
          platform: Platform.OS,
          deviceId: Constants.deviceId,
        });
      }

      console.log('📱 Push token registered:', token.data);
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0078D4',
      });
    }
  };

  const setupNotificationListeners = () => {
    // Handle notifications received while app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received in foreground:', notification);
      
      const newNotification = {
        id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        timestamp: new Date(),
        read: false,
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification tapped:', response);
      
      const { data } = response.notification.request.content;
      
      // Handle navigation based on notification data
      if (data?.screen) {
        // Navigate to specific screen
        // This would be implemented with your navigation system
        console.log('Navigate to:', data.screen);
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    // Listen for real-time notifications
    socket.on('notification', (notification) => {
      console.log('🔔 Real-time notification:', notification);
      
      const newNotification = {
        id: notification.id,
        title: notification.title,
        body: notification.message,
        data: notification.data,
        timestamp: new Date(notification.timestamp),
        read: false,
        type: notification.type,
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show local notification if app is in background
      showLocalNotification(newNotification);
    });

    // Listen for notification read status updates
    socket.on('notification_marked_read', ({ notificationId }) => {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Listen for unread count updates
    socket.on('unread_count', ({ count }) => {
      setUnreadCount(count);
    });

    return () => {
      socket.off('notification');
      socket.off('notification_marked_read');
      socket.off('unread_count');
    };
  };

  const showLocalNotification = async (notification: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: 'default',
        badge: unreadCount + 1,
      },
      trigger: null, // Show immediately
    });
  };

  const markAsRead = (notificationId: string) => {
    if (socket) {
      socket.emit('mark_notification_read', notificationId);
    }
    
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    
    // Clear system notifications
    Notifications.dismissAllNotificationsAsync();
    Notifications.setBadgeCountAsync(0);
  };

  const value: NotificationContextType = {
    expoPushToken,
    notifications,
    unreadCount,
    registerForPushNotifications,
    markAsRead,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};