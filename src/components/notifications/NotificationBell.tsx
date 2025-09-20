'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';
import NotificationCenter from './NotificationCenter';

interface Notification {
  id: string;
  type: string;
  subtype: string;
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isRead: boolean;
  requiresAction: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  readAt?: string;
}

interface NotificationStats {
  overview: {
    totalNotifications: number;
    unreadCount: number;
    readCount: number;
    actionsRequired: number;
  };
  breakdown: {
    priority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    type: {
      work_order: number;
      payment: number;
      property: number;
      hr: number;
      marketplace: number;
      crm: number;
      system: number;
    };
  };
}

const NotificationBell: React.FC = () => {
  const { isRTL } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch notifications and stats
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Fetch recent unread notifications for bell display
      const [notificationsRes, statsRes] = await Promise.all([
        fetch('/api/notifications?unread=true&limit=5'),
        fetch('/api/notifications/stats')
      ]);

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData.notifications || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = stats?.overview.unreadCount || 0;
  const actionsRequired = stats?.overview.actionsRequired || 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'work_order':
        return '🔧';
      case 'payment':
        return '💰';
      case 'property':
        return '🏢';
      case 'hr':
        return '👥';
      case 'marketplace':
        return '🛒';
      case 'crm':
        return '🤝';
      case 'system':
        return '⚙️';
      default:
        return '📋';
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        await fetchNotifications(); // Refresh data
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            relative p-2 rounded-lg transition-all duration-200
            text-white/80 hover:text-white hover:bg-white/10
            ${isRTL ? 'rtl-mirror' : ''}
          `}
          aria-label="Notifications"
        >
          {/* Bell Icon */}
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>

          {/* Unread Count Badge */}
          {unreadCount > 0 && (
            <span
              className={`
                absolute -top-1 ${isRTL ? '-left-1' : '-right-1'}
                min-w-[20px] h-5 px-1
                bg-red-500 text-white text-xs font-bold
                rounded-full flex items-center justify-center
                animate-pulse
              `}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {/* Action Required Indicator */}
          {actionsRequired > 0 && (
            <span
              className={`
                absolute -top-0.5 ${isRTL ? 'left-1' : 'right-1'}
                w-2 h-2 bg-orange-500 rounded-full
                ${unreadCount > 0 ? 'hidden' : ''}
              `}
            />
          )}
        </button>

        {/* Quick Preview Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div
              className={`
                absolute top-full mt-2 w-96 max-w-[90vw]
                bg-white rounded-xl shadow-xl border border-gray-200
                z-50 max-h-[80vh] overflow-hidden
                ${isRTL ? 'right-0' : 'left-0'}
              `}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h3 className="font-semibold text-gray-900">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-sm text-gray-500">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-2"></div>
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        w-full p-4 text-left hover:bg-gray-50 transition-colors
                        border-b border-gray-100 last:border-b-0
                        ${!notification.isRead ? 'bg-blue-50' : ''}
                        ${isRTL ? 'text-right' : ''}
                      `}
                    >
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {/* Type Icon & Priority */}
                        <div className="flex-shrink-0">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center text-lg
                            ${getPriorityColor(notification.priority)}
                          `}>
                            {getTypeIcon(notification.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h4 className="font-medium text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleDateString('ar-SA', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {notification.requiresAction && (
                              <span className="text-xs text-orange-600 font-medium">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsCenterOpen(true);
                  }}
                  className="w-full text-center text-sm text-[#0061A8] hover:text-[#004A87] font-medium"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full Notification Center Modal */}
      <NotificationCenter
        isOpen={isCenterOpen}
        onClose={() => setIsCenterOpen(false)}
        onRefresh={fetchNotifications}
      />
    </>
  );
};

export default NotificationBell;