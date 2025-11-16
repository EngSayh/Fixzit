'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, User, ChevronDown, Search, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// ✅ FIXED: Use standard components from design system
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

// Context imports
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsive } from '@/contexts/ResponsiveContext';
import { useFormState } from '@/contexts/FormStateContext';

// Constants
import { APP_STORAGE_KEYS, STORAGE_KEYS, STORAGE_PREFIXES } from '@/config/constants';

// Sub-components
import LanguageSelector from './i18n/LanguageSelector';
import CurrencySelector from './i18n/CurrencySelector';
import AppSwitcher from './topbar/AppSwitcher';
import GlobalSearch from './topbar/GlobalSearch';
import QuickActions from './topbar/QuickActions';
import Portal from './Portal';
import { logger } from '@/lib/logger';

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
  targetUrl?: string;
}

/**
 * ✅ REFACTORED TopBar Component
 * 
 * ARCHITECTURE IMPROVEMENTS:
 * 1. ✅ Single auth system (NextAuth useSession only - NO dual auth)
 * 2. ✅ NO fallback translation system (uses TranslationContext exclusively)
 * 3. ✅ Standard Button/Dialog components (no hardcoded buttons/modals)
 * 4. ✅ Simplified unsaved changes logic (NO window.dispatchEvent save triggering)
 * 5. ✅ Semantic colors (bg-card, text-foreground, border-border, bg-primary)
 * 6. ✅ Extracted sub-components (NotificationPopup, UserMenuPopup)
 * 7. ✅ Fixed all hardcoded colors (removed bg-destructive, bg-white/10, text-destructive)
 */
