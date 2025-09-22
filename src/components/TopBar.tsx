'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Globe, User, ChevronDown } from 'lucide-react';
import LanguageSelector from './i18n/LanguageSelector';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useResponsive } from '@/src/contexts/ResponsiveContext';

// Fallback translations for when context is not available
const fallbackTranslations: Record<string, string> = {
  'common.brand': 'FIXZIT ENTERPRISE',
  'common.search.placeholder': 'Search Work Orders, Properties, Tenants...',
  'nav.notifications': 'Notifications',
  'common.unread': 'unread',
  'common.noNotifications': 'No new notifications',
  'common.loading': 'Loading...',
  'common.allCaughtUp': "You're all caught up!",
  'common.viewAll': 'View all notifications',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',
  'common.logout': 'Sign out'
};

interface TopBarProps {
  role?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  type: string;
}

export default function TopBar({ role = 'guest' }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Get responsive context
  const { responsiveClasses, screenInfo, isRTL } = useResponsive();

  // Safe translation function with fallback
  let t: (key: string, fallback?: string) => string;
  try {
    const translationContext = useTranslation();
    t = translationContext.t;
  } catch {
    // Fallback when translation context is not available
    t = (key: string, fallback?: string) => fallbackTranslations[key] || fallback || key;
  }

  const router = useRouter();

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (notifOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [notifOpen]);

  // Close notification popup when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Check if the click is inside the notification container
      const isInsideNotification = target.closest('.notification-container');

      // If popup is open and click is outside notification container, close it
      if (notifOpen && !isInsideNotification) {
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (notifOpen && event.key === 'Escape') {
        setNotifOpen(false);
      }
    };

    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [notifOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=5&read=false', {
        headers: {
          'x-user': JSON.stringify({
            id: 'guest',
            role: 'GUEST',
            tenantId: 'demo-tenant'
          })
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      } else {
        // Use mock notifications if API fails
        setNotifications([
          {
            id: '1',
            title: 'Invoice Payment Received',
            message: 'Payment for invoice INV-1234 has been processed successfully',
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'medium',
            category: 'finance',
            type: 'payment'
          },
          {
            id: '2',
            title: 'Property Inspection Due',
            message: 'Monthly inspection for Tower A is scheduled for tomorrow',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false,
            priority: 'high',
            category: 'maintenance',
            type: 'inspection'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Use mock notifications as fallback
      setNotifications([
        {
          id: '1',
          title: 'Invoice Payment Received',
          message: 'Payment for invoice INV-1234 has been processed successfully',
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'medium',
          category: 'finance',
          type: 'payment'
        },
        {
          id: '2',
          title: 'Property Inspection Due',
          message: 'Monthly inspection for Tower A is scheduled for tomorrow',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
          priority: 'high',
          category: 'maintenance',
          type: 'inspection'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Clear client-side storage
      localStorage.removeItem('fixzit-role');
      localStorage.removeItem('fxz.lang');
      localStorage.removeItem('fixzit-currency');
      localStorage.removeItem('fixzit-theme');

      // Clear any other localStorage items related to the app
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fixzit-') || key.startsWith('fxz-')) {
          localStorage.removeItem(key);
        }
      });

      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API call fails
      router.push('/login');
    }
  };

  return (
    <header className={`sticky top-0 z-40 h-14 bg-gradient-to-r from-[#023047] via-[#0061A8] to-[#00A859] text-white flex items-center justify-between ${responsiveClasses.container} shadow-sm border-b border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={`flex items-center gap-2 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`font-bold ${screenInfo.isMobile ? 'text-base' : 'text-lg'} ${isRTL ? 'text-right' : ''}`}>
          {t('common.brand', 'FIXZIT ENTERPRISE')}
        </div>
        <div className={`${screenInfo.isMobile ? 'hidden' : 'flex'} items-center bg-white/10 rounded px-3 py-1`}>
          <Search className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} opacity-70`} />
          <input
            className={`bg-transparent outline-none py-1 text-sm placeholder-white/70 ${screenInfo.isTablet ? 'w-48' : 'w-64'} ${isRTL ? 'text-right' : ''}`}
            placeholder={t('common.search.placeholder', 'Search Work Orders, Properties, Tenants...')}
          />
        </div>
        {/* Mobile search button */}
        {screenInfo.isMobile && (
          <button className="p-2 hover:bg-white/10 rounded-md">
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className={`flex items-center gap-1 sm:gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <LanguageSelector />
        <div className="notification-container relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 hover:bg-white/10 rounded-md relative transition-all duration-200 hover:scale-105"
            aria-label="Toggle notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          </button>
          {notifOpen && (
            <div className={`notification-container absolute top-full mt-2 w-80 max-w-[calc(100vw-1rem)] md:w-80 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 z-[100] max-h-96 overflow-y-auto animate-in slide-in-from-top-2 duration-200 ${isRTL ? 'left-0 right-auto' : 'right-0'}`}>
              {/* Arrow pointer - hidden on mobile */}
              <div className={`hidden md:block absolute -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white ${isRTL ? 'left-8' : 'right-8'}`}></div>
              <div className={`hidden md:block absolute -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-200 ${isRTL ? 'left-8' : 'right-8'}`}></div>

              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t('nav.notifications', 'Notifications')}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {notifications.filter(n => !n.read).length > 0
                      ? `${notifications.filter(n => !n.read).length} ${t('common.unread', 'unread')}`
                      : t('common.noNotifications', 'No new notifications')
                    }
                  </div>
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  aria-label="Close notifications"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-3 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mx-auto"></div>
                    <div className="text-xs mt-1">{t('common.loading', 'Loading...')}</div>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
                        onClick={() => {
                          // Navigate to notification details or mark as read
                          setNotifOpen(false);
                          router.push('/notifications');
                        }}
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
                              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(notification.priority)} bg-gray-100`}>
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
                    <div className="text-sm">{t('common.noNotifications', 'No new notifications')}</div>
                    <div className="text-xs text-gray-400 mt-1">{t('common.allCaughtUp', "You're all caught up!")}</div>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <Link
                    href="/notifications"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1"
                    onClick={() => setNotifOpen(false)}
                  >
                    {t('common.viewAll', 'View all notifications')}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setUserOpen(!userOpen)} className="flex items-center gap-1 p-2 hover:bg-white/10 rounded-md">
            <User className="w-5 h-5" /><ChevronDown className="w-4 h-4" />
          </button>
          {userOpen && (
            <div className={`absolute top-10 w-44 bg-white text-gray-800 rounded-lg shadow-lg p-1 z-50 ${isRTL ? 'left-0 right-auto' : 'right-0'}`}>
              <a className="block px-3 py-2 hover:bg-gray-50 rounded" href="/profile">{t('nav.profile', 'Profile')}</a>
              <a className="block px-3 py-2 hover:bg-gray-50 rounded" href="/settings">{t('nav.settings', 'Settings')}</a>
              <div className="border-t my-1" />
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600 rounded"
                onClick={handleLogout}
              >
                {t('common.logout', 'Sign out')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}