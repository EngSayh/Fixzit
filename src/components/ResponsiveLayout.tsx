'use client&apos;;

import React, { useState, useEffect } from &apos;react&apos;;
import { useResponsive } from &apos;@/src/contexts/ResponsiveContext&apos;;
import { Menu, X } from &apos;lucide-react&apos;;

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  showSidebarToggle?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function ResponsiveLayout({
  children,
  sidebar,
  showSidebarToggle = true,
  header,
  footer,
  className = &apos;'
}: ResponsiveLayoutProps) {
  const { screenInfo, responsiveClasses } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on mobile when screen size changes to desktop
  useEffect(() => {
    if (!screenInfo.isMobile && !screenInfo.isTablet && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [screenInfo.isMobile, screenInfo.isTablet, sidebarOpen]);

  const showSidebar = sidebar && (screenInfo.isDesktop || screenInfo.isLarge || sidebarOpen);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      {header && (
        <div className="sticky top-0 z-40">
          {header}
        </div>
      )}

      {/* Mobile sidebar toggle */}
      {sidebar && showSidebarToggle && (screenInfo.isMobile || screenInfo.isTablet) && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-16 left-4 z-50 p-2 bg-[#0061A8] text-white rounded-md shadow-lg md:hidden"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      <div className="flex">
        {/* Sidebar */}
        {sidebar && (
          <div className={`
            ${showSidebar ? &apos;translate-x-0&apos; : &apos;-translate-x-full&apos;}
            ${screenInfo.isMobile || screenInfo.isTablet ? &apos;fixed inset-y-0 left-0 z-40&apos; : &apos;relative&apos;}
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

        {/* Main content */}
        <main className={`
          flex-1 transition-all duration-300
          ${sidebar && (screenInfo.isMobile || screenInfo.isTablet) && sidebarOpen ? &apos;ml-0&apos; : &apos;'}
          ${sidebar && screenInfo.isDesktop ? &apos;ml-0&apos; : &apos;'}
        `}>
          <div className={`${responsiveClasses.container} py-6`}>
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-auto">
          {footer}
        </div>
      )}
    </div>
  );
}

// Responsive card component
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: &apos;none&apos; | 'small&apos; | &apos;medium&apos; | &apos;large&apos;;
  hover?: boolean;
}

export function ResponsiveCard({
  children,
  className = &apos;',
  padding = &apos;medium&apos;,
  hover = true
}: ResponsiveCardProps) {
  const { screenInfo } = useResponsive();

  const getPaddingClass = () => {
    switch (padding) {
      case &apos;none&apos;: return &apos;';
      case 'small&apos;: return screenInfo.isMobile ? &apos;p-3&apos; : &apos;p-4&apos;;
      case &apos;medium&apos;: return screenInfo.isMobile ? &apos;p-4&apos; : &apos;p-6&apos;;
      case &apos;large&apos;: return screenInfo.isMobile ? &apos;p-5&apos; : &apos;p-8&apos;;
      default: return screenInfo.isMobile ? &apos;p-4&apos; : &apos;p-6&apos;;
    }
  };

  return (
    <div className={`
      bg-white rounded-lg shadow-md border border-gray-200
      ${getPaddingClass()}
      ${hover ? &apos;hover:shadow-lg transition-shadow duration-200&apos; : &apos;'}
      ${className}
    `}>
      {children}
    </div>
  );
}

// Responsive button component
interface ResponsiveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: &apos;primary&apos; | 'secondary&apos; | &apos;outline&apos; | &apos;ghost&apos;;
  size?: 'small&apos; | &apos;medium&apos; | &apos;large&apos;;
  disabled?: boolean;
  className?: string;
}

export function ResponsiveButton({
  children,
  onClick,
  variant = &apos;primary&apos;,
  size = &apos;medium&apos;,
  disabled = false,
  className = &apos;'
}: ResponsiveButtonProps) {
  const { screenInfo } = useResponsive();

  const getVariantClass = () => {
    switch (variant) {
      case &apos;primary&apos;:
        return &apos;bg-[#0061A8] hover:bg-[#005a9e] text-white&apos;;
      case 'secondary&apos;:
        return &apos;bg-[#00A859] hover:bg-[#009147] text-white&apos;;
      case &apos;outline&apos;:
        return &apos;border-2 border-[#0061A8] text-[#0061A8] hover:bg-[#0061A8] hover:text-white&apos;;
      case &apos;ghost&apos;:
        return &apos;text-[#0061A8] hover:bg-[#0061A8] hover:text-white&apos;;
      default:
        return &apos;bg-[#0061A8] hover:bg-[#005a9e] text-white&apos;;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small&apos;:
        return screenInfo.isMobile ? &apos;px-3 py-1.5 text-sm&apos; : &apos;px-4 py-2 text-sm&apos;;
      case &apos;medium&apos;:
        return screenInfo.isMobile ? &apos;px-4 py-2 text-sm&apos; : &apos;px-6 py-3 text-base&apos;;
      case &apos;large&apos;:
        return screenInfo.isMobile ? &apos;px-5 py-3 text-base&apos; : &apos;px-8 py-4 text-lg&apos;;
      default:
        return screenInfo.isMobile ? &apos;px-4 py-2 text-sm&apos; : &apos;px-6 py-3 text-base&apos;;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-md font-medium transition-all duration-200
        ${getVariantClass()}
        ${getSizeClass()}
        ${disabled ? &apos;opacity-50 cursor-not-allowed&apos; : &apos;cursor-pointer&apos;}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
