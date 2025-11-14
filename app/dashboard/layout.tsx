import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';

// Dynamic imports for client components
const ClientSidebar = dynamic(() => import('@/app/_shell/ClientSidebar'), { ssr: false });
const TopBar = dynamic(() => import('@/components/TopBar'), { ssr: false });

/**
 * Dashboard Layout - AppShell Container
 * 
 * ARCHITECTURE:
 * - AppShell properly isolated to /dashboard routes only
 * - Prevents layout leaks to public pages
 * - Server-side authentication check
 * - Multi-level ErrorBoundary
 * 
 * STRUCTURE:
 * - TopBar: Header with user menu, notifications, search
 * - ClientSidebar: Role-based navigation with live counters
 * - Main: Tab-based content area (no nested routing)
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Server-side authentication check
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TopBar />
        </header>

        {/* AppShell Container */}
        <div className="flex h-screen pt-14">
          {/* Sidebar */}
          <aside className="fixed left-0 top-14 bottom-0 w-64 border-r bg-card overflow-y-auto ltr:border-r rtl:border-l">
            <ClientSidebar />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 ltr:ml-64 rtl:mr-64 overflow-y-auto">
            <ErrorBoundary>
              <div className="container mx-auto p-6 max-w-7xl">
                {children}
              </div>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
