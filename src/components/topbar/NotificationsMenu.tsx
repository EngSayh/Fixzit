// src/components/topbar/NotificationsMenu.tsx
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAppScope } from '@/src/contexts/AppScopeContext';

type NotificationCategory = 'all' | 'work-orders' | 'finance' | 'support';

interface Notification {
  id: string;
  category: 'work-orders' | 'finance' | 'support' | 'general';
  title: string;
  titleAr: string;
  message?: string;
  messageAr?: string;
  read: boolean;
  href?: string;
  timestamp: number;
}

export default function NotificationsMenu() {
  const { language } = useAppScope();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  // Load notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || getMockNotifications());
      } else {
        setNotifications(getMockNotifications());
      }
    } catch {
      setNotifications(getMockNotifications());
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || n.category === filter
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const filterButtons: { key: NotificationCategory; label: string; labelAr: string }[] = [
    { key: 'all', label: 'All', labelAr: 'الكل' },
    { key: 'work-orders', label: 'Work Orders', labelAr: 'أوامر العمل' },
    { key: 'finance', label: 'Finance', labelAr: 'المالية' },
    { key: 'support', label: 'Support', labelAr: 'الدعم' },
  ];

  return (
    <div ref={dropdownRef} className="relative">
      <button 
        className="relative px-3 py-2 rounded-md hover:bg-gray-100 transition-colors" 
        onClick={() => setOpen(o => !o)} 
        aria-expanded={open}
        aria-label={t('Notifications', 'الإشعارات')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">
              {t('Notifications', 'الإشعارات')}
            </h3>
          </div>

          {/* Filters */}
          <div className="flex gap-1 p-2 border-b">
            {filterButtons.map(({ key, label, labelAr }) => (
              <button 
                key={key} 
                onClick={() => setFilter(key)} 
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === key 
                    ? 'bg-[#0061A8] text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {t(label, labelAr)}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                {t('No notifications', 'لا توجد إشعارات')}
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map(notification => (
                  <a
                    key={notification.id}
                    href={notification.href || '#'}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    className={`block p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                          {language === 'ar' ? notification.titleAr : notification.title}
                        </div>
                        {notification.message && (
                          <div className="text-xs text-gray-600 mt-1">
                            {language === 'ar' ? notification.messageAr : notification.message}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {formatTimestamp(notification.timestamp, language)}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#0061A8] rounded-full flex-shrink-0 mt-1.5"></div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t">
            <button className="w-full px-3 py-2 text-sm text-[#0061A8] hover:bg-gray-50 rounded transition-colors">
              {t('View All Notifications', 'عرض جميع الإشعارات')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: number, language: string): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return language === 'ar' ? 'الآن' : 'Just now';
  if (minutes < 60) return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  if (hours < 24) return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
  if (days < 7) return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
}

function getMockNotifications(): Notification[] {
  return [
    {
      id: '1',
      category: 'work-orders',
      title: 'New Work Order Assigned',
      titleAr: 'تم تعيين أمر عمل جديد',
      message: 'WO #1042 - AC Maintenance in Building A',
      messageAr: 'أمر العمل #1042 - صيانة التكييف في المبنى أ',
      read: false,
      href: '/work-orders/1042',
      timestamp: Date.now() - 300000, // 5 minutes ago
    },
    {
      id: '2',
      category: 'finance',
      title: 'Invoice Payment Received',
      titleAr: 'تم استلام دفعة الفاتورة',
      message: 'Invoice #INV-2023-089 has been paid',
      messageAr: 'تم دفع الفاتورة #INV-2023-089',
      read: false,
      href: '/finance/invoices/2023-089',
      timestamp: Date.now() - 3600000, // 1 hour ago
    },
    {
      id: '3',
      category: 'support',
      title: 'Support Ticket Updated',
      titleAr: 'تم تحديث تذكرة الدعم',
      message: 'Ticket #SUP-456 has been resolved',
      messageAr: 'تم حل التذكرة #SUP-456',
      read: true,
      href: '/support/tickets/456',
      timestamp: Date.now() - 7200000, // 2 hours ago
    },
  ];
}