"use client";

import React from 'react';
import Link from 'next/link';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../../contexts/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from '../notifications/NotificationBell';
import { GlassButton, GlassInput } from '../theme';

interface PageInfo {
  title: string;
  breadcrumbs: Array<{ name: string; href: string }>;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface HeaderProps {
  pageInfo: PageInfo;
}

export default function Header({ pageInfo }: HeaderProps) {
  const { isRTL } = useTranslation();

  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-white/10 flex items-center justify-between px-6 backdrop-blur-xl">
      {/* Left Section - Page Title & Breadcrumbs */}
      <div className={`flex items-center gap-4 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Page Icon & Title */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            pageInfo.color.includes('primary') ? 'bg-primary-100' :
            pageInfo.color.includes('orange') ? 'bg-orange-100' :
            pageInfo.color.includes('green') ? 'bg-green-100' :
            pageInfo.color.includes('yellow') ? 'bg-yellow-100' :
            'bg-gray-100'
          }`}>
            <pageInfo.icon className={`w-4 h-4 ${pageInfo.color}`} />
          </div>
          <h1 className={`text-xl font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
            {pageInfo.title}
          </h1>
        </div>
        
        {/* Breadcrumbs */}
        {pageInfo.breadcrumbs.length > 1 && (
          <nav className={`flex items-center gap-2 text-sm text-white/70 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {pageInfo.breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {index > 0 && (
                  <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                )}
                <Link 
                  href={crumb.href}
                  className="hover:text-white transition-colors"
                >
                  {crumb.name}
                </Link>
              </div>
            ))}
          </nav>
        )}
      </div>
      
      {/* Right Section - Actions & User */}
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Enhanced Global Search */}
        <div className="relative hidden md:block">
          <GlassInput
            placeholder="Search..."
            variant="search"
            containerClassName="w-64"
            className="text-white placeholder-white/60"
          />
        </div>
        
        {/* Enhanced Quick Add Button */}
        <GlassButton
          size="md"
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          className="text-white border-white/30 hover:border-white/50"
        >
          <span className="text-sm font-medium hidden sm:block">Add</span>
        </GlassButton>
        
        {/* Language Switcher */}
        <LanguageSwitcher />
        
        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
}