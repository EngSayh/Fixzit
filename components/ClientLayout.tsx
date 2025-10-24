'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import dynamic from 'next/dynamic';
import AutoFixInitializer from './AutoFixInitializer';
// import ErrorTest from './ErrorTest'; // Only for manual testing
import ResponsiveLayout from './ResponsiveLayout';
const AutoIncidentReporter = dynamic(() => import('@/components/AutoIncidentReporter'), { ssr: false });
import PreferenceBroadcast from './PreferenceBroadcast';
// ResponsiveContext available if needed
import { useTranslation } from '@/contexts/TranslationContext';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const publicRoutes = new Set<string>(['/','/about','/privacy','/terms']);
  const authRoutes = new Set<string>(['/login', '/forgot-password', '/signup', '/reset-password']);
  const isLandingPage = publicRoutes.has(pathname);
  const isAuthPage = authRoutes.has(pathname) || pathname.startsWith('/login') || pathname.startsWith('/signup');
  // Safe translation access with fallback
  let language = 'ar';
  let isRTL = false;

  try {
    const translationContext = useTranslation();
    language = translationContext.language;
    isRTL = translationContext.isRTL;
  } catch {
    // Translation context not available in ClientLayout - using defaults
  }

  // Update document attributes when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  useEffect(() => {
    // Skip role fetching for auth pages
    if (isAuthPage) {
      setRole('guest');
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        // CRITICAL: Do NOT check localStorage - always verify with server
        // This prevents auto-login behavior from stale cached data

        // Fetch current user from API
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Include cookies
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role) {
            const userRole = data.user.role;
            setRole(userRole);
            // Cache the role in localStorage only after successful verification
            localStorage.setItem('fixzit-role', userRole);
          } else {
            // No user data even though response was ok - clear everything
            setRole('guest');
            localStorage.removeItem('fixzit-role');
            // Clear the auth cookie by making it expire
            document.cookie = 'fixzit_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          }
        } else if (response.status === 401) {
          // 401 is expected for guests - not an error, just set guest role silently
          setRole('guest');
          localStorage.removeItem('fixzit-role');
        } else {
          // Other errors - clear auth data
          setRole('guest');
          localStorage.removeItem('fixzit-role');
          document.cookie = 'fixzit_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
      } catch (error) {
        // Only log non-401 errors
        console.error('Failed to fetch user role:', error);
        setRole('guest');
        localStorage.removeItem('fixzit-role');
        document.cookie = 'fixzit_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [isAuthPage]);

  // Show loading state while fetching user data
  if (loading && !isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
        <TopBar />
        <div className="flex flex-1">
          <main className={`flex-1 flex flex-col overflow-hidden ${isLandingPage ? 'w-full' : ''}`}>
            <div className="flex-1 overflow-auto">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>
            </div>
            <Footer />
          </main>
        </div>
      </div>
    );
  }

  // For auth pages (login, signup, etc), render without TopBar/Sidebar
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  const CopilotWidget = dynamic(
    () => import('./CopilotWidget').catch((err) => {
      console.error('Failed to load CopilotWidget:', err);
      // Return a fallback component
      return { default: () => null };
    }), 
    { 
      ssr: false,
      loading: () => null // Prevent flash of loading state
    }
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <AutoFixInitializer />
      <ResponsiveLayout
        header={<TopBar />}
        sidebar={!isLandingPage ? <Sidebar key={`sidebar-${language}-${isRTL}`} role={role} subscription="PROFESSIONAL" tenantId="demo-tenant" /> : undefined}
        showSidebarToggle={!isLandingPage}
        footer={<Footer />}
      >
        {children}
      </ResponsiveLayout>
      <PreferenceBroadcast />
      <CopilotWidget />
      {/* <ErrorTest /> - Removed: Only for manual testing */}
      <AutoIncidentReporter />
    </div>
  );
}

