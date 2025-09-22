'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TopBar from './TopBar';
import RoleSidebar from './navigation/RoleSidebar';
import Footer from './Footer';
import HelpWidget from './HelpWidget';
import KnowledgeWidget from './help/KnowledgeWidget';
import AutoFixInitializer from './AutoFixInitializer';
import ErrorTest from './ErrorTest';
import ResponsiveLayout from './ResponsiveLayout';
import { useResponsive } from '@/src/contexts/ResponsiveContext';
import { useI18n } from '@/src/providers/RootProviders';
import { ModuleKey } from '@/src/lib/rbac';
import ChatWidget from './ai/ChatWidget';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<'SUPER_ADMIN' | 'CORP_ADMIN' | 'MANAGEMENT' | 'FINANCE' | 'HR' | 'CORPORATE_EMPLOYEE' | 'PROPERTY_OWNER' | 'TECHNICIAN' | 'TENANT' | 'VENDOR' | 'GUEST'>('GUEST');
  const [userModules, setUserModules] = useState<ModuleKey[] | undefined>(undefined);
  const [orgOverrides, setOrgOverrides] = useState<Record<string, boolean> | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const publicRoutes = new Set<string>(['/','/about','/privacy','/terms', '/login', '/ar']);
  const isLandingPage = publicRoutes.has(pathname);
  const { screenInfo } = useResponsive();

  // Get i18n context
  const { language, isRTL } = useI18n();

  // Note: Document attributes are now handled by the RootProviders useEffect

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // First check localStorage for cached role
        const cachedRole = localStorage.getItem('fixzit-role');
        const cachedModules = localStorage.getItem('fixzit-modules');
        const cachedOverrides = localStorage.getItem('fixzit-overrides');

        if (cachedRole && cachedRole !== 'guest') {
          setRole(cachedRole as any);
          setUserModules(cachedModules ? JSON.parse(cachedModules) : undefined);
          setOrgOverrides(cachedOverrides ? JSON.parse(cachedOverrides) : undefined);
          setLoading(false);
          return;
        }

        // Fetch current user from API
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Include cookies
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role) {
            const userRole = data.user.role;
            setRole(userRole);
            setUserModules(data.user.modules);
            setOrgOverrides(data.user.orgOverrides);
            // Cache the role in localStorage
            localStorage.setItem('fixzit-role', userRole);
            localStorage.setItem('fixzit-modules', JSON.stringify(data.user.modules));
            localStorage.setItem('fixzit-overrides', JSON.stringify(data.user.orgOverrides));
          }
        } else {
          // If no valid session, ensure role is guest
          setRole('GUEST');
          localStorage.setItem('fixzit-role', 'GUEST');
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        setRole('GUEST');
        localStorage.setItem('fixzit-role', 'GUEST');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
        <TopBar role={role} />
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

      return (
        <div className="min-h-screen bg-[#F9FAFB]">
          <AutoFixInitializer />
          <ResponsiveLayout
            header={<TopBar role={role} />}
            sidebar={!isLandingPage ? <RoleSidebar role={role} userModules={userModules} orgOverrides={orgOverrides} /> : undefined}
            showSidebarToggle={!isLandingPage}
          >
            {children}
          </ResponsiveLayout>
          <HelpWidget />
          <KnowledgeWidget
            orgId="demo-tenant"
            lang={language as 'ar' | 'en'}
            role={role}
            route={pathname}
          />
          <ChatWidget />
          <ErrorTest />
        </div>
      );
}
