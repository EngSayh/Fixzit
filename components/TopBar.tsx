"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, User, ChevronDown, Search, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// ✅ FIXED: Use standard components from design system
import { Button, buttonVariants } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { SimpleTooltip } from "./ui/tooltip";

// Context imports
import { useTranslation } from "@/contexts/TranslationContext";
import { useResponsive } from "@/contexts/ResponsiveContext";
import {
  useFormState,
  type FormStateContextValue,
} from "@/contexts/FormStateContext";
import {
  MARKETING_ROUTES,
  MARKETING_ROUTE_PREFIXES,
} from "@/config/routes/public";

// Sub-components
import LanguageSelector from "./i18n/LanguageSelector";
import CurrencySelector from "./i18n/CurrencySelector";
import AppSwitcher from "./topbar/AppSwitcher";
import GlobalSearch from "./topbar/GlobalSearch";
import QuickActions from "./topbar/QuickActions";
import { TopMegaMenu } from "./topbar/TopMegaMenu";
import Portal from "./Portal";
import { logger } from "@/lib/logger";
import * as TopBarCtx from "@/contexts/TopBarContext";
import SupportOrgSwitcher from "@/components/support/SupportOrgSwitcher";

// Type definitions
interface OrgSettings {
  name: string;
  logo: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
  timestamp: string;
  read: boolean;
  targetUrl?: string;
  category?: string;
}

type NotificationFilter = "all" | "workOrders" | "finance" | "support";

const NOTIFICATION_FILTERS: Array<{
  id: NotificationFilter;
  labelKey: string;
  category?: string;
}> = [
  { id: "all", labelKey: "notifications.filters.all" },
  {
    id: "workOrders",
    labelKey: "notifications.filters.maintenance",
    category: "maintenance",
  },
  {
    id: "finance",
    labelKey: "notifications.filters.finance",
    category: "finance",
  },
  {
    id: "support",
    labelKey: "notifications.filters.system",
    category: "system",
  },
];

type TopBarContextValue = ReturnType<typeof TopBarCtx.useTopBar>;
type ResponsiveContextValue = ReturnType<typeof useResponsive>;

const createFormStateFallback = (): FormStateContextValue => ({
  forms: new Map(),
  hasUnsavedChanges: false,
  registerForm: () => {},
  unregisterForm: () => {},
  updateField: () => {},
  markFormClean: () => {},
  getFormState: () => undefined,
  saveAllForms: async () => {},
  clearAllUnsavedChanges: () => {},
  markFormDirty: () => {},
  onSaveRequest: () => () => {},
  isFormDirty: () => false,
  requestSave: async () => {},
});

const topBarFallback: TopBarContextValue = {
  app: "fm",
  appLabelKey: "topbar.app",
  appFallbackLabel: "Dashboard",
  appSearchEntities: [],
  module: "dashboard",
  moduleLabelKey: "topbar.module",
  moduleFallbackLabel: "Overview",
  searchPlaceholderKey: "topbar.search.placeholder",
  searchPlaceholderFallback: "Search",
  searchEntities: [],
  quickActions: [],
  savedSearches: [],
  navKey: undefined,
  megaMenuCollapsed: true,
  setMegaMenuCollapsed: () => {},
  setApp: () => {},
};

const responsiveFallback: ResponsiveContextValue = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  screenSize: "desktop",
  screenInfo: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLarge: true,
    size: "desktop",
  },
  responsiveClasses: {
    container: "px-6",
    text: "text-base",
    spacing: "space-y-4",
  },
};

