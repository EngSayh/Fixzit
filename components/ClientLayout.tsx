'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import dynamic from 'next/dynamic';
import AutoFixInitializer from './AutoFixInitializer';
import ErrorTest from './ErrorTest';
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
  const isLandingPage = publicRoutes.has(pathname);
  // Safe translation access with fallback
  let language = 'ar';
  let isRTL = false;

  try {
    const translationContext = useTranslation();
    language = translationContext.language;
    isRTL = translationContext.isRTL;
  } catch (error) {
    console.warn('Translation context not available in ClientLayout:', error);
  }

  // Update document attributes when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // First check localStorage for cached role
        const cachedRole = localStorage.getItem('fixzit-role');
        if (cachedRole && cachedRole !== 'guest') {
          setRole(cachedRole);
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
        console.log("📊 [ClientLayout] Fetched user from API:", data.user);
            setRole(userRole);
            console.log("✅ [ClientLayout] Setting role to:", userRole);
            // Cache the role in localStorage
            localStorage.setItem('fixzit-role', userRole);
          }
        } else {
          // If no valid session, ensure role is guest
          setRole('guest');
          localStorage.setItem('fixzit-role', 'guest');
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        setRole('guest');
        localStorage.setItem('fixzit-role', 'guest');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [pathname]); // Re-fetch role when pathname changes (e.g., after login navigation)

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

  const CopilotWidget = dynamic(() => import('./CopilotWidget'), { ssr: false });

  // Only render sidebar if user has a valid role (not guest) and not on landing page
  const shouldShowSidebar = !isLandingPage && role !== 'guest';
  console.log("🎯 [ClientLayout] shouldShowSidebar:", shouldShowSidebar, "| role:", role, "| isLandingPage:", isLandingPage);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <AutoFixInitializer />
      <ResponsiveLayout
        header={<TopBar role={role} />}
        sidebar={shouldShowSidebar ? <Sidebar role={role} subscription="ENTERPRISE" tenantId="demo-tenant" /> : undefined}
        showSidebarToggle={shouldShowSidebar}
        footer={<Footer />}
      >
        {children}
      </ResponsiveLayout>
      <PreferenceBroadcast />
      <CopilotWidget />
      <ErrorTest />
      <AutoIncidentReporter />
    </div>
  );
}

