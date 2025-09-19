'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';
import NotificationPreferences from './NotificationPreferences';

interface Notification {
  id: string;
  type: string;
  subtype: string;
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isRead: boolean;
  isArchived: boolean;
  requiresAction: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  readAt?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  const { isRTL } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  const fetchNotifications = async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: reset ? '0' : pagination.offset.toString(),
        ...(selectedType !== 'all' && { type: selectedType }),
        ...(selectedStatus === 'unread' && { unread: 'true' })
      });

      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(reset ? data.notifications : [...notifications, ...data.notifications]);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, selectedType, selectedStatus]);

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          notificationIds
        })
      });

      if (response.ok) {
        fetchNotifications(true);
        onRefresh();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleArchive = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive',
          notificationIds
        })
      });

      if (response.ok) {
        fetchNotifications(true);
        onRefresh();
      }
    } catch (error) {
      console.error('Error archiving notifications:', error);
    }
  };

  const handleDelete = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationIds
        })
      });

      if (response.ok) {
        fetchNotifications(true);
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

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

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        absolute inset-y-0 ${isRTL ? 'left-0' : 'right-0'}
        w-full max-w-2xl bg-white shadow-xl
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-xl font-semibold text-gray-900">
              Notification Center
            </h2>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowPreferences(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="Notification Preferences"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={`mt-4 flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Search */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`
                  w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]
                  ${isRTL ? 'text-right' : 'text-left'}
                `}
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`
                px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              <option value="all">All Types</option>
              <option value="work_order">Work Orders</option>
              <option value="payment">Payments</option>
              <option value="property">Property</option>
              <option value="hr">HR</option>
              <option value="marketplace">Marketplace</option>
              <option value="crm">CRM</option>
              <option value="system">System</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`
                px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              <option value="all">All Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className={`mt-4 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">
                {selectedNotifications.length} selected
              </span>
              <button
                onClick={() => handleMarkAsRead(selectedNotifications)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                Mark as Read
              </button>
              <button
                onClick={() => handleArchive(selectedNotifications)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Archive
              </button>
              <button
                onClick={() => handleDelete(selectedNotifications)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500" role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading notifications...</span>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-2"></div>
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-lg font-medium mb-2">No notifications found</p>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-6 hover:bg-gray-50 transition-colors
                    ${!notification.isRead ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNotifications([...selectedNotifications, notification.id]);
                        } else {
                          setSelectedNotifications(
                            selectedNotifications.filter(id => id !== notification.id)
                          );
                        }
                      }}
                      className="mt-1 w-4 h-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                    />

                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center text-xl
                        ${getPriorityColor(notification.priority)}
                      `}>
                        {getTypeIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 mb-3">
                            {notification.message}
                          </p>
                          <div className={`flex items-center gap-4 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="capitalize">
                              {notification.type.replace('_', ' ')}
                            </span>
                            <span>
                              {new Date(notification.createdAt).toLocaleString('ar-SA')}
                            </span>
                            {notification.requiresAction && (
                              <span className="text-orange-600 font-medium">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className={`flex items-center gap-2 ml-4 ${isRTL ? 'flex-row-reverse mr-4 ml-0' : ''}`}>
                          {notification.actionUrl && (
                            <a
                              href={notification.actionUrl}
                              className="px-3 py-1 text-sm bg-[#0061A8] text-white rounded-lg hover:bg-[#004A87]"
                            >
                              {notification.actionText || 'View'}
                            </a>
                          )}
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead([notification.id])}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Mark as read"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {pagination.hasMore && (
            <div className="p-6 text-center">
              <button
                onClick={() => fetchNotifications(false)}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences Modal */}
      <NotificationPreferences
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </div>
  );
};

export default NotificationCenter;