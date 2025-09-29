'use client';

import React, { useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, MoreVertical } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, {
  headers: {
    "x-user": JSON.stringify({
      id: "u-admin-1",
      role: "FM_MANAGER",
      tenantId: "t-001"
    })
  }
}).then(r => r.json());

export default function NotificationsPage() {
  const [selectedTab, setSelectedTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch notifications from API
  const { data, mutate, isLoading } = useSWR('/api/notifications', fetcher);
  const notificationItems = data?.items;

  const notifications = useMemo(() => {
    return Array.isArray(notificationItems) ? notificationItems : [];
  }, [notificationItems]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      case 'maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vendor': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'finance': return 'bg-green-100 text-green-800 border-green-200';
      case 'system': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif: any) => {
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
      setSelectedNotifications(new Set(filteredNotifications.map((n: any) => n.id)));
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

  const unreadCount = useMemo(() => notifications.filter((n: any) => !n.read).length, [notifications]);
  const urgentCount = useMemo(
    () => notifications.filter((n: any) => n.priority === 'high').length,
    [notifications]
  );

  // Calculate tab counts considering current filter
  const tabCounts = useMemo(() => {
    const allFiltered = notifications.filter((notif: any) => {
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
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user': JSON.stringify({
          id: "u-admin-1",
          role: "FM_MANAGER",
          tenantId: "t-001"
        })
      },
      body: JSON.stringify({ read: true })
    });
    mutate();
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unreadIds.length > 0) {
      await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': JSON.stringify({
            id: "u-admin-1",
            role: "FM_MANAGER",
            tenantId: "t-001"
          })
        },
        body: JSON.stringify({
          action: 'mark-read',
          notificationIds: unreadIds
        })
      });
      mutate();
    }
  };

  // Bulk mark as read for selected notifications
  const bulkMarkAsRead = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': JSON.stringify({
            id: "u-admin-1",
            role: "FM_MANAGER",
            tenantId: "t-001"
          })
        },
        body: JSON.stringify({
          action: 'mark-read',
          notificationIds: selectedIds
        })
      });
      mutate();
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };

  // Archive notifications
  const archiveNotifications = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      // In a real implementation, this would call an archive API
      alert(`Archived ${selectedIds.length} notifications`);
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };

  // Delete notifications
  const deleteNotifications = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      if (confirm(`Are you sure you want to delete ${selectedIds.length} notifications?`)) {
        // In a real implementation, this would call a delete API
        alert(`Deleted ${selectedIds.length} notifications`);
        setSelectedNotifications(new Set());
        setSelectAll(false);
      }
    }
  };

  // Export selected notifications
  const exportNotifications = () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      const selectedData = filteredNotifications
        .filter((n: any) => selectedIds.includes(n.id))
        .map((notif: any) => ({
          id: notif.id,
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
      alert(`Marked ${selectedIds.length} notifications as important`);
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
      alert(`Muted notifications for category: ${filter}`);
    } else {
      alert('Please select a specific category first to mute it');
    }
  };

  const handleNotificationReport = () => {
    // Generate and download notification report
    const reportData = {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentCount,
      byCategory: {
        maintenance: notifications.filter((n: any) => n.category === 'maintenance').length,
        vendor: notifications.filter((n: any) => n.category === 'vendor').length,
        finance: notifications.filter((n: any) => n.category === 'finance').length,
        system: notifications.filter((n: any) => n.category === 'system').length
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
    if (confirm('Are you sure you want to clear all notifications?')) {
      // In a real implementation, this would call a clear API
      alert('All notifications cleared');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Notifications</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Stay updated with all system notifications and alerts</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={16} className="mr-2" />
            Mark All Read ({unreadCount})
          </button>
          <button className="btn-primary">
            <Filter size={16} className="mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Notifications</p>
              <p className="text-2xl font-bold text-blue-600">{notifications.length}</p>
            </div>
            <div className="text-blue-400">📢</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
            <div className="text-red-400">🔴</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">
                {notifications.filter((n: any) => n.priority === 'high').length}
              </p>
            </div>
            <div className="text-orange-400">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-green-600">
                {notifications.filter((n: any) => new Date(n.timestamp).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <div className="text-green-400">📅</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-48">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
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
        <div className="flex border-b border-gray-200 mt-4">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === 'all'
                ? 'border-[var(--fixzit-blue)] text-[var(--fixzit-blue)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All ({tabCounts.all})
          </button>
          <button
            onClick={() => setSelectedTab('unread')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === 'unread'
                ? 'border-[var(--fixzit-blue)] text-[var(--fixzit-blue)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Unread ({tabCounts.unread})
          </button>
          <button
            onClick={() => setSelectedTab('urgent')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors relative ${
              selectedTab === 'urgent'
                ? 'border-[var(--fixzit-blue)] text-[var(--fixzit-blue)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Urgent ({tabCounts.urgent})
            {tabCounts.urgent > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">⏳</div>
              <p className="text-gray-600">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">📭</div>
              <p className="text-gray-600">No notifications found</p>
              <p className="text-sm text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notif: any) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                  notif.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notif.id)}
                      onChange={() => handleSelectNotification(notif.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="text-xl">{getTypeIcon(notif.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${notif.read ? 'text-gray-900' : 'text-blue-900'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(notif.priority)}`}>
                          {notif.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(notif.category)}`}>
                          {notif.category}
                        </span>
                      </div>
                      <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-blue-700'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(notif.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>{notif.read ? 'Read' : 'Unread'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
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
              <span className="text-sm text-gray-600">
                {selectedNotifications.size > 0
                  ? `${selectedNotifications.size} of ${filteredNotifications.length} selected`
                  : `${filteredNotifications.length} notification${filteredNotifications.length !== 1 ? 's' : ''}`
                }
              </span>
              {selectedNotifications.size === 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Select All
                </button>
              )}
              {selectedNotifications.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={bulkMarkAsRead}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Mark as Read ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={markAsImportant}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                  >
                    Mark Important ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={exportNotifications}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Export ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={archiveNotifications}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Archive ({selectedNotifications.size})
                  </button>
                  <button
                    onClick={deleteNotifications}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
            className="btn-ghost text-center hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="text-sm font-medium">Email Settings</div>
          </button>
          <button
            onClick={handlePushNotifications}
            className="btn-ghost text-center hover:bg-green-50 transition-colors"
          >
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm font-medium">Push Notifications</div>
          </button>
          <button
            onClick={handleMuteCategories}
            className="btn-ghost text-center hover:bg-yellow-50 transition-colors"
          >
            <div className="text-2xl mb-2">🔕</div>
            <div className="text-sm font-medium">Mute Categories</div>
          </button>
          <button
            onClick={handleNotificationReport}
            className="btn-ghost text-center hover:bg-purple-50 transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Notification Report</div>
          </button>
          <button
            onClick={handleSettings}
            className="btn-ghost text-center hover:bg-gray-50 transition-colors"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
          <button
            onClick={handleClearAll}
            className="btn-ghost text-center hover:bg-red-50 transition-colors"
          >
            <div className="text-2xl mb-2">🗑️</div>
            <div className="text-sm font-medium">Clear All</div>
          </button>
        </div>
      </div>
    </div>
  );
}
