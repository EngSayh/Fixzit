"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { Locale } from "@/i18n/config";
import React, { type ReactNode, useEffect } from "react";
import { SuperadminSidebar } from "./SuperadminSidebar";
import { SuperadminHeader } from "./SuperadminHeader";
import { SystemStatusBar } from "./SystemStatusBar";
import { CommandPalette } from "./CommandPalette";
import {
  SuperadminSessionProvider,
  type SuperadminSessionState,
} from "./superadmin-session";

type Props = {
  children: ReactNode;
  initialLocale: Locale;
  initialDict: Record<string, unknown>;
  initialSession?: SuperadminSessionState;
};

export function SuperadminLayoutClient({
  children,
  initialLocale,
  initialDict,
  initialSession = null,
}: Props) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/superadmin/login";
  const isAuthenticated = initialSession?.authenticated ?? false;
  const [showTimeout, setShowTimeout] = React.useState(false);

  useEffect(() => {
    if (isLoginPage) return;
    if (!isAuthenticated) {
      // Set timeout to show helpful message if redirect takes too long
      const timeout = setTimeout(() => setShowTimeout(true), 3000);
      // Force full page navigation to ensure cookies are sent
      window.location.href = "/superadmin/login";
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, isLoginPage]);

  // Show loading state while redirecting to login
  if (!isLoginPage && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
          <p className="text-slate-400">
            {showTimeout ? "Redirecting to login..." : "Verifying session..."}
          </p>
          {showTimeout && (
            <a
              href="/superadmin/login"
              className="mt-4 inline-block text-blue-400 hover:text-blue-300 underline"
            >
              Click here if not redirected
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <SuperadminSessionProvider value={initialSession}>
        <ThemeProvider>
          <I18nProvider initialLocale={initialLocale} initialDict={initialDict}>
            <CurrencyProvider>
              {isLoginPage ? (
                <div className="min-h-screen bg-background">{children}</div>
              ) : (
                <>
                  <div className="min-h-screen bg-background flex pb-7">
                    {/* Sidebar */}
                    <SuperadminSidebar />

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col">
                      {/* Header */}
                      <SuperadminHeader />

                      {/* Page Content */}
                      <main className="flex-1 overflow-auto">{children}</main>
                    </div>
                  </div>
                  
                  {/* System Status Bar - Replaces marketing footer */}
                  <SystemStatusBar />
                  
                  {/* Command Palette (Cmd+K) */}
                  <CommandPalette />
                </>
              )}
            </CurrencyProvider>
          </I18nProvider>
        </ThemeProvider>
      </SuperadminSessionProvider>
    </SessionProvider>
  );
}
