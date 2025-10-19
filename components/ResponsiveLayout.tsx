'use client';

import React, { useState, useEffect } from 'react';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import { Menu, X } from 'lucide-react';

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
    <div className={`min-h-screen flex flex-col bg-gray-50 ${className}`}>
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

      <div className="flex flex-1">
        {/* Sidebar */}
        {sidebar && (
          <div className={`
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
            ${screenInfo.isMobile || screenInfo.isTablet ? 'fixed inset-y-0 left-0 z-40' : 'relative'}
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
          flex-1 flex flex-col transition-all duration-300
          ${sidebar && (screenInfo.isMobile || screenInfo.isTablet) && sidebarOpen ? 'ml-0' : ''}
          ${sidebar && screenInfo.isDesktop ? 'ml-0' : ''}
        `}>
          <div className="flex-1 flex flex-col">
            <div className={`${responsiveClasses.container} py-6 flex-1`}>
              {children}
            </div>
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

// Responsive card component
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  hover?: boolean;
}

export function ResponsiveCard({
  children,
  className = '',
  padding = 'medium',
  hover = true
}: ResponsiveCardProps) {
  const { screenInfo } = useResponsiveLayout();

  const getPaddingClass = () => {
    switch (padding) {
      case 'none': return '';
      case 'small': return screenInfo.isMobile ? 'p-3' : 'p-4';
      case 'medium': return screenInfo.isMobile ? 'p-4' : 'p-6';
      case 'large': return screenInfo.isMobile ? 'p-5' : 'p-8';
      default: return screenInfo.isMobile ? 'p-4' : 'p-6';
    }
  };

  return (
    <div className={`
      bg-white rounded-lg shadow-md border border-gray-200
      ${getPaddingClass()}
      ${hover ? 'hover:shadow-lg transition-shadow duration-200' : ''}
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
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
}

export function ResponsiveButton({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = ''
}: ResponsiveButtonProps) {
  const { screenInfo } = useResponsiveLayout();

  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#0061A8] hover:bg-[#005a9e] text-white';
      case 'secondary':
        return 'bg-[#00A859] hover:bg-[#009147] text-white';
      case 'outline':
        return 'border-2 border-[#0061A8] text-[#0061A8] hover:bg-[#0061A8] hover:text-white';
      case 'ghost':
        return 'text-[#0061A8] hover:bg-[#0061A8] hover:text-white';
      default:
        return 'bg-[#0061A8] hover:bg-[#005a9e] text-white';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return screenInfo.isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';
      case 'medium':
        return screenInfo.isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base';
      case 'large':
        return screenInfo.isMobile ? 'px-5 py-3 text-base' : 'px-8 py-4 text-lg';
      default:
        return screenInfo.isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base';
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
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
