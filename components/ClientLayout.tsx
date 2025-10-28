'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
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

// Type for valid user roles matching Sidebar component
type UserRole = 'SUPER_ADMIN' | 'CORPORATE_ADMIN' | 'FM_MANAGER' | 'PROPERTY_MANAGER' | 'TENANT' | 'VENDOR' | 'SUPPORT' | 'AUDITOR' | 'PROCUREMENT' | 'EMPLOYEE' | 'CUSTOMER' | 'guest';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('guest');
  const [authUser, setAuthUser] = useState<{ id?: string; role?: string } | null>(null);
  const pathname = usePathname();
  const publicRoutes = new Set<string>(['/','/about','/privacy','/terms']);
  const authRoutes = new Set<string>(['/login', '/forgot-password', '/signup', '/reset-password']);
  const isLandingPage = publicRoutes.has(pathname);
  const isAuthPage = authRoutes.has(pathname) || pathname.startsWith('/login') || pathname.startsWith('/signup');
  
  // Use NextAuth session for authentication (supports both OAuth and JWT)
  const { data: session, status } = useSession();
  
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

  // Fallback auth check for JWT-based sessions when NextAuth session is not available
  useEffect(() => {
    let abort = false;
    // Only fetch if NextAuth isn't authenticated and we're not on auth/landing pages
    if (status !== 'authenticated' && status !== 'loading' && !isAuthPage && !isLandingPage) {
      fetch('/api/auth/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { 
          if (!abort && data?.user?.id && data?.user?.role) {
            setAuthUser({ id: data.user.id, role: data.user.role });
            // Validate role is a known UserRole before casting
            const validRoles: UserRole[] = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'FM_MANAGER', 'PROPERTY_MANAGER', 'TENANT', 'VENDOR', 'SUPPORT', 'AUDITOR', 'PROCUREMENT', 'EMPLOYEE', 'CUSTOMER'];
            const userRole = validRoles.includes(data.user.role as UserRole) 
              ? (data.user.role as UserRole) 
              : 'guest';
            setRole(userRole);
          } else {
            setRole('guest');
            setAuthUser(null);
          }
        })
        .catch(() => {
          setRole('guest');
          setAuthUser(null);
        });
    } else if (status === 'authenticated' && session?.user) {
      // NextAuth session is active - extract role from session
      const sessionRole = (session.user as { role?: string })?.role;
      if (sessionRole) {
        const validRoles: UserRole[] = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'FM_MANAGER', 'PROPERTY_MANAGER', 'TENANT', 'VENDOR', 'SUPPORT', 'AUDITOR', 'PROCUREMENT', 'EMPLOYEE', 'CUSTOMER'];
        const userRole = validRoles.includes(sessionRole as UserRole) 
          ? (sessionRole as UserRole) 
          : 'guest';
        setRole(userRole);
      }
    } else if (status === 'unauthenticated' || isAuthPage || isLandingPage) {
      setRole('guest');
      setAuthUser(null);
    }
    return () => { abort = true; };
  }, [status, session, isAuthPage, isLandingPage]);
  
  // Check both NextAuth AND JWT-based auth
  const isAuthenticated = (status === 'authenticated' && session != null) || !!authUser;
  const loading = status === 'loading';

  // Client-side protection: redirect guests from FM/protected routes
  useEffect(() => {
    if (!loading && !isAuthenticated && !isLandingPage && !isAuthPage) {
      // Check if we're on a protected route (FM, admin, etc)
      if (pathname.startsWith('/fm') || pathname.startsWith('/admin') || pathname.startsWith('/crm')) {
        window.location.href = '/login';
      }
    }
  }, [loading, isAuthenticated, pathname, isLandingPage, isAuthPage]);

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

