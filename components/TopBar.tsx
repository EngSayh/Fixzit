'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, User, ChevronDown, Search } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import LanguageSelector from './i18n/LanguageSelector';
import CurrencySelector from './i18n/CurrencySelector';
import AppSwitcher from './topbar/AppSwitcher';
import GlobalSearch from './topbar/GlobalSearch';
import QuickActions from './topbar/QuickActions';
import Portal from './Portal';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import { useFormState } from '@/contexts/FormStateContext';

// Type definitions
interface OrgSettings {
  name: string;
  logo: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  read: boolean;
}

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
  'common.preferences': 'Preferences',
  'common.logout': 'Sign out'
};

// Extracted fallback translation function for clarity and reusability
const fallbackT = (key: string, fallback?: string) =>
  fallbackTranslations[key] || fallback || key;

/**
 * Top navigation bar for the application, including brand, search, quick actions,
 * language/currency selectors, notifications, and user menu.
 *
 * Renders responsive, RTL-aware UI with:
 * - Brand and app switcher
 * - Global search (hidden on mobile) and a mobile search button
 * - Quick actions, compact language and currency selectors
 * - Notification bell with dropdown (loads notifications on open, shows loading/empty states,
 *   marks unread items with a dot, navigates to /notifications)
 * - User menu with Profile, Settings, and Sign out (clears client storage and redirects to /login)
 *
 * @returns {JSX.Element} The TopBar React element.
 */
