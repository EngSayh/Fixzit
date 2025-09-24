'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import RoleSidebar from './navigation/RoleSidebar';
import Footer from './Footer';
import HelpWidget from './HelpWidget';
import EnhancedKnowledgeWidget from './help/EnhancedKnowledgeWidget';
// import AutoFixInitializer from './AutoFixInitializer'; // Temporarily disabled
// import ErrorTest from './ErrorTest'; // Removed for production
import ResponsiveLayout from './ResponsiveLayout';
import { useResponsive } from '@/src/contexts/ResponsiveContext';
import { useI18n } from '@/src/providers/RootProviders';
import { ModuleKey } from '@/src/lib/rbac';
import ChatWidget from './ai/ChatWidget';
import LoginNotification from './LoginNotification';
// Import the new dynamic TopBar instead of the old one
import TopBar from './TopBar';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<'SUPER_ADMIN' | 'CORP_ADMIN' | 'MANAGEMENT' | 'FINANCE' | 'HR' | 'CORPORATE_EMPLOYEE' | 'PROPERTY_OWNER' | 'TECHNICIAN' | 'TENANT' | 'VENDOR' | 'GUEST'>('GUEST');
  const [userModules, setUserModules] = useState<ModuleKey[] | undefined>(undefined);
  const [orgOverrides, setOrgOverrides] = useState<Record<string, boolean> | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  
  // Public routes that should not show sidebar (marketing/auth only)
  const publicRoutes = new Set<string>([
    '/', '/about', '/privacy', '/terms', '/login', '/signup', '/ar',
    '/careers', '/help', '/forgot-password'
  ]);
  
  // Check if current path is public (including CMS pages)
  const isPublicRoute = publicRoutes.has(pathname) ||
                        pathname.startsWith('/cms/') ||
                        pathname.startsWith('/help/');
  
  // Hide sidebar on all public pages including '/'
  const isLandingPage = isPublicRoute;
  const { screenInfo } = useResponsive();
  const { lang: language } = useI18n();

  useEffect(() => {
    // Set document dir from fxz_lang cookie for RTL tests
    try {
      const cookie = document.cookie || '';
      const m = cookie.match(/(?:^|; )fxz_lang=([^;]+)/);
      const lang = m ? decodeURIComponent(m[1]) : 'en';
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    } catch {}

    // Bootstrap role from cookie/sessionStorage for e2e and role-toggle tests
    try {
      const cookieRoleMatch = document.cookie.match(/(?:^|; )fxz_role=([^;]+)/);
      const cookieRoleRaw = cookieRoleMatch ? decodeURIComponent(cookieRoleMatch[1]) : '';
      const storageRoleRaw = sessionStorage.getItem('role') || '';
      const raw = (cookieRoleRaw || storageRoleRaw || '').toUpperCase();
      if (raw) {
        const map: Record<string, typeof role> = {
          'SUPER_ADMIN': 'SUPER_ADMIN',
          'ADMIN': 'CORP_ADMIN',
          'CORPORATE_ADMIN': 'CORP_ADMIN',
          'TENANT_ADMIN': 'CORP_ADMIN',
          'MANAGEMENT': 'MANAGEMENT',
          'FINANCE': 'FINANCE',
          'HR': 'HR',
          'TECHNICIAN': 'TECHNICIAN',
          'TENANT': 'TENANT',
          'CUSTOMER': 'TENANT',
          'VENDOR': 'VENDOR',
          'PROCUREMENT': 'VENDOR',
          'SUPPORT': 'CORPORATE_EMPLOYEE',
          // 'AUDITOR' role maps to least-privileged reporting in UI scope
          'OWNER': 'PROPERTY_OWNER',
          'PROPERTY_OWNER': 'PROPERTY_OWNER'
        };
        const mapped = map[raw];
        if (mapped) setRole(mapped);
      }
    } catch {}

    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/session/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.role && data.role !== 'GUEST') {
            setRole(data.role as any);
            
            // Set user name if provided
            if (data.name) {
              setUserName(data.name);
            }
            
            // Set user modules if provided
            if (data.modules && Array.isArray(data.modules)) {
              setUserModules(data.modules as ModuleKey[]);
            }
            
            // Set org overrides if provided
            if (data.orgOverrides && typeof data.orgOverrides === 'object') {
              setOrgOverrides(data.orgOverrides);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Render layout immediately and show lightweight loading in content to avoid "lost UI" during session fetch
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <ResponsiveLayout
          header={<TopBar />}
          sidebar={!isLandingPage ? <RoleSidebar role={role} userModules={userModules} orgOverrides={orgOverrides} /> : undefined}
          showSidebarToggle={!isLandingPage}
          footer={<Footer />}
        >
          {isPublicRoute ? (
            // Render public pages immediately while session loads
            <>{children}</>
          ) : (
            <div className="flex items-center justify-center h-[50vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          )}
        </ResponsiveLayout>
        <HelpWidget />
        <EnhancedKnowledgeWidget
          orgId="demo-tenant"
          lang={language as 'ar' | 'en'}
          role={role}
          route={pathname}
          userName={userName}
        />
        <ChatWidget />
        <LoginNotification />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* <AutoFixInitializer /> */}
      <ResponsiveLayout
        header={<TopBar />}
        sidebar={!isLandingPage ? <RoleSidebar role={role} userModules={userModules} orgOverrides={orgOverrides} /> : undefined}
        showSidebarToggle={!isLandingPage}
        overlaySidebarOnDesktop={false}
        fullBleed={pathname === '/'}
        footer={<Footer />}
      >
        {children}
      </ResponsiveLayout>
      <HelpWidget />
      <EnhancedKnowledgeWidget
        orgId="demo-tenant"
        lang={language as 'ar' | 'en'}
        role={role}
        route={pathname}
        userName={userName}
      />
      <ChatWidget />
      <LoginNotification />
    </div>
  );
}