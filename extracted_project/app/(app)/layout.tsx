"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Wrench, Building2, DollarSign, Users, Home, Sparkles, AlertTriangle
} from "lucide-react";
import { useTranslation } from "../../contexts/I18nContext";
import { ToastContainer, useToast } from "../../src/components/notifications/ToastNotification";
import { GlassCard } from "../../src/components/theme";
import HeaderEnhanced from "../../src/components/shared/HeaderEnhanced";
import SidebarEnhanced from "../../src/components/shared/SidebarEnhanced";
import Footer from "../../src/components/shared/Footer";
import ErrorBoundary from "../../src/components/error/ErrorBoundary";
import { LoadingState } from "../../src/components/loading/LoadingState";
import { ConfirmationDialog, useConfirmation } from "../../src/components/ui/ConfirmationDialog";
import { useRealtimeNotifications, useRealtimeDashboard } from "../../hooks/useRealtimeData";
import type { EnhancedUser } from "../../lib/types/rbac";
import type { LoadingState as LoadingStateType, ErrorState } from "../../lib/types/ui";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, isRTL, locale, switchLanguage } = useTranslation();
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingStateType>({
    isLoading: true,
    loadingText: 'Initializing application...',
    stage: 'Authentication check'
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const { toasts, removeToast } = useToast();
  const { confirm, ConfirmationComponent } = useConfirmation();

  // Real-time data hooks
  const notifications = useRealtimeNotifications();
  const dashboardData = useRealtimeDashboard();
  
  // Get configurable app name from environment
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "FIXZIT SOUQ";
  const appVersion = process.env.NEXT_PUBLIC_VERSION || "2.0.26";

  useEffect(() => {
    // Enhanced authentication with proper error handling and user data
    const checkAuth = async () => {
      const controller = new AbortController();
      
      try {
        setLoadingState({
          isLoading: true,
          loadingText: 'Verifying authentication...',
          stage: 'Checking session'
        });

        const res = await fetch("/api/auth/session", {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        });
        
        if (!res.ok) {
          throw new Error(`Authentication failed: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.authenticated && data.user) {
          setLoadingState({
            isLoading: true,
            loadingText: 'Loading user profile...',
            stage: 'Setting up workspace'
          });

          // Enhanced user data with permissions and preferences
          const enhancedUser: EnhancedUser = {
            ...data.user,
            permissions: data.user.permissions || [],
            roles: data.user.roles || [],
            preferences: data.user.preferences || {
              theme: 'auto',
              language: 'en',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              notifications: {
                workOrders: { email: true, sms: false, push: true, inApp: true, digest: 'immediate' },
                payments: { email: true, sms: false, push: true, inApp: true, digest: 'daily' },
                maintenance: { email: true, sms: false, push: true, inApp: true, digest: 'immediate' },
                marketing: { email: false, sms: false, push: false, inApp: false, digest: 'weekly' },
                system: { email: true, sms: false, push: true, inApp: true, digest: 'immediate' },
                security: { email: true, sms: true, push: true, inApp: true, digest: 'immediate' }
              },
              dashboard: {
                layout: 'modern',
                widgets: ['stats', 'recent-activity', 'notifications'],
                refreshInterval: 30,
                autoRefresh: true
              },
              accessibility: {
                highContrast: false,
                largeText: false,
                reducedMotion: false,
                screenReader: false,
                keyboardNavigation: true
              }
            }
          };

          setUser(enhancedUser);
          setIsAuthenticated(true);
          
          // Apply user preferences
          applyUserPreferences(enhancedUser.preferences);
          
          setLoadingState({ isLoading: false });
        } else {
          // Redirect to login with next parameter for return redirect
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        
        console.error('Authentication error:', error);
        
        const errorState: ErrorState = {
          message: 'Failed to verify authentication. Please try logging in again.',
          code: 'AUTH_ERROR',
          details: error.message,
          timestamp: new Date().toISOString(),
          retryable: true,
          retryAction: () => checkAuth()
        };
        
        setLoadingState({
          isLoading: false,
          error: errorState
        });
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.replace("/login");
        }, 3000);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Helper function to apply user preferences
  const applyUserPreferences = (preferences: any) => {
    // Apply theme
    if (preferences.theme === 'dark' || 
        (preferences.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    // Apply accessibility preferences
    if (preferences.accessibility?.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }

    if (preferences.accessibility?.highContrast) {
      document.documentElement.classList.add('high-contrast');
    }

    // Apply language
    if (preferences.language && preferences.language !== locale) {
      switchLanguage(preferences.language);
    }
  };

  // Audit logging function
  const logAuditEvent = async (action: string, details: Record<string, any>) => {
    try {
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          details,
          timestamp: new Date().toISOString(),
          userId: user?.id,
          userAgent: navigator.userAgent,
          ipAddress: 'client-side' // Will be resolved server-side
        })
      });
    } catch (error) {
      console.warn('Failed to log audit event:', error);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout? Any unsaved changes will be lost.',
      type: 'warning',
      confirmText: 'Logout',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
      setLoadingState({
        isLoading: true,
        loadingText: 'Logging out...',
        stage: 'Clearing session'
      });
      
      await fetch("/api/auth/logout", { method: "POST" });
      
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      
      // Audit log the logout
      await logAuditEvent('user.logout', {
        userId: user?.id,
        timestamp: new Date().toISOString(),
        method: 'manual'
      });
      
      router.push("/login");
    } catch (error: any) {
      console.error('Logout error:', error);
      // Force redirect even if logout API fails
      router.push("/login");
    }
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    // Apply theme to document root
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Initialize theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldUseDark);
    if (shouldUseDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Enhanced menu sections with RBAC
  const getMenuSections = () => {
    const userRole = user?.roles?.[0]?.name || 'guest';
    
    if (userRole === "tenant") {
      return [
        {
          name: "My Dashboard",
          items: [
            { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, color: "text-brand-600" },
          ]
        },
        {
          name: "My Services",
          items: [
            { href: "/my-unit", labelKey: "nav.myUnit", icon: Building2, color: "text-brand-500" },
            { href: "/my-requests", labelKey: "nav.myRequests", icon: Wrench, color: "text-brand-400" },
          ]
        }
      ];
    }
    
    return [
      {
        name: "Overview",
        items: [
          { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, color: "text-brand-600" },
        ]
      },
      {
        name: "Operations", 
        items: [
          { href: "/work-orders", labelKey: "nav.workOrders", icon: Wrench, color: "text-brand-500" },
          { href: "/properties", labelKey: "nav.properties", icon: Building2, color: "text-brand-400" },
          { href: "/preventive-maintenance", labelKey: "nav.preventiveMaintenance", icon: Building2, color: "text-brand-300" },
        ]
      },
      {
        name: "Business",
        items: [
          { href: "/finance", labelKey: "nav.finance", icon: DollarSign, color: "text-yellow-500" },
          { href: "/crm", labelKey: "nav.crm", icon: Users, color: "text-blue-500" },
          { href: "/marketplace", labelKey: "nav.marketplace", icon: Building2, color: "text-indigo-600" },
          { href: "/hr", labelKey: "nav.hr", icon: Users, color: "text-pink-600" },
        ]
      }
    ];
  };
  
  const menuSections = getMenuSections();
  const allMenuItems = menuSections.flatMap(section => section.items);

  // Get current page title and breadcrumbs
  const getCurrentPageInfo = () => {
    const currentItem = allMenuItems.find(item => 
      pathname === item.href || pathname.startsWith(item.href + '/')
    );
    
    if (currentItem) {
      const breadcrumbs = [];
      
      // Add workspace
      breadcrumbs.push({ name: "Workspace", href: "/dashboard" });
      
      // Add current section
      const section = menuSections.find(s => s.items.includes(currentItem));
      if (section && pathname !== "/dashboard") {
        breadcrumbs.push({ name: section.name, href: currentItem.href });
      }
      
      // Add specific page if nested
      if (pathname !== currentItem.href) {
        const subPage = pathname.split('/').pop();
        if (subPage) {
          breadcrumbs.push({ 
            name: subPage.charAt(0).toUpperCase() + subPage.slice(1), 
            href: pathname 
          });
        }
      }
      
      return {
        title: t(currentItem.labelKey),
        breadcrumbs,
        icon: currentItem.icon,
        color: currentItem.color
      };
    }
    
    // Fallback
    return {
      title: pathname.slice(1).split("-").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ") || t("nav.dashboard"),
      breadcrumbs: [{ name: "Workspace", href: "/dashboard" }],
      icon: Home,
      color: "text-gray-600"
    };
  };
  
  const pageInfo = getCurrentPageInfo();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        {/* Clean loading spinner without app chrome/sidebar */}
        <div className="relative z-10">
          <GlassCard className="p-8 text-center max-w-sm mx-auto">
            <div className="w-10 h-10 bg-gradient-to-r from-brand-500 to-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-brand-400 mx-auto"></div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Loading {appName}</h3>
                <p className="text-sm text-white/60">Verifying authentication...</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary level="critical" onError={(error, errorInfo) => {
      logAuditEvent('app.critical_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        pathname,
        userId: user?.id
      });
    }}>
      <div className={`min-h-screen flex relative ${isRTL ? 'rtl' : 'ltr'}`}
           role="application"
           aria-label={`${appName} - Enterprise Property Management`}>
        
        {/* Skip Navigation Link for Accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                     bg-brand-600 text-white px-4 py-2 rounded-lg z-50
                     focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          Skip to main content
        </a>
        
        {/* Sidebar Component with Error Boundary */}
        <ErrorBoundary level="component">
          <SidebarEnhanced
            userRole={user?.roles?.[0]?.name || 'guest'}
            user={user}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            isDarkMode={isDarkMode}
            appName={appName}
            notifications={notifications.data}
            realTimeEnabled={notifications.isConnected}
          />
        </ErrorBoundary>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Header Component with Error Boundary */}
          <ErrorBoundary level="component">
            <HeaderEnhanced 
              pageInfo={pageInfo} 
              user={user}
              notifications={notifications.data}
              dashboardData={dashboardData.data}
              onRefreshData={() => {
                notifications.refresh();
                dashboardData.refresh();
              }}
            />
          </ErrorBoundary>

          {/* Page Content with Suspense and Error Boundary */}
          <main 
            id="main-content"
            className={`flex-1 p-6 ${isRTL ? 'text-right' : 'text-left'}`}
            role="main"
            aria-label="Main content area"
            tabIndex={-1}
          >
            <ErrorBoundary level="page">
              <Suspense fallback={
                <LoadingState 
                  isLoading={true}
                  loadingText="Loading page content..."
                  variant="skeleton"
                />
              }>
                {children}
              </Suspense>
            </ErrorBoundary>
          </main>
          
          {/* Footer Component */}
          <ErrorBoundary level="component">
            <Footer appVersion={appVersion} companyName={appName} />
          </ErrorBoundary>
        </div>

        {/* Global UI Components */}
        {/* Toast Notification Container */}
        <ToastContainer 
          toasts={toasts} 
          onRemove={removeToast}
          position="top-right"
          className="z-50"
        />
        
        {/* Confirmation Dialog */}
        {ConfirmationComponent}
        
        {/* Real-time Connection Status */}
        {(notifications.error || dashboardData.error) && (
          <div className="fixed bottom-4 right-4 z-40">
            <GlassCard className="p-3 bg-red-500/20 border-red-400/50">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-white/90">Connection issues detected</span>
              </div>
            </GlassCard>
          </div>
        )}
        
        {/* Accessibility Announcements */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
          id="accessibility-announcements"
        />
        
        {/* Performance Monitor (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 z-40">
            <GlassCard className="p-2 text-xs text-white/60">
              <div>Notifications: {notifications.isConnected ? 'Connected' : 'Disconnected'}</div>
              <div>Dashboard: {dashboardData.isConnected ? 'Connected' : 'Disconnected'}</div>
              <div>Last Update: {new Date(notifications.lastUpdate || Date.now()).toLocaleTimeString()}</div>
            </GlassCard>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}