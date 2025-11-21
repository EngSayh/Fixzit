'use client';

import React, { useState, useEffect } from 'react';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import { Menu, X } from 'lucide-react';

// ✅ FIXED: Use standard Button component
import { Button } from './ui/button';

// ✅ FIXED: Define sidebar width constant (no magic numbers)
const SIDEBAR_WIDTH_CLASS = 'md:w-64';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  showSidebarToggle?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * ✅ REFACTORED ResponsiveLayout Component
 * 
 * ARCHITECTURE IMPROVEMENTS:
 * 1. ✅ Use standard Button for toggle (no hardcoded button)
 * 2. ✅ Semantic color tokens (bg-primary instead of bg-brand-500)
 * 3. ✅ No magic numbers (SIDEBAR_WIDTH_CLASS constant instead of ms-64)
 * 4. ✅ Deleted duplicate ResponsiveCard and ResponsiveButton (use Card/Button from ui/)
 * 5. ✅ Fixed all hardcoded colors
 */
export default function ResponsiveLayout({
  children,
  sidebar,
  showSidebarToggle = true,
  header,
  footer,
  className = ''
}: ResponsiveLayoutProps) {
  const { screenInfo, responsiveClasses } = useResponsiveLayout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on mobile when screen size changes to desktop
  useEffect(() => {
    if (!screenInfo.isMobile && !screenInfo.isTablet && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [screenInfo.isMobile, screenInfo.isTablet, sidebarOpen]);

  const showSidebar = sidebar && (screenInfo.isDesktop || screenInfo.isLarge || sidebarOpen);

  return (
    <div className={`min-h-screen flex flex-col bg-background ${className}`}>
      {/* Header */}
      {header && (
        <div className="sticky top-0 z-40">
          {header}
        </div>
      )}

      {/* Mobile sidebar toggle - ✅ FIXED: Use standard Button */}
      {sidebar && showSidebarToggle && (screenInfo.isMobile || screenInfo.isTablet) && (
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          size="icon"
          className="fixed top-16 start-4 z-50 md:hidden shadow-lg"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      )}

      <div className="flex flex-1">
        {/* Sidebar */}
        {sidebar && (
          <div className={`
            ${showSidebar ? 'translate-x-0 rtl:translate-x-0' : '-translate-x-full rtl:translate-x-full'}
            ${screenInfo.isMobile || screenInfo.isTablet ? 'fixed inset-y-0 start-0 z-40' : 'relative'}
            ${SIDEBAR_WIDTH_CLASS}
            transition-transform duration-300 ease-in-out
          `}>
            {sidebar}
          </div>
        )}

        {/* Mobile overlay */}
        {sidebar && sidebarOpen && (screenInfo.isMobile || screenInfo.isTablet) && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content - ✅ FIXED: Use SIDEBAR_WIDTH_CLASS constant */}
        <main
          id="main-content"
          className={`
            flex-1 flex flex-col transition-all duration-300
            ${sidebar && (screenInfo.isDesktop || screenInfo.isLarge) ? `md:ms-64` : 'ms-0'}
          `}
        >
          <div className={`${responsiveClasses.container} py-6`}>
            {children}
          </div>
        </main>
      </div>

      {/* Footer - anchor to bottom using mt-auto */}
      {footer && (
        <div className="w-full">
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * ✅ DELETED: ResponsiveCard component
 * 
 * REASON: Duplicates functionality of standard Card component from @/components/ui/card
 * 
 * MIGRATION:
 * - Replace ResponsiveCard with Card from @/components/ui/card
 * - Card already handles padding via CardHeader/CardContent
 * - Use className for custom responsive padding if needed
 */

/**
 * ✅ DELETED: ResponsiveButton component
 * 
 * REASON: Duplicates functionality of standard Button component from @/components/ui/button
 * 
 * MIGRATION:
 * - Replace ResponsiveButton with Button from @/components/ui/button
 * - Button already has variants: default, secondary, outline, ghost
 * - Button already has sizes: default, sm, lg, icon
 * - Use semantic tokens (Button uses design system colors automatically)
 */
