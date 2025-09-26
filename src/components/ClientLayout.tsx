'use client&apos;;

import { ReactNode, useEffect, useState } from &apos;react&apos;;
import { usePathname } from &apos;next/navigation&apos;;
import TopBar from &apos;./TopBar&apos;;
import Sidebar from &apos;./Sidebar&apos;;
import Footer from &apos;./Footer&apos;;
import HelpWidget from &apos;./HelpWidget&apos;;
import AutoFixInitializer from &apos;./AutoFixInitializer&apos;;
import ErrorTest from &apos;./ErrorTest&apos;;
import ResponsiveLayout from &apos;./ResponsiveLayout&apos;;
import dynamic from &apos;next/dynamic&apos;;
const AutoIncidentReporter = dynamic(() => import(&apos;@/src/components/AutoIncidentReporter&apos;), { ssr: false });
import PreferenceBroadcast from &apos;./PreferenceBroadcast&apos;;
import { useResponsive } from &apos;@/src/contexts/ResponsiveContext&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { TopBarProvider } from &apos;@/src/contexts/TopBarContext&apos;;

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState(&apos;guest&apos;);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const publicRoutes = new Set<string>([&apos;/',&apos;/about&apos;,'/privacy&apos;,'/terms&apos;]);
  const isLandingPage = publicRoutes.has(pathname);
  const { screenInfo } = useResponsive();
  // Safe translation access with fallback
  let language = &apos;ar&apos;;
  let isRTL = false;

  try {
    const translationContext = useTranslation();
    language = translationContext.language;
    isRTL = translationContext.isRTL;
  } catch (error) {
    console.warn(&apos;Translation context not available in ClientLayout:&apos;, error);
  }

  // Update document attributes when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? &apos;rtl&apos; : &apos;ltr&apos;;
  }, [language, isRTL]);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // First check localStorage for cached role
        const cachedRole = localStorage.getItem(&apos;fixzit-role&apos;);
        if (cachedRole && cachedRole !== &apos;guest&apos;) {
          setRole(cachedRole);
          setLoading(false);
          return;
        }

        // Fetch current user from API
        const response = await fetch(&apos;/api/auth/me&apos;, {
          credentials: &apos;include&apos; // Include cookies
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role) {
            const userRole = data.user.role;
            setRole(userRole);
            // Cache the role in localStorage
            localStorage.setItem(&apos;fixzit-role&apos;, userRole);
          }
        } else {
          // If no valid session, ensure role is guest
          setRole(&apos;guest&apos;);
          localStorage.setItem(&apos;fixzit-role&apos;, &apos;guest&apos;);
        }
      } catch (error) {
        console.error(&apos;Failed to fetch user role:&apos;, error);
        setRole(&apos;guest&apos;);
        localStorage.setItem(&apos;fixzit-role&apos;, &apos;guest&apos;);
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
          <main className={`flex-1 flex flex-col overflow-hidden ${isLandingPage ? &apos;w-full&apos; : &apos;'}`}>
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
      <TopBarProvider>
        <ResponsiveLayout
          header={<TopBar role={role} />}
          sidebar={!isLandingPage ? <Sidebar role={role} subscription="PROFESSIONAL" tenantId="demo-tenant" /> : undefined}
          showSidebarToggle={!isLandingPage}
          footer={<Footer />}
        >
          {children}
        </ResponsiveLayout>
        <PreferenceBroadcast />
      </TopBarProvider>
      <HelpWidget />
      <ErrorTest />
      <AutoIncidentReporter />
    </div>
  );
}
