'use client';

import React, { useState, useMemo } from &apos;react&apos;;
import { Bell, Check, CheckCheck, Trash2, Filter, Search, MoreVertical } from &apos;lucide-react&apos;;
import useSWR from 'swr&apos;;

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
  const [selectedTab, setSelectedTab] = useState(&apos;all&apos;);
  const [search, setSearch] = useState(&apos;');
  const [filter, setFilter] = useState('all&apos;);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch notifications from API
  const { data, mutate, isLoading } = useSWR(&apos;/api/notifications&apos;, fetcher);
  const notifications = data?.items || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case &apos;high&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;medium&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;low&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case &apos;work-order&apos;: return &apos;🔧&apos;;
      case &apos;vendor&apos;: return &apos;👥&apos;;
      case &apos;payment&apos;: return &apos;💰&apos;;
      case &apos;maintenance&apos;: return &apos;🛠️&apos;;
      case 'system&apos;: return &apos;⚙️&apos;;
      default: return &apos;📢&apos;;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case &apos;maintenance&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case &apos;vendor&apos;: return &apos;bg-purple-100 text-purple-800 border-purple-200&apos;;
      case &apos;finance&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case 'system&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  const filteredNotifications = notifications.filter((notif: any) => {
    const matchesSearch = notif.title.toLowerCase().includes(search.toLowerCase()) ||
                         notif.message.toLowerCase().includes(search.toLowerCase());

    // Apply tab filtering
    let matchesTab = true;
    switch (selectedTab) {
      case &apos;unread&apos;:
        matchesTab = !notif.read;
        break;
      case &apos;urgent&apos;:
        matchesTab = notif.priority === &apos;high&apos;;
        break;
      case &apos;all&apos;:
      default:
        matchesTab = true;
        break;
    }

    // Apply category/priority filtering
    const matchesFilter = filter === &apos;all&apos; || notif.category === filter ||
                         (filter === &apos;unread&apos; && !notif.read) ||
                         (filter === &apos;high&apos; && notif.priority === &apos;high&apos;);

    return matchesSearch && matchesTab && matchesFilter;
  });

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

  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const urgentCount = notifications.filter((n: any) => n.priority === &apos;high&apos;).length;

  // Calculate tab counts considering current filter
  const tabCounts = useMemo(() => {
    const allFiltered = notifications.filter((notif: any) => {
      const matchesSearch = notif.title.toLowerCase().includes(search.toLowerCase()) ||
                           notif.message.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === &apos;all&apos; || notif.category === filter ||
                           (filter === &apos;unread&apos; && !notif.read) ||
                           (filter === &apos;high&apos; && notif.priority === &apos;high&apos;);
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
      method: &apos;PATCH&apos;,
      headers: {
        &apos;Content-Type&apos;: &apos;application/json&apos;,
        &apos;x-user&apos;: JSON.stringify({
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
      await fetch('/api/notifications/bulk&apos;, {
        method: &apos;POST&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
          &apos;x-user&apos;: JSON.stringify({
            id: "u-admin-1",
            role: "FM_MANAGER",
            tenantId: "t-001"
          })
        },
        body: JSON.stringify({
          action: 'mark-read&apos;,
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
      await fetch(&apos;/api/notifications/bulk&apos;, {
        method: &apos;POST&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
          &apos;x-user&apos;: JSON.stringify({
            id: "u-admin-1",
            role: "FM_MANAGER",
            tenantId: "t-001"
          })
        },
        body: JSON.stringify({
          action: &apos;mark-read&apos;,
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

      const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: &apos;application/json&apos; });
      const url = URL.createObjectURL(blob);
      const a = document.createElement(&apos;a');
      a.href = url;
      a.download = `notifications-export-${new Date().toISOString().split(&apos;T')[0]}.json`;
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
    window.open('/settings?tab=notifications&apos;, &apos;_blank&apos;);
  };

  const handlePushNotifications = () => {
    window.open(&apos;/settings?tab=preferences&apos;, &apos;_blank&apos;);
  };

  const handleMuteCategories = () => {
    // Toggle mute for current filter category
    if (filter !== &apos;all&apos; && filter !== &apos;unread&apos; && filter !== &apos;high&apos;) {
      alert(`Muted notifications for category: ${filter}`);
    } else {
      alert(&apos;Please select a specific category first to mute it&apos;);
    }
  };

  const handleNotificationReport = () => {
    // Generate and download notification report
    const reportData = {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentCount,
      byCategory: {
        maintenance: notifications.filter((n: any) => n.category === &apos;maintenance&apos;).length,
        vendor: notifications.filter((n: any) => n.category === &apos;vendor&apos;).length,
        finance: notifications.filter((n: any) => n.category === &apos;finance&apos;).length,
        system: notifications.filter((n: any) => n.category === 'system').length
      },
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: &apos;application/json&apos; });
    const url = URL.createObjectURL(blob);
    const a = document.createElement(&apos;a');
    a.href = url;
    a.download = `notification-report-${new Date().toISOString().split(&apos;T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSettings = () => {
    window.open(&apos;/settings&apos;, &apos;_blank&apos;);
  };

  const handleClearAll = () => {
    if (confirm(&apos;Are you sure you want to clear all notifications?&apos;)) {
      // In a real implementation, this would call a clear API
      alert(&apos;All notifications cleared&apos;);
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
                {notifications.filter((n: any) => n.priority === 'high&apos;).length}
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
            onClick={() => setSelectedTab(&apos;all&apos;)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === 'all&apos;
                ? &apos;border-[var(--fixzit-blue)] text-[var(--fixzit-blue)]&apos;
                : &apos;border-transparent text-gray-500 hover:text-gray-700&apos;
            }`}
          >
            All ({tabCounts.all})
          </button>
          <button
            onClick={() => setSelectedTab(&apos;unread&apos;)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === 'unread&apos;
                ? &apos;border-[var(--fixzit-blue)] text-[var(--fixzit-blue)]&apos;
                : &apos;border-transparent text-gray-500 hover:text-gray-700&apos;
            }`}
          >
            Unread ({tabCounts.unread})
          </button>
          <button
            onClick={() => setSelectedTab(&apos;urgent&apos;)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors relative ${
              selectedTab === 'urgent&apos;
                ? &apos;border-[var(--fixzit-blue)] text-[var(--fixzit-blue)]&apos;
                : &apos;border-transparent text-gray-500 hover:text-gray-700&apos;
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
              <p className="text-sm text-gray-500">You&apos;re all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notif: any) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                  notif.read ? 'bg-white border-gray-200&apos; : &apos;bg-blue-50 border-blue-200&apos;
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
                        <h3 className={`font-medium ${notif.read ? 'text-gray-900&apos; : &apos;text-blue-900&apos;}`}>
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
                      <p className={`text-sm ${notif.read ? 'text-gray-600&apos; : &apos;text-blue-700&apos;}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(notif.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>{notif.read ? 'Read&apos; : &apos;Unread&apos;}</span>
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
                  : `${filteredNotifications.length} notification${filteredNotifications.length !== 1 ? 's' : &apos;'}`
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
