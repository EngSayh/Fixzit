"use client";

import React from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import type { BadgeCounts } from "@/config/navigation";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  badgeCounts?: BadgeCounts;
}

/**
 * Ejar-styled application shell.
 * Fixed top header, right-anchored sidebar (RTL-first), 8px grid spacing.
 */
export function AppShell({
  children,
  pageTitle,
  pageSubtitle,
  badgeCounts,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-app-background)] text-foreground">
      <ResponsiveLayout
        header={<TopBar />}
        sidebar={<Sidebar badgeCounts={badgeCounts} />}
        showSidebarToggle
      >
        <main
          id="main-content"
          className="px-6 py-6 space-y-6 bg-[var(--color-app-background)]"
        >
          {pageTitle && (
            <header className="space-y-1">
              <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  {pageSubtitle}
                </p>
              )}
            </header>
          )}
          {children}
        </main>
      </ResponsiveLayout>
    </div>
  );
}

export default AppShell;
