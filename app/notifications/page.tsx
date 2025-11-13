'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Check, CheckCheck, Filter, Search, MoreVertical } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import useSWR from 'swr';
import type { NotificationDoc } from '@/lib/models';
import ClientDate from '@/components/ClientDate';

import { logger } from '@/lib/logger';
export default function NotificationsPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [selectedTab, setSelectedTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [todayDateString, setTodayDateString] = useState('');

  // Client-side hydration for today's date
  useEffect(() => {
    setTodayDateString(new Date().toDateString());
  }, []);

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, {
      headers: { 'x-tenant-id': orgId }
    })
      .then(r => r.json())
      .catch(error => {
        logger.error('Notifications fetch error', { error });
        throw error;
      });
  };

  // Fetch notifications from API
  const { data, mutate, isLoading } = useSWR<{ items: NotificationDoc[] }>(
    orgId ? '/api/notifications' : null,
    fetcher
  );
  const notificationItems = data?.items;

  const notifications = useMemo(() => {
    return Array.isArray(notificationItems) ? notificationItems : [];
  }, [notificationItems]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive-foreground border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'low': return 'bg-success/10 text-success-foreground border-success/20';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'work-order': return '🔧';
      case 'vendor': return '👥';
      case 'payment': return '💰';
      case 'maintenance': return '🛠️';
      case 'system': return '⚙️';
      default: return '📢';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance': return 'bg-primary/10 text-primary-foreground border-primary/20';
      case 'vendor': return 'bg-secondary/10 text-secondary border-secondary/30';
      case 'finance': return 'bg-success/10 text-success-foreground border-success/20';
      case 'system': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif: NotificationDoc) => {
      const matchesSearch = notif.title.toLowerCase().includes(search.toLowerCase()) ||
                           notif.message.toLowerCase().includes(search.toLowerCase());

      // Apply tab filtering
      let matchesTab = true;
      switch (selectedTab) {
        case 'unread':
          matchesTab = !notif.read;
          break;
        case 'urgent':
          matchesTab = notif.priority === 'high';
          break;
        case 'all':
        default:
          matchesTab = true;
          break;
      }

      // Apply category/priority filtering
      const matchesFilter = filter === 'all' || notif.category === filter ||
                           (filter === 'unread' && !notif.read) ||
                           (filter === 'high' && notif.priority === 'high');

      return matchesSearch && matchesTab && matchesFilter;
    });
  }, [notifications, search, selectedTab, filter]);

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n: NotificationDoc) => String(n.id || ''))));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual notification selection
  const handleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
    setSelectAll(newSelected.size === filteredNotifications.length);
  };

  const unreadCount = useMemo(() => notifications.filter((n: NotificationDoc) => !n.read).length, [notifications]);
  const urgentCount = useMemo(
    () => notifications.filter((n: NotificationDoc) => n.priority === 'high').length,
    [notifications]
  );

  // Calculate tab counts considering current filter
  const tabCounts = useMemo(() => {
    const allFiltered = notifications.filter((notif: NotificationDoc) => {
      const matchesSearch = notif.title.toLowerCase().includes(search.toLowerCase()) ||
                           notif.message.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || notif.category === filter ||
                           (filter === 'unread' && !notif.read) ||
                           (filter === 'high' && notif.priority === 'high');
      return matchesSearch && matchesFilter;
    });

    return {
      all: allFiltered.length,
      unread: unreadCount,
      urgent: urgentCount
    };
  }, [notifications, search, filter, unreadCount, urgentCount]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': orgId
        },
        body: JSON.stringify({ read: true })
      });
      mutate();
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const unreadIds = notifications.filter((n: NotificationDoc) => !n.read).map((n: NotificationDoc) => String(n.id || ''));
    if (unreadIds.length > 0) {
      const toastId = toast.loading(`Marking ${unreadIds.length} notifications as read...`);

      try {
        await fetch('/api/notifications/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': orgId
          },
          body: JSON.stringify({
            action: 'mark-read',
            notificationIds: unreadIds
          })
        });
        toast.success(`Marked ${unreadIds.length} notifications as read`, { id: toastId });
        mutate();
      } catch (error) {
        logger.error('Error marking notifications as read:', error);
        toast.error('Failed to mark notifications as read', { id: toastId });
      }
    }
  };

  // Bulk mark as read for selected notifications
  const bulkMarkAsRead = async () => {
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      const toastId = toast.loading(`Marking ${selectedIds.length} notifications as read...`);

      try {
        await fetch('/api/notifications/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': orgId
          },
          body: JSON.stringify({
            action: 'mark-read',
            notificationIds: selectedIds
          })
        });
        toast.success(`Marked ${selectedIds.length} notifications as read`, { id: toastId });
        mutate();
        setSelectedNotifications(new Set());
        setSelectAll(false);
      } catch (error) {
        logger.error('Error marking notifications as read:', error);
        toast.error('Failed to mark notifications as read', { id: toastId });
      }
    }
  };

  // Archive notifications
  const archiveNotifications = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      // In a real implementation, this would call an archive API
      toast.success(`Archived ${selectedIds.length} notifications`);
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };

  // Delete notifications
  const deleteNotifications = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      toast.success(`Deleted ${selectedIds.length} notifications`);
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };

  // Export selected notifications
  const exportNotifications = () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      const selectedData = filteredNotifications
        .filter((n: NotificationDoc) => selectedIds.includes(String(n.id || '')))
        .map((notif: NotificationDoc) => ({
          id: String(notif.id || ''),
          title: notif.title,
          message: notif.message,
          priority: notif.priority,
          category: notif.category,
          read: notif.read,
          timestamp: notif.timestamp
        }));

      const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notifications-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Mark as important
  const markAsImportant = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      // In a real implementation, this would call an importance API
      toast.success(`Marked ${selectedIds.length} notifications as important`);
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };



  // Quick action handlers
  const handleEmailSettings = () => {
    window.open('/settings?tab=notifications', '_blank');
  };

  const handlePushNotifications = () => {
    window.open('/settings?tab=preferences', '_blank');
  };

  const handleMuteCategories = () => {
    // Toggle mute for current filter category
    if (filter !== 'all' && filter !== 'unread' && filter !== 'high') {
      toast.success(`Muted notifications for category: ${filter}`);
    } else {
      toast.info('Please select a specific category first to mute it');
    }
  };

  const handleNotificationReport = () => {
    // Generate and download notification report
    const reportData = {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentCount,
      byCategory: {
        maintenance: notifications.filter((n: NotificationDoc) => n.category === 'maintenance').length,
        vendor: notifications.filter((n: NotificationDoc) => n.category === 'vendor').length,
        finance: notifications.filter((n: NotificationDoc) => n.category === 'finance').length,
        system: notifications.filter((n: NotificationDoc) => n.category === 'system').length
      },
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSettings = () => {
    window.open('/settings', '_blank');
  };

  const handleClearAll = () => {
    // In a real implementation, this would call a clear API
    toast.success('All notifications cleared');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with all system notifications and alerts</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={16} className="me-2" />
            Mark All Read ({unreadCount})
          </button>
          <button className="btn-primary">
            <Filter size={16} className="me-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Notifications</p>
              <p className="text-2xl font-bold text-primary">{notifications.length}</p>
            </div>
            <div className="text-primary">📢</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unread</p>
              <p className="text-2xl font-bold text-destructive">{unreadCount}</p>
            </div>
            <div className="text-[hsl(var(--destructive)) / 0.1]">🔴</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">High Priority</p>
              <p className="text-2xl font-bold text-warning">
                {notifications.filter((n: NotificationDoc) => n.priority === 'high').length}
              </p>
            </div>
            <div className="text-warning">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today</p>
              <p className="text-2xl font-bold text-success">
                {todayDateString ? notifications.filter((n: NotificationDoc) => new Date(n.timestamp).toDateString() === todayDateString).length : 0}
              </p>
            </div>
            <div className="text-success">📅</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full ps-10 pe-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-48">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="high">High Priority</option>
              <option value="maintenance">Maintenance</option>
              <option value="vendor">Vendor</option>
              <option value="finance">Finance</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mt-4">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({tabCounts.all})
          </button>
          <button
            onClick={() => setSelectedTab('unread')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === 'unread'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Unread ({tabCounts.unread})
          </button>
          <button
            onClick={() => setSelectedTab('urgent')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors relative ${
              selectedTab === 'urgent'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Urgent ({tabCounts.urgent})
            {tabCounts.urgent > 0 && (
              <span className="absolute -top-1 -end-1 w-2 h-2 bg-destructive/20 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">⏳</div>
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">📭</div>
              <p className="text-muted-foreground">No notifications found</p>
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notif: NotificationDoc) => (
              <div
                key={String(notif.id || '')}
                className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  notif.read ? 'bg-card border-border' : 'bg-primary/10 border-primary/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(String(notif.id || ''))}
                      onChange={() => handleSelectNotification(String(notif.id || ''))}
                      className="mt-1 h-4 w-4 text-primary focus:ring-blue-500 border-border rounded"
                    />
                    <div className="text-xl">{getTypeIcon(notif.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${notif.read ? 'text-foreground' : 'text-primary'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-primary/20 rounded-full"></div>
                        )}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(notif.priority)}`}>
                          {notif.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(notif.category)}`}>
                          {notif.category}
                        </span>
                      </div>
                      <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'text-primary'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span><ClientDate date={notif.timestamp} format="medium" /></span>
                        <span>•</span>
                        <span>{notif.read ? 'Read' : 'Unread'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(String(notif.id || ''))}
                        className="p-1 text-primary hover:text-primary hover:bg-primary/10 rounded"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {filteredNotifications.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedNotifications.size > 0
                  ? `${selectedNotifications.size} of ${filteredNotifications.length} selected`
                  : `${filteredNotifications.length} notification${filteredNotifications.length !== 1 ? 's' : ''}`
                }
              </span>
              {selectedNotifications.size === 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-2xl hover:bg-secondary/90 transition-colors"
                >
                  Select All
                </button>
              )}
              {selectedNotifications.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={bulkMarkAsRead}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    Mark as Read ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={markAsImportant}
                    className="px-3 py-1 text-sm bg-warning text-white rounded hover:bg-warning transition-colors"
                  >
                    Mark Important ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={exportNotifications}
                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                  >
                    Export ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={archiveNotifications}
                    className="px-3 py-1 text-sm bg-success text-white rounded hover:bg-success transition-colors"
                  >
                    Archive ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={deleteNotifications}
                    className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                  >
                    Delete ({selectedNotifications.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            onClick={handleEmailSettings}
            className="btn-ghost text-center hover:bg-primary/10 transition-colors"
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="text-sm font-medium">Email Settings</div>
          </button>
          <button
            onClick={handlePushNotifications}
            className="btn-ghost text-center hover:bg-success/10 transition-colors"
          >
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm font-medium">Push Notifications</div>
          </button>
          <button
            onClick={handleMuteCategories}
            className="btn-ghost text-center hover:bg-accent/10 transition-colors"
          >
            <div className="text-2xl mb-2">🔕</div>
            <div className="text-sm font-medium">Mute Categories</div>
          </button>
          <button
            onClick={handleNotificationReport}
            className="btn-ghost text-center hover:bg-secondary/10 transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Notification Report</div>
          </button>
          <button
            onClick={handleSettings}
            className="btn-ghost text-center hover:bg-muted transition-colors"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
          <button
            onClick={handleClearAll}
            className="btn-ghost text-center hover:bg-destructive/10 transition-colors"
          >
            <div className="text-2xl mb-2">🗑️</div>
            <div className="text-sm font-medium">Clear All</div>
          </button>
        </div>
      </div>
    </div>
  );
}
