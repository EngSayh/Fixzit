'use client';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useTopBar } from '@/src/contexts/TopBarContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export function Notifications() {
  const { isRTL } = useTopBar();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all'|'work_orders'|'finance'|'support'>('all');

  useEffect(() => {
    if (open && notifications.length === 0) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      } else {
        // Mock notifications
        setNotifications([
          {
            id: '1',
            title: 'Invoice Payment Received',
            message: 'Payment for invoice INV-1234 has been processed successfully',
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'medium',
            category: 'finance'
          },
          {
            id: '2',
            title: 'Property Inspection Due',
            message: 'Monthly inspection for Tower A is scheduled for tomorrow',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false,
            priority: 'high',
            category: 'work_orders'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = notifications.filter(n => filter === 'all' ? true : n.category === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-white/10 rounded-md transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
            {unreadCount}
          </span>
        )}
      </button>
      
      {open && (
        <div className={`absolute top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white text-gray-800 rounded-lg shadow-xl border z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                ×
              </button>
            </div>
            
            <div className="flex gap-1 mt-2">
              {(['all','work_orders','finance','support'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 rounded text-xs ${
                    filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'work_orders' ? 'Work Orders' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mx-auto"></div>
                <div className="text-xs mt-1">Loading...</div>
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-1">
                {filtered.map(notification => (
                  <div
                    key={notification.id}
                    className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">
                          {notification.title}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            notification.priority === 'high' ? 'text-red-600 bg-red-100' :
                            notification.priority === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                            'text-green-600 bg-green-100'
                          }`}>
                            {notification.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <div className="text-sm">No notifications</div>
                <div className="text-xs text-gray-400 mt-1">You're all caught up!</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}