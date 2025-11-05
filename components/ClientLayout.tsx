'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import dynamic from 'next/dynamic';
import AutoFixInitializer from './AutoFixInitializer';
import ResponsiveLayout from './ResponsiveLayout';
import HtmlAttrs from './HtmlAttrs';
const AutoIncidentReporter = dynamic(() => import('@/components/AutoIncidentReporter'), { ssr: false });
import PreferenceBroadcast from './PreferenceBroadcast';
import { useTranslation } from '@/contexts/TranslationContext';
import { UserRole, type UserRoleType } from '@/types/user';

type UserRoleOrGuest = UserRoleType | 'guest';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRoleOrGuest>('guest');
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  
  // ⚡ FIXED: Use GOLD STANDARD unified auth pattern from TopBar.tsx
  // Check BOTH NextAuth session AND JWT-based auth
  const { data: session, status } = useSession();
  const [authUser, setAuthUser] = useState<{ id?: string; role?: string } | null>(null);

  const publicRoutes = new Set<string>(['/','/about','/privacy','/terms']);
  const authRoutes = new Set<string>(['/login','/forgot-password','/signup','/reset-password']);

  const isLandingPage = publicRoutes.has(pathname);
  const isAuthPage = authRoutes.has(pathname) || pathname.startsWith('/login') || pathname.startsWith('/signup');

  // Use a single source of truth for what's protected on the client
  const protectedPrefixes = ['/fm', '/admin', '/crm']; // mirror your middleware protected sets
  const isProtectedRoute = protectedPrefixes.some(p => pathname.startsWith(p));
  
  // Safe translation access
  let language = 'ar';
  let isRTL = false;
  try {
    const translationContext = useTranslation();
    language = translationContext.language;
    isRTL = translationContext.isRTL;
  } catch {}

  // Early lang/dir update
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [language, isRTL]);

  // ⚡ FIXED: Unified auth check - fetch JWT auth if NextAuth isn't authenticated
  useEffect(() => {
    let abort = false;
    // Only fetch if NextAuth isn't authenticated yet
    if (status !== 'authenticated' && status !== 'loading') {
      fetch('/api/auth/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { 
          if (!abort && data?.user?.id) {
            setAuthUser({ id: data.user.id, role: data.user.role });
          }
        })
        .catch(() => {/* silently ignore - user is guest */});
    }
    return () => { abort = true; };
  }, [status]);

  // ⚡ FIXED: Unified authentication check (GOLD STANDARD from TopBar.tsx)
  const isAuthenticated = (status === 'authenticated' && session != null) || !!authUser;

  useEffect(() => {
    // 1) Auth pages -> always guest, no fetch
    if (isAuthPage) {
      setRole('guest');
      setLoading(false);
      return;
    }

    // 2) Public landing pages -> guest but don't clear cookies
    if (isLandingPage) {
      setRole('guest');
      setLoading(false);
      return;
    }

    // 3) Non-protected routes -> guest
    if (!isProtectedRoute) {
      setRole('guest');
      setLoading(false);
      return;
    }

    // 4) Protected routes: extract role from unified auth
    if (isAuthenticated) {
      // Get role from NextAuth session OR JWT authUser
      const userRole = (session?.user as { role?: string })?.role || authUser?.role || 'guest';
      const valid: UserRoleType[] = Object.values(UserRole);
      const validRole = valid.includes(userRole as UserRoleType) ? (userRole as UserRoleOrGuest) : 'guest';
      setRole(validRole);
      try { localStorage.setItem('fixzit-role', validRole); } catch {}
      setLoading(false);
    } else if (status !== 'loading') {
      // Not authenticated and not loading -> guest
      setRole('guest');
      try { localStorage.removeItem('fixzit-role'); } catch {}
      setLoading(false);
    }
    // If still loading, keep loading state (don't set guest prematurely)
  }, [isAuthPage, isLandingPage, isProtectedRoute, pathname, isAuthenticated, session, authUser, status]);

  // Client-side protection: redirect guests only from protected routes
  useEffect(() => {
    if (!loading && role === 'guest' && isProtectedRoute) {
      // Use Next.js router.replace to avoid back stack loops and enable client-side navigation
      router.replace('/login');
    }
  }, [loading, role, isProtectedRoute, router]);

  // Loading shell (protected routes only)
  if (loading && isProtectedRoute) {
    return (
      <>
        <HtmlAttrs />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          Loading...
        </div>
      </>
    );
  }

  // Auth pages => minimal layout, no widgets
  if (isAuthPage) {
    return (
      <>
        <HtmlAttrs />
        <div className="min-h-screen bg-muted">
          {children}
        </div>
      </>
    );
  }

  // Protected routes: normal app layout
  const CopilotWidget = dynamic(
    () => import('./CopilotWidget').catch((err) => {
      console.error('Failed to load CopilotWidget:', err);
      return { default: () => null };
    }), 
    { 
      ssr: false,
      loading: () => null
    }
  );

  // Public/landing pages => full layout with TopBar and Footer but no sidebar
  if (isLandingPage) {
    return (
      <>
        <HtmlAttrs />
        <div className="min-h-screen bg-muted/30">
          <AutoFixInitializer />
          <AutoIncidentReporter />
          <PreferenceBroadcast />
          <TopBar />
          {children}
          <Footer />
          <CopilotWidget />
        </div>
      </>
    );
  }

  // Protected routes: normal app layout with sidebar
  return (
    <>
      <HtmlAttrs />
      <div className="min-h-screen bg-muted/30">
        <AutoFixInitializer />
        <ResponsiveLayout
          header={<TopBar />}
          sidebar={<Sidebar key={`sidebar-${language}-${isRTL}`} role={role} subscription="PROFESSIONAL" tenantId="demo-tenant" />}
          showSidebarToggle={true}
          footer={<Footer />}
        >
          {children}
        </ResponsiveLayout>
        <PreferenceBroadcast />
        <CopilotWidget />
        <AutoIncidentReporter />
      </div>
    </>
  );
}

