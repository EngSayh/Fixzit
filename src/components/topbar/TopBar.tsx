// src/components/topbar/TopBar.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { useAppScope } from '@/src/contexts/AppScopeContext';
import ModuleSearch from './ModuleSearch';
import LanguageMenu from './LanguageMenu';
import NotificationsMenu from './NotificationsMenu';
import QuickActions from './QuickActions';
import TopMenu from './TopMenu';

// Brand tokens per governance (blue/green/yellow).
export default function TopBar() {
  const { moduleLabel, language } = useAppScope();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white">
      <div className="flex items-center gap-3 px-3 h-14">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[#0061A8]" aria-label="Fixzit Home">
          <span className="inline-block h-5 w-5 rounded bg-[#FFB400]" />
          <span>Fixzit Enterprise</span>
        </Link>

        {/* Top menu */}
        <TopMenu />

        {/* Module chip */}
        <span className="ml-2 px-2 py-1 text-xs rounded bg-slate-100">{moduleLabel}</span>

        {/* Search (flex grow) */}
        <div className="flex-1 flex justify-center">
          <ModuleSearch />
        </div>

        {/* Quick Actions (RBAC: supply user perms from session) */}
        <QuickActions perms={['wo.create','prop.create','fin.invoice.create','re.listing.create','mat.product.create']} />

        {/* Notifications */}
        <NotificationsMenu />

        {/* Language */}
        <LanguageMenu />

        {/* User menu (placeholder) */}
        <button className="ml-1 px-3 py-2 rounded hover:bg-slate-100" aria-label={language==='ar'?'القائمة':'User menu'}>👤</button>
      </div>
    </header>
  );
}