export default function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: 'FIXZIT ENTERPRISE',
    logo: null,
  });

  // Add missing router and pathname hooks
  const router = useRouter();
  const pathname = usePathname();

  // Use NextAuth session for authentication (supports both OAuth and JWT)
  const { data: session, status } = useSession();
  
  // Additional client-side auth verification state
  const [clientAuthVerified, setClientAuthVerified] = useState<boolean | null>(null);
  
  // CRITICAL: Only show authenticated UI when explicitly authenticated AND verified
  // 'loading' status should be treated as unauthenticated to prevent flash of auth UI
  const isAuthenticated = status === 'authenticated' && session != null && clientAuthVerified !== false;

  // Use FormStateContext for unsaved changes detection
  const { hasUnsavedChanges, requestSave } = useFormState();

  // Get translation context
  const translationContext = useTranslation();

  // Close all popups helper
  const closeAllPopups = useCallback(() => {
    setNotifOpen(false);
    setUserOpen(false);
  }, []);

  // Close dropdowns when route changes
  useEffect(() => {
    closeAllPopups();
  }, [pathname, closeAllPopups]);

  // Fetch organization settings on mount
  useEffect(() => {
    const fetchOrgSettings = async () => {
      try {
        const response = await fetch('/api/organization/settings');
        if (response.ok) {
          const data = await response.json();
          setOrgSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch organization settings:', error);
        // Keep default settings
      }
    };
    fetchOrgSettings();
  }, []);

  // Get responsive context
  const { isMobile, isTablet, isDesktop, isRTL } = useResponsiveLayout();
  
  // Build responsive classes
  const responsiveClasses = {
    container: isMobile ? 'px-2' : 'px-4'
  };
  
  // Build screen info
  const screenInfo = {
    isMobile,
    isTablet,
    isDesktop
  };

  // Call useTranslation unconditionally at top level (React Rules of Hooks)
  const t = translationContext?.t ?? fallbackT;

  // Debug RTL positioning (remove after issue is resolved)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 TopBar RTL Debug:', {
        isRTL,
        direction: document.documentElement.getAttribute('dir'),
        language: localStorage.getItem('fxz.lang'),
        htmlLang: document.documentElement.getAttribute('lang')
      });
    }
  }, [isRTL]);

  // CRITICAL FIX: Verify authentication on mount to prevent auto-login from stale sessions
  // This addresses the bug where UI shows logged-in state despite 401 errors
  useEffect(() => {
    const verifyAuth = async () => {
      // Skip verification if NextAuth already says we're not authenticated
      if (status !== 'authenticated' || !session) {
        setClientAuthVerified(false);
        return;
      }

      try {
        // Verify the session is still valid by checking with the server
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store' // Never use cached response
        });

        if (response.ok) {
          const data = await response.json();
          // Only mark as verified if we get valid user data back
          setClientAuthVerified(!!(data && data.user));
        } else {
          // 401 or any error means not authenticated
          console.warn('Auth verification failed:', response.status);
          setClientAuthVerified(false);
          // Force sign out to clear NextAuth session
          if (response.status === 401) {
            await signOut({ redirect: false });
          }
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        setClientAuthVerified(false);
      }
    };

    verifyAuth();
  }, [status, session]);

  // Handle logo click with unsaved changes check
  const handleLogoClick = (e: React.MouseEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      setShowUnsavedDialog(true);
      setPendingNavigation('/');
    } else {
      router.push('/');
    }
  };

  // Handle save and navigate - use event-driven pattern with proper error handling
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const handleSaveAndNavigate = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (requestSave) {
        await requestSave();
      }
      // Success path only
      setShowUnsavedDialog(false);
      if (pendingNavigation) {
        router.push(pendingNavigation);
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      // Set user-facing error - keep dialog open
      setSaveError(
        error instanceof Error 
          ? error.message 
          : 'Failed to save changes. Please try again or discard changes.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle discard and navigate
  const handleDiscardAndNavigate = () => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  // Define fetchNotifications before using it
  const fetchNotifications = useCallback(async () => {
    // Don't fetch notifications for guest users
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=5&read=false', {
        credentials: 'include' // Use session cookies instead of hardcoded guest
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      } else if (response.status === 401) {
        // 401 is expected for guests - silently set empty notifications
        setNotifications([]);
      } else {
        // Other errors - log them
        console.error('Failed to fetch notifications:', response.status);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Don't show mock notifications - just empty for guests
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch notifications when dropdown opens (only if authenticated)
  useEffect(() => {
    if (notifOpen && notifications.length === 0 && isAuthenticated) {
      fetchNotifications();
    }
  }, [notifOpen, notifications.length, isAuthenticated, fetchNotifications]);

  // Close notification popup when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Check if the click is inside any popup container
      const isInsideNotification = target.closest('.notification-container');
      const isInsideUserMenu = target.closest('.user-menu-container');

      // Close notification if click is outside and it's open
      if (notifOpen && !isInsideNotification) {
        setNotifOpen(false);
      }

      // Close user menu if click is outside and it's open
      if (userOpen && !isInsideUserMenu) {
        setUserOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAllPopups();
      }
    };

    // Add listeners if any popup is open
    if (notifOpen || userOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [notifOpen, userOpen, closeAllPopups]);

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
      // Save language and locale preferences before clearing storage
      const savedLang = localStorage.getItem('fxz.lang');
      const savedLocale = localStorage.getItem('fxz.locale');

      // Clear client-side storage
      localStorage.removeItem('fixzit-role');
      localStorage.removeItem('fixzit-currency');
      localStorage.removeItem('fixzit-theme');

      // Clear any other localStorage items related to the app, BUT preserve language settings
      const keysToRemove = Object.keys(localStorage).filter(
        key =>
          (key.startsWith('fixzit-') || key.startsWith('fxz-')) &&
          key !== 'fxz.lang' &&
          key !== 'fxz.locale'
      );
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Restore language preferences
      if (savedLang) localStorage.setItem('fxz.lang', savedLang);
      if (savedLocale) localStorage.setItem('fxz.locale', savedLocale);

      // Use NextAuth signOut for both OAuth and JWT sessions
      // This properly clears both NextAuth session and server-side JWT
      await signOut({ callbackUrl: '/login', redirect: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if signOut fails
      window.location.href = '/login';
    }
  };

  // Calculate unread notifications count once
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className={`sticky top-0 z-40 h-14 bg-gradient-to-r from-brand-500 via-brand-500 to-accent-500 text-white flex items-center justify-between ${responsiveClasses.container} shadow-sm border-b border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={`flex items-center gap-2 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Logo with unsaved changes handler */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Go to home"
        >
          {orgSettings.logo && !logoError ? (
            <Image
              src={orgSettings.logo}
              alt={orgSettings.name}
              width={32}
              height={32}
              className="rounded-md object-cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-md bg-gradient-to-br from-[#0061A8] to-[#004d86] flex items-center justify-center text-white font-bold text-sm"
              aria-hidden="true"
            >
              {orgSettings?.name?.substring(0, 2).toUpperCase() || 'FX'}
            </div>
          )}
          <span className={`font-bold ${screenInfo.isMobile ? 'hidden' : 'text-lg'} ${isRTL ? 'text-right' : ''}`}>
            {orgSettings?.name || 'FIXZIT ENTERPRISE'}
          </span>
        </button>
        <AppSwitcher />
      </div>
      
      {/* Global Search - Center */}
      <div className={`flex-1 max-w-2xl mx-4 ${screenInfo.isMobile ? 'hidden' : 'block'}`}>
        <GlobalSearch />
      </div>
      
      {/* Mobile search button */}
      {screenInfo.isMobile && (
        <button
          type="button"
          className="p-2 hover:bg-white/10 rounded-md"
          aria-label="Open search"
          onClick={() => {
            // TODO: Implement mobile search modal
            console.log('Mobile search clicked - implement modal');
          }}
        >
          <Search className="w-4 h-4" />
        </button>
      )}
      
      <div className={`flex items-center gap-1 sm:gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Only show QuickActions for authenticated users */}
        {isAuthenticated && <QuickActions />}
        
        {/* Only show notifications for authenticated users */}
        {isAuthenticated && (
          <div className="notification-container relative">
            <button
              type="button"
              onClick={() => {
                setUserOpen(false); // Close user menu when opening notifications
                setNotifOpen(!notifOpen);
              }}
              className="p-2 hover:bg-white/10 rounded-md relative"
              aria-label="Toggle notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            {notifOpen && (
              <Portal>
                <div 
                  role="dialog"
                  aria-modal="true"
                  aria-label="Notifications"
                  className="fixed bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-200 z-[100] max-h-[calc(100vh-5rem)] overflow-hidden animate-in slide-in-from-top-2 duration-200 w-80 max-w-[calc(100vw-2rem)] sm:w-96"
                  style={{
                    top: '4rem',
                    // In RTL mode (Arabic), elements flip to the left, so dropdown should align left
                    // In LTR mode, elements are on the right, so dropdown should align right
                    ...(isRTL ? { left: '1rem', right: 'auto' } : { right: '1rem', left: 'auto' }),
                    zIndex: 100
                  }}
                >
                  <div className="p-3 border-b border-gray-200 flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{t('nav.notifications', 'Notifications')}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {unreadCount > 0
                          ? `${unreadCount} ${t('common.unread', 'unread')}`
                          : t('common.noNotifications', 'No new notifications')
                        }
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                      aria-label="Close notifications"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                                <div className="w-2 h-2 bg-brand-500 rounded-full ml-2 flex-shrink-0"></div>
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
                        className="text-xs text-brand-500 hover:text-brand-700 font-medium flex items-center justify-center gap-1"
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
              </Portal>
            )}
          </div>
        )}
        
        <div className="user-menu-container relative">
          <button 
            type="button"
            onClick={() => {
              setNotifOpen(false); // Close notifications when opening user menu
              setUserOpen(!userOpen);
            }} 
            className="flex items-center gap-1 p-2 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Toggle user menu"
          >
            <User className="w-5 h-5" /><ChevronDown className="w-4 h-4" />
          </button>
          {userOpen && (
            <Portal>
              <div 
                role="menu"
                aria-label="User menu"
                className="fixed bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-200 py-1 z-[100] animate-in slide-in-from-top-2 duration-200 w-56 max-w-[calc(100vw-2rem)]"
                style={{
                  top: '4rem',
                  // In RTL mode (Arabic), elements flip to the left, so dropdown should align left
                  // In LTR mode, elements are on the right, so dropdown should align right
                  ...(isRTL ? { left: '1rem', right: 'auto' } : { right: '1rem', left: 'auto' }),
                  zIndex: 100,
                  pointerEvents: 'auto'
                }}
              >
                <Link
                  href="/profile"
                  className="block px-4 py-2 hover:bg-gray-50 rounded transition-colors cursor-pointer text-gray-800"
                  role="menuitem"
                  onClick={() => setUserOpen(false)}
                >
                  {t('nav.profile', 'Profile')}
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 hover:bg-gray-50 rounded transition-colors cursor-pointer text-gray-800"
                  role="menuitem"
                  onClick={() => setUserOpen(false)}
                >
                  {t('nav.settings', 'Settings')}
                </Link>
                
                {/* Language & Currency Section */}
                <>
                  <div className="border-t my-1 mx-2" />
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    {t('common.preferences', 'Preferences')}
                  </div>
                  <div className="px-4 py-2 space-y-2" role="none">
                    <LanguageSelector variant="default" />
                    <CurrencySelector variant="default" />
                  </div>
                </>
                
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                  onClick={handleLogout}
                >
                  {t('common.logout', 'Sign out')}
                </button>
              </div>
            </Portal>
          )}
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-dialog-title"
          >
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <h3 
                id="unsaved-dialog-title"
                className="text-lg font-semibold text-gray-900 mb-2"
              >
                {t('common.unsavedChanges', 'Unsaved Changes')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('common.unsavedChangesMessage', 'You have unsaved changes. Do you want to save them before leaving?')}
              </p>
              
              {/* Error message display */}
              {saveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{saveError}</p>
                </div>
              )}
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedDialog(false);
                    setPendingNavigation(null);
                    setSaveError(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndNavigate}
                  disabled={isSaving}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.discard', 'Discard')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndNavigate}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSaving ? t('common.saving', 'Saving...') : t('common.saveAndContinue', 'Save & Continue')}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </header>
  );
}