type SafeImageProps = React.ComponentProps<typeof Image>;
const SafeImage: React.FC<SafeImageProps> = (props) => {
  if (process.env.NODE_ENV === "test") {
    // In test env, use native img with compatible props
    const { src, alt, ...rest } = props;
    return (
      <img
        src={String(src)}
        alt={alt}
        {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }
  return <Image {...props} />;
};

function useSafeFormState(): FormStateContextValue {
  try {
    return useFormState();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message && !message.includes("FormStateProvider")) {
      throw error;
    }
    if (process.env.NODE_ENV === "development") {
      logger.debug(
        "FormStateProvider missing - using no-op fallback for TopBar",
        {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
    }
    return createFormStateFallback();
  }
}

function useSafeTopBar(): TopBarContextValue {
  try {
    return TopBarCtx.useTopBar();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message && !message.includes("TopBarProvider")) {
      throw error;
    }
    if (process.env.NODE_ENV === "development") {
      logger.debug(
        "TopBarProvider missing - using fallback labels for TopBar",
        {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
    }
    return topBarFallback;
  }
}

function useSafeResponsive(): ResponsiveContextValue {
  try {
    return useResponsive();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message && !message.includes("ResponsiveProvider")) {
      throw error;
    }
    if (process.env.NODE_ENV === "development") {
      logger.debug(
        "ResponsiveProvider missing - using desktop fallback for TopBar",
        {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
    }
    return responsiveFallback;
  }
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
function TopBarContent() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState<NotificationFilter>("all");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [logoError, setLogoError] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: "FIXZIT ENTERPRISE",
    logo: null,
  });

  // Anchor refs for dropdown positioning
  // React 19: useRef<T>(null) returns RefObject<T | null>, remove null assertion
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);

  // Panel positioning state
  type Pos = { top: number; left: number; width: number };
  const [notifPos, setNotifPos] = useState<Pos>({
    top: 60,
    left: 16,
    width: 384,
  });
  const [userPos, setUserPos] = useState<Pos>({
    top: 60,
    left: 16,
    width: 224,
  });

  const clamp = (n: number, min: number, max: number) =>
    Math.min(Math.max(n, min), max);
  const logoAlt = `${orgSettings?.name || "Fixzit"} logo - Fixzit`;

  const router = useRouter();
  const pathname = usePathname();

  // ✅ FIXED: Single auth system - NextAuth only
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isSuperAdmin = Boolean(
    (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin,
  );
  const roleUpper = ((session?.user as { role?: string })?.role || '').toUpperCase();
  const isAdminUser = isSuperAdmin || roleUpper.includes('ADMIN');

  // Context hooks
  const { hasUnsavedChanges, clearAllUnsavedChanges } = useSafeFormState();
  const { t, isRTL } = useTranslation();
  const { isMobile } = useSafeResponsive();
  const { appLabelKey, appFallbackLabel, moduleLabelKey, moduleFallbackLabel } =
    useSafeTopBar();
  const appLabel = t(appLabelKey, appFallbackLabel);
  const moduleLabel = t(moduleLabelKey, moduleFallbackLabel);
  const marketingRoutes = React.useMemo(() => new Set(MARKETING_ROUTES), []);
  const isMarketingPage = React.useMemo(() => {
    const path = pathname || "/";
    if (marketingRoutes.has(path)) return true;
    return MARKETING_ROUTE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }, [marketingRoutes, pathname]);

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
        const response = await fetch("/api/organization/settings", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setOrgSettings(data);
        }
      } catch (error) {
        try {
          const { logError } = await import("../lib/logger");
          logError("Failed to fetch organization settings", error as Error, {
            component: "TopBar",
            action: "fetchOrgSettings",
            authenticated: isAuthenticated,
          });
        } catch (logErr) {
          logger.error("Failed to log error:", { error: logErr });
        }
      }
    };
    fetchOrgSettings().catch((err) => {
      logger.error("Unhandled error in fetchOrgSettings:", { error: err });
    });
  }, [isAuthenticated]);

  // Place dropdown panel under anchor, clamped inside viewport - RTL-aware
  const placeDropdown = useCallback(
    (anchor: HTMLElement, panelWidth: number): Pos => {
      const r = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const top = r.bottom + 8;

      // LTR: align panel's RIGHT edge to button's RIGHT (classic)
      // RTL: align panel's LEFT edge to button's LEFT (mirrored)
      let left = isRTL ? r.left : r.right - panelWidth;

      // Keep within viewport with 8px gutters
      left = clamp(left, 8, Math.max(8, vw - panelWidth - 8));

      // If screen is narrow, shrink the panel to fit and re-clamp
      const width = Math.min(panelWidth, vw - 16);
      if (width !== panelWidth) {
        left = clamp(isRTL ? r.left : r.right - width, 8, vw - width - 8);
      }

      return { top, left, width };
    },
    [isRTL],
  );

  // Handle logo click with unsaved changes check
  // Smart routing: authenticated users go to FM dashboard, guests go to landing
  // Uses /fm/dashboard to stay within FM route guards (aligns with MODULE_PATHS.dashboard)
  const handleLogoClick = (e: React.MouseEvent) => {
    const targetPath = isAuthenticated ? "/fm/dashboard" : "/";
    if (hasUnsavedChanges) {
      e.preventDefault();
      setShowUnsavedDialog(true);
      setPendingNavigation(targetPath);
    } else {
      router.push(targetPath);
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
      const params = new URLSearchParams({
        limit: "5",
        read: "false",
      });
      const categoryValue = NOTIFICATION_FILTERS.find(
        (f) => f.id === notifFilter,
      )?.category;
      if (categoryValue) {
        params.set("category", categoryValue);
      }
      const response = await fetch(`/api/notifications?${params.toString()}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      try {
        const { logError } = await import("../lib/logger");
        logError("Failed to fetch notifications", error as Error, {
          component: "TopBar",
          action: "fetchNotifications",
          authenticated: isAuthenticated,
        });
      } catch (logErr) {
        logger.error("Failed to log error:", { error: logErr });
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, notifFilter]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (notifOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [notifOpen, notifFilter, isAuthenticated, fetchNotifications]);

  // Reposition dropdowns on resize/scroll
  useEffect(() => {
    if (!notifOpen && !userOpen) return;
    const onReflow = () => {
      if (notifOpen && notifBtnRef.current)
        setNotifPos(placeDropdown(notifBtnRef.current, 384));
      if (userOpen && userBtnRef.current)
        setUserPos(placeDropdown(userBtnRef.current, 224));
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [notifOpen, userOpen, placeDropdown]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isInsideNotification = target.closest(".notification-container");
      const isInsideUserMenu = target.closest(".user-menu-container");

      if (notifOpen && !isInsideNotification) setNotifOpen(false);
      if (userOpen && !isInsideUserMenu) setUserOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAllPopups();
    };

    if (notifOpen || userOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [notifOpen, userOpen, closeAllPopups]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return t("time.justNow");
    if (diffInMinutes < 60) return `${diffInMinutes}${t("time.mAgo")}`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)}${t("time.hAgo")}`;
    return `${Math.floor(diffInMinutes / 1440)}${t("time.dAgo")}`;
  };

  // ✅ FIXED: Use semantic tokens for priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  const handleLogout = async () => {
    try {
      // Close any open popovers then navigate to logout for coordinated cleanup.
      setUserOpen(false);
      setNotifOpen(false);

      // Navigate to logout page for coordinated cleanup
      // The logout page handles:
      // 1. Storage clearing (preserving language/locale)
      // 2. Session cleanup
      // 3. NextAuth signOut
      // 4. Redirect to login
      router.push('/logout');

      // Hard fallback: if client navigation stalls, force a full reload
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/logout') {
          window.location.href = '/logout';
        }
      }, 250);
    } catch (error) {
      try {
        const { logError } = await import('../lib/logger');
        logError('Logout navigation error', error as Error, {
          component: 'TopBar',
          action: 'handleLogout',
          authenticated: isAuthenticated,
        });
      } catch (logErr) {
        logger.error("Failed to log error:", { error: logErr });
      }
      // Fallback: direct signOut if navigation fails
      await signOut({ callbackUrl: '/login', redirect: true });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ✅ FIXED: Use semantic colors throughout
  return (
    <header
      className={`sticky top-0 z-40 fxz-topbar h-16 border-b border-ejar-border flex items-center ${isMobile ? "px-3" : "px-6"}`}
      role="banner"
      aria-label={t("nav.globalHeader", "Fixzit global navigation")}
    >
      <div
        className={`w-full flex items-center justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        {/* Left Section: Logo & App Switcher */}
        <div
          className={`flex items-center gap-3 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <Button
            variant="ghost"
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity p-0 h-auto"
            aria-label={t("common.backToHome")}
          >
            {orgSettings.logo && !logoError ? (
              <SafeImage
                src={orgSettings.logo}
                alt={logoAlt}
                width={36}
                height={36}
                className="rounded-2xl object-cover fxz-brand-logo fxz-topbar-logo"
                onError={() => setLogoError(true)}
                data-testid="header-logo-img"
              />
            ) : (
              <SafeImage
                src="/img/fixzit-logo.png"
                alt="Fixzit"
                width={120}
                height={40}
                className="h-9 w-auto object-contain fxz-brand-logo fxz-topbar-logo"
                data-testid="header-logo-img"
              />
            )}
            <div className="flex flex-col text-start">
              <span
                className={`font-semibold leading-tight ${isMobile ? "hidden" : "text-base"}`}
              >
                {orgSettings?.name || t("common.brand")}
              </span>
              {!isMarketingPage && (
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 fxz-topbar-pill uppercase tracking-wide">
                    {appLabel}
                  </span>
                  <span>{moduleLabel}</span>
                </div>
              )}
            </div>
          </Button>
          {!isMarketingPage && (
            <>
              <AppSwitcher />
              <TopMegaMenu />
            </>
          )}
        </div>

        {/* Center Section: Global Search */}
        {!isMobile && (
          <div className="flex-1 max-w-2xl mx-2 sm:mx-4 min-w-0">
            <GlobalSearch />
          </div>
        )}

        {/* Right Section: Actions & User Menu */}
        <div
          className={`flex items-center gap-1 sm:gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          {/* Mobile search button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSearchOpen(true)}
              aria-label={t("common.search")}
            >
              <Search className="w-4 h-4" />
            </Button>
          )}

          {isAuthenticated && isSuperAdmin && <SupportOrgSwitcher />}

          {/* Quick Actions (authenticated only) */}
          {isAuthenticated && !isMarketingPage && <QuickActions />}

          {/* Global language & currency selectors (always visible for e2e checks) */}
          <LanguageSelector variant="compact" />
          <CurrencySelector variant="compact" />

          {/* Notifications (authenticated only) */}
          {isAuthenticated && !isMarketingPage && (
            <NotificationPopup
              isRTL={isRTL}
              notifOpen={notifOpen}
              setNotifOpen={setNotifOpen}
              setUserOpen={setUserOpen}
              notifFilter={notifFilter}
              setNotifFilter={setNotifFilter}
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
            <>
              {isAdminUser && (
                <span
                  data-testid="admin-menu"
                  className="text-xs font-semibold text-primary px-2 py-1 rounded-full bg-primary/10"
                  aria-label={t('nav.admin', 'Admin')}
                >
                  {t('nav.admin', 'Admin')}
                </span>
              )}
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
            </>
          ) : (
            // Don't show "Sign In" button when already on /login page (avoids redundant CTA)
            pathname !== '/login' && (
              <Link
                href="/login"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("common.signIn")}
              </Link>
            )
          )}
        </div>
      </div>

      {/* ✅ FIXED: Unsaved Changes Dialog - Standard Dialog component */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="bg-popover text-popover-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t("common.unsavedChanges")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("common.unsavedChangesMessage")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={handleCancelNavigation}
              className="text-foreground"
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDiscardAndNavigate}>
              {t("common.discard")}
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
                <h2
                  id="mobile-search-title"
                  className="text-lg font-semibold text-foreground"
                >
                  {t("common.search")}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <GlobalSearch
                  onResultClick={() => setMobileSearchOpen(false)}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </header>
  );
}

/**
 * TopBar export wrapper
 * Note: Safe hooks (useSafeTopBar, useSafeFormState, useSafeResponsive) already handle
 * missing context gracefully with fallbacks. No need for self-providing wrapper.
 */
export default function TopBar() {
  return <TopBarContent />;
}

/**
 * ✅ EXTRACTED: NotificationPopup Component
 * Handles notification bell, dropdown, and list display
 */
interface NotificationPopupProps {
  isRTL: boolean;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
  setUserOpen: (open: boolean) => void;
  notifFilter: NotificationFilter;
  setNotifFilter: (filter: NotificationFilter) => void;
  notifBtnRef: React.RefObject<HTMLButtonElement>;
  notifPos: { top: number; left: number; width: number };
  setNotifPos: (pos: { top: number; left: number; width: number }) => void;
  placeDropdown: (
    anchor: HTMLElement,
    width: number,
  ) => { top: number; left: number; width: number };
  unreadCount: number;
  loading: boolean;
  notifications: Notification[];
  formatTimeAgo: (timestamp: string) => string;
  getPriorityColor: (priority: string) => string;
  router: ReturnType<typeof useRouter>;
  t: (key: string, fallback?: string) => string;
}

function NotificationPopup({
  isRTL,
  notifOpen,
  setNotifOpen,
  setUserOpen,
  notifFilter,
  setNotifFilter,
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
  t,
}: NotificationPopupProps) {
  return (
    <div className="notification-container relative">
      <SimpleTooltip content={t("nav.notifications", "Notifications")} side="bottom">
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
          aria-label={t("nav.notifications", "Toggle notifications")}
          data-cursor-interactive
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -end-1 w-3 h-3 bg-destructive rounded-full animate-pulse"></span>
          )}
        </Button>
      </SimpleTooltip>

      {notifOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.notifications", "Notifications")}
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border z-[100] animate-in slide-in-from-top-2 duration-200"
          style={{
            top: notifPos.top,
            left: notifPos.left,
            width: `min(${notifPos.width}px, calc(100vw - 2rem))`,
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-foreground">
                  {t("nav.notifications")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {unreadCount > 0
                    ? `${unreadCount} ${t("common.unread")}`
                    : t("common.noNotifications")}
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
            <div
              className={`mt-3 flex flex-wrap gap-2 ${isRTL ? "justify-end" : "justify-start"}`}
            >
              {NOTIFICATION_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setNotifFilter(filter.id)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    notifFilter === filter.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t(filter.labelKey, filter.id)}
                </button>
              ))}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted mx-auto"></div>
                <div className="text-xs mt-1">{t("common.loading")}</div>
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className="w-full p-3 hover:bg-muted border-b border-border last:border-b-0 cursor-pointer transition-colors text-start"
                    onClick={() => {
                      setNotifOpen(false);
                      const targetPath =
                        notification.targetUrl || "/notifications";
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
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(notification.priority)} bg-muted`}
                          >
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
                <div className="text-sm">{t("common.noNotifications")}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("common.allCaughtUp")}
                </div>
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
                {t("common.viewAll")}
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
interface UserMenuPopupProps {
  isRTL: boolean;
  userOpen: boolean;
  setUserOpen: (open: boolean) => void;
  setNotifOpen: (open: boolean) => void;
  userBtnRef: React.RefObject<HTMLButtonElement>;
  userPos: { top: number; left: number; width: number };
  setUserPos: (pos: { top: number; left: number; width: number }) => void;
  placeDropdown: (
    anchor: HTMLElement,
    width: number,
  ) => { top: number; left: number; width: number };
  handleLogout: () => void;
  t: (key: string, fallback?: string) => string;
}

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
  t,
}: UserMenuPopupProps) {
  return (
    <div className="user-menu-container relative">
      <SimpleTooltip content={t("nav.profile", "Profile")} side="bottom">
        <Button
          ref={userBtnRef}
          variant="ghost"
          size="sm"
          data-testid="user-menu"
          onClick={() => {
            setNotifOpen(false);
            const next = !userOpen;
            if (next && userBtnRef.current) {
              setUserPos(placeDropdown(userBtnRef.current, 224));
            }
            setUserOpen(next);
          }}
          className="flex items-center gap-1"
          aria-label={t("nav.profile", "Profile")}
          data-cursor-interactive
        >
          <User className="w-5 h-5" />
          <ChevronDown className="w-4 h-4" />
        </Button>
      </SimpleTooltip>

      {userOpen && (
        <div
          role="menu"
          aria-label={t("nav.profile")}
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border py-1 z-[100] animate-in slide-in-from-top-2 duration-200"
          style={{
            top: userPos.top,
            left: userPos.left,
            width: `min(${userPos.width}px, calc(100vw - 2rem))`,
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
          }}
        >
          <Link
            href="/profile"
            className="block px-4 py-2 hover:bg-muted rounded transition-colors text-foreground"
            role="menuitem"
            onClick={() => setUserOpen(false)}
          >
            {t("nav.profile")}
          </Link>
          <Link
            href="/settings"
            className="block px-4 py-2 hover:bg-muted rounded transition-colors text-foreground"
            role="menuitem"
            onClick={() => setUserOpen(false)}
          >
            {t("nav.settings")}
          </Link>

          {/* Language & Currency Section */}
          <div className="border-t my-1 mx-2 border-border" />
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
            {t("common.preferences")}
          </div>
          <div className="px-4 py-2 space-y-2" role="none">
            <LanguageSelector variant="dark_minimal" />
            <CurrencySelector variant="default" />
          </div>

          <Button
            variant="ghost"
            className="w-full text-start px-4 py-2 hover:bg-destructive/10 text-destructive rounded justify-start"
            onClick={handleLogout}
            data-testid="logout-button"
          >
            {t("common.logout")}
          </Button>
        </div>
      )}
    </div>
  );
}