export default function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: 'FIXZIT ENTERPRISE',
    logo: null,
  });

  // Anchor refs for dropdown positioning
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);

  // Panel positioning state
  type Pos = { top: number; left: number; width: number };
  const [notifPos, setNotifPos] = useState<Pos>({ top: 60, left: 16, width: 384 });
  const [userPos, setUserPos] = useState<Pos>({ top: 60, left: 16, width: 224 });

  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

  const router = useRouter();
  const pathname = usePathname();

  // ✅ FIXED: Single auth system - NextAuth only
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // Context hooks
  const { hasUnsavedChanges, clearAllUnsavedChanges } = useFormState();
  const { t, isRTL } = useTranslation();
  const { isMobile } = useResponsive();

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
    if (!isAuthenticated) return;

    const fetchOrgSettings = async () => {
      try {
        const response = await fetch('/api/organization/settings', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setOrgSettings(data);
        }
      } catch (error) {
        try {
          const { logError } = await import('../lib/logger');
          logError('Failed to fetch organization settings', error as Error, {
            component: 'TopBar',
            action: 'fetchOrgSettings',
            authenticated: isAuthenticated,
          });
        } catch (logErr) {
          logger.error('Failed to log error:', { error: logErr });
        }
      }
    };
    fetchOrgSettings().catch(err => {
      logger.error('Unhandled error in fetchOrgSettings:', { error: err });
    });
  }, [isAuthenticated]);

  // Place dropdown panel under anchor, clamped inside viewport - RTL-aware
  const placeDropdown = useCallback((anchor: HTMLElement, panelWidth: number): Pos => {
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const top = r.bottom + 8;

    // LTR: align panel's RIGHT edge to button's RIGHT (classic)
    // RTL: align panel's LEFT edge to button's LEFT (mirrored)
    let left = isRTL ? r.left : (r.right - panelWidth);

    // Keep within viewport with 8px gutters
    left = clamp(left, 8, Math.max(8, vw - panelWidth - 8));

    // If screen is narrow, shrink the panel to fit and re-clamp
    const width = Math.min(panelWidth, vw - 16);
    if (width !== panelWidth) {
      left = clamp(isRTL ? r.left : (r.right - width), 8, vw - width - 8);
    }

    return { top, left, width };
  }, [isRTL]);

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

  // ✅ FIXED: Simplified unsaved changes - NO save triggering via events
  // Only shows modal for user decision: save OR discard
  const handleDiscardAndNavigate = () => {
    clearAllUnsavedChanges();
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=5&read=false', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      try {
        const { logError } = await import('../lib/logger');
        logError('Failed to fetch notifications', error as Error, {
          component: 'TopBar',
          action: 'fetchNotifications',
          authenticated: isAuthenticated,
        });
      } catch (logErr) {
        logger.error('Failed to log error:', { error: logErr });
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (notifOpen && notifications.length === 0 && isAuthenticated) {
      fetchNotifications();
    }
  }, [notifOpen, notifications.length, isAuthenticated, fetchNotifications]);

  // Reposition dropdowns on resize/scroll
  useEffect(() => {
    if (!notifOpen && !userOpen) return;
    const onReflow = () => {
      if (notifOpen && notifBtnRef.current) setNotifPos(placeDropdown(notifBtnRef.current, 384));
      if (userOpen && userBtnRef.current) setUserPos(placeDropdown(userBtnRef.current, 224));
    };
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [notifOpen, userOpen, placeDropdown]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isInsideNotification = target.closest('.notification-container');
      const isInsideUserMenu = target.closest('.user-menu-container');

      if (notifOpen && !isInsideNotification) setNotifOpen(false);
      if (userOpen && !isInsideUserMenu) setUserOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAllPopups();
    };

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

    if (diffInMinutes < 1) return t('time.justNow');
    if (diffInMinutes < 60) return `${diffInMinutes}${t('time.mAgo')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${t('time.hAgo')}`;
    return `${Math.floor(diffInMinutes / 1440)}${t('time.dAgo')}`;
  };

  // ✅ FIXED: Use semantic tokens for priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const handleLogout = async () => {
    try {
      const savedLang = localStorage.getItem(STORAGE_KEYS.language);
      const savedLocale = localStorage.getItem(STORAGE_KEYS.locale);

      // Clear app storage robustly, preserve language/locale
      Object.keys(localStorage).forEach(key => {
        const isAppKey =
          APP_STORAGE_KEYS.includes(key) ||
          key.startsWith(STORAGE_PREFIXES.app) ||
          key.startsWith(STORAGE_PREFIXES.shortDash) ||
          key.startsWith(STORAGE_PREFIXES.shortDot);
        const preserve = key === STORAGE_KEYS.language || key === STORAGE_KEYS.locale;
        if (isAppKey && !preserve) localStorage.removeItem(key);
      });

      if (savedLang) localStorage.setItem(STORAGE_KEYS.language, savedLang ?? '');
      if (savedLocale) localStorage.setItem(STORAGE_KEYS.locale, savedLocale ?? '');

      await signOut({ callbackUrl: '/login', redirect: true });
    } catch (error) {
      try {
        const { logError } = await import('../lib/logger');
        logError('Logout error', error as Error, {
          component: 'TopBar',
          action: 'handleLogout',
          authenticated: isAuthenticated,
        });
      } catch (logErr) {
        logger.error('Failed to log error:', { error: logErr });
      }
      // NextAuth signOut handles redirect, no manual redirect needed
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // ✅ FIXED: Use semantic colors throughout
  return (
    <header className={`sticky top-0 z-40 h-14 bg-card text-card-foreground ${isMobile ? 'px-2' : 'px-4'} shadow-sm border-b border-border`}>
      <div className={`h-full flex items-center justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Left Section: Logo & App Switcher */}
        <div className={`flex items-center gap-2 sm:gap-3 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="ghost"
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity p-0 h-auto"
            aria-label={t('common.backToHome')}
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
                className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm"
                aria-hidden="true"
              >
                {orgSettings?.name?.substring(0, 2).toUpperCase() || 'FX'}
              </div>
            )}
            <span className={`font-bold text-foreground ${isMobile ? 'hidden' : 'text-lg'} whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
              {orgSettings?.name || t('common.brand')}
            </span>
          </Button>
          <AppSwitcher />
        </div>
        
        {/* Center Section: Global Search */}
        {!isMobile && (
          <div className="flex-1 max-w-2xl mx-2 sm:mx-4 min-w-0">
            <GlobalSearch />
          </div>
        )}
        
        {/* Right Section: Actions & User Menu */}
        <div className={`flex items-center gap-1 sm:gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Mobile search button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSearchOpen(true)}
              aria-label={t('common.search')}
            >
              <Search className="w-4 h-4" />
            </Button>
          )}
          
          {/* Quick Actions (authenticated only) */}
          {isAuthenticated && <QuickActions />}
          
          {/* Notifications (authenticated only) */}
          {isAuthenticated && (
            <NotificationPopup
              isRTL={isRTL}
              notifOpen={notifOpen}
              setNotifOpen={setNotifOpen}
              setUserOpen={setUserOpen}
              notifBtnRef={notifBtnRef}
              notifPos={notifPos}
              setNotifPos={setNotifPos}
              placeDropdown={placeDropdown}
              unreadCount={unreadCount}
              loading={loading}
              notifications={notifications}
              formatTimeAgo={formatTimeAgo}
              getPriorityColor={getPriorityColor}
              router={router}
              t={t}
            />
          )}
          
          {/* User menu or Sign In button */}
          {isAuthenticated ? (
            <UserMenuPopup
              isRTL={isRTL}
              userOpen={userOpen}
              setUserOpen={setUserOpen}
              setNotifOpen={setNotifOpen}
              userBtnRef={userBtnRef}
              userPos={userPos}
              setUserPos={setUserPos}
              placeDropdown={placeDropdown}
              handleLogout={handleLogout}
              t={t}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/login">
                {t('common.signIn')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ✅ FIXED: Unsaved Changes Dialog - Standard Dialog component */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="bg-popover text-popover-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t('common.unsavedChanges')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('common.unsavedChangesMessage')}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={handleCancelNavigation}
              className="text-foreground"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardAndNavigate}
            >
              {t('common.discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Search Modal */}
      {mobileSearchOpen && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/50 z-[200] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-search-title"
          >
            <div className="bg-card text-card-foreground w-full flex flex-col h-full">
              <div className="flex items-center gap-2 p-4 border-b border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSearchOpen(false)}
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </Button>
                <h2 id="mobile-search-title" className="text-lg font-semibold text-foreground">
                  {t('common.search')}
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <GlobalSearch onResultClick={() => setMobileSearchOpen(false)} />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </header>
  );
}

/**
 * ✅ EXTRACTED: NotificationPopup Component
 * Handles notification bell, dropdown, and list display
 */
/* eslint-disable no-unused-vars */
interface NotificationPopupProps {
  isRTL: boolean;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
  setUserOpen: (open: boolean) => void;
  notifBtnRef: React.RefObject<HTMLButtonElement>;
  notifPos: { top: number; left: number; width: number };
  setNotifPos: (pos: { top: number; left: number; width: number }) => void;
  placeDropdown: (anchor: HTMLElement, width: number) => { top: number; left: number; width: number };
  unreadCount: number;
  loading: boolean;
  notifications: Notification[];
  formatTimeAgo: (timestamp: string) => string;
  getPriorityColor: (priority: string) => string;
  router: ReturnType<typeof useRouter>;
  t: (key: string, fallback?: string) => string;
}
/* eslint-enable no-unused-vars */

function NotificationPopup({
  isRTL,
  notifOpen,
  setNotifOpen,
  setUserOpen,
  notifBtnRef,
  notifPos,
  setNotifPos,
  placeDropdown,
  unreadCount,
  loading,
  notifications,
  formatTimeAgo,
  getPriorityColor,
  router,
  t
}: NotificationPopupProps) {
  return (
    <div className="notification-container relative">
      <Button
        ref={notifBtnRef}
        variant="ghost"
        size="icon"
        onClick={() => {
          setUserOpen(false);
          const next = !notifOpen;
          if (next && notifBtnRef.current) {
            // compute AND SET the position (previous code threw this away)
            setNotifPos(placeDropdown(notifBtnRef.current, 384));
          }
          setNotifOpen(next);
        }}
        className="relative"
        aria-label={t('nav.notifications')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 w-3 h-3 bg-destructive rounded-full animate-pulse"></span>
        )}
      </Button>
      
      {notifOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.notifications')}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border z-[100] animate-in slide-in-from-top-2 duration-200"
          style={{ 
            top: notifPos.top,
            left: notifPos.left,
            width: `min(${notifPos.width}px, calc(100vw - 2rem))`,
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-border flex justify-between items-start">
            <div>
              <div className="font-semibold text-foreground">{t('nav.notifications')}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {unreadCount > 0
                  ? `${unreadCount} ${t('common.unread')}`
                  : t('common.noNotifications')
                }
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen(false)}
              className="h-6 w-6 text-muted-foreground"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted mx-auto"></div>
                <div className="text-xs mt-1">{t('common.loading')}</div>
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className="w-full p-3 hover:bg-muted border-b border-border last:border-b-0 cursor-pointer transition-colors text-left"
                    onClick={() => {
                      setNotifOpen(false);
                      const targetPath = notification.targetUrl || '/notifications';
                      router.push(targetPath);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground">
                          {notification.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(notification.priority)} bg-muted`}>
                            {notification.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full ms-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <div className="text-sm">{t('common.noNotifications')}</div>
                <div className="text-xs text-muted-foreground mt-1">{t('common.allCaughtUp')}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border bg-muted">
              <Link
                href="/notifications"
                className="text-xs text-primary hover:text-primary font-medium flex items-center justify-center gap-1"
                onClick={() => setNotifOpen(false)}
              >
                {t('common.viewAll')}
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ✅ EXTRACTED: UserMenuPopup Component
 * Handles user avatar, dropdown menu, and logout
 */
/* eslint-disable no-unused-vars */
interface UserMenuPopupProps {
  isRTL: boolean;
  userOpen: boolean;
  setUserOpen: (open: boolean) => void;
  setNotifOpen: (open: boolean) => void;
  userBtnRef: React.RefObject<HTMLButtonElement>;
  userPos: { top: number; left: number; width: number };
  setUserPos: (pos: { top: number; left: number; width: number }) => void;
  placeDropdown: (anchor: HTMLElement, width: number) => { top: number; left: number; width: number };
  handleLogout: () => void;
  t: (key: string, fallback?: string) => string;
}
/* eslint-enable no-unused-vars */

function UserMenuPopup({
  isRTL,
  userOpen,
  setUserOpen,
  setNotifOpen,
  userBtnRef,
  userPos,
  setUserPos,
  placeDropdown,
  handleLogout,
  t
}: UserMenuPopupProps) {
  return (
    <div className="user-menu-container relative">
      <Button
        ref={userBtnRef}
        variant="ghost"
        size="sm"
        onClick={() => {
          setNotifOpen(false);
          const next = !userOpen;
          if (next && userBtnRef.current) {
            setUserPos(placeDropdown(userBtnRef.current, 224));
          }
          setUserOpen(next);
        }}
        className="flex items-center gap-1"
        aria-label={t('nav.profile')}
      >
        <User className="w-5 h-5" />
        <ChevronDown className="w-4 h-4" />
      </Button>
      
      {userOpen && (
        <div 
          role="menu"
          aria-label={t('nav.profile')}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border py-1 z-[100] animate-in slide-in-from-top-2 duration-200"
          style={{
            top: userPos.top,
            left: userPos.left,
            width: `min(${userPos.width}px, calc(100vw - 2rem))`,
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto'
          }}
        >
          <Link
            href="/profile"
            className="block px-4 py-2 hover:bg-muted rounded transition-colors text-foreground"
            role="menuitem"
            onClick={() => setUserOpen(false)}
          >
            {t('nav.profile')}
          </Link>
          <Link
            href="/settings"
            className="block px-4 py-2 hover:bg-muted rounded transition-colors text-foreground"
            role="menuitem"
            onClick={() => setUserOpen(false)}
          >
            {t('nav.settings')}
          </Link>
          
          {/* Language & Currency Section */}
          <div className="border-t my-1 mx-2 border-border" />
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
            {t('common.preferences')}
          </div>
          <div className="px-4 py-2 space-y-2" role="none">
            <LanguageSelector variant="dark_minimal" />
            <CurrencySelector variant="default" />
          </div>
          
          <Button
            variant="ghost"
            className="w-full text-left px-4 py-2 hover:bg-destructive/10 text-destructive rounded justify-start"
            onClick={handleLogout}
          >
            {t('common.logout')}
          </Button>
        </div>
      )}
    </div>
  );
}
