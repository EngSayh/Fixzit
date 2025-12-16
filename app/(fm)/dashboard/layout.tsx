import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logger } from "@/lib/logger";

// Dynamic imports for client components
const ClientSidebar = dynamic(() => import("@/app/_shell/ClientSidebar"));
const TopBar = dynamic(() => import("@/components/TopBar"));

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
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-side authentication check
  const session = await auth();
  // BUG-001 FIX: Add logging + strict production guard to security bypass
  const allowTestBypass = 
    process.env.ALLOW_DASHBOARD_TEST_AUTH === "true" && 
    process.env.NODE_ENV !== 'production';
  
  if (allowTestBypass) {
    logger.warn('⚠️  Dashboard auth bypass enabled - TEST MODE ONLY', {
      component: 'DashboardLayout',
      env: process.env.NODE_ENV
    });
  }

  if (!session && !allowTestBypass) {
    redirect("/login");
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 inset-x-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TopBar />
        </header>

        {/* AppShell Container */}
        <div className="flex h-screen pt-14">
          {/* Sidebar */}
          <aside className="fixed start-0 top-14 bottom-0 w-64 border-s bg-card overflow-y-auto">
            <ClientSidebar />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 ms-64 overflow-y-auto">
            <ErrorBoundary>
              <div className="container mx-auto p-6 max-w-7xl">{children}</div>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
