'use client';

import { AppSwitcher } from './topbar/AppSwitcher';
import { GlobalSearch } from './topbar/GlobalSearch';
import { LanguageSelector } from './topbar/LanguageSelector';
import { QuickActions } from './topbar/QuickActions';
import { Notifications } from './topbar/Notifications';
import { UserMenu } from './topbar/UserMenu';
import { TopMegaMenu } from './topbar/TopMegaMenu';
import { useTopBar } from '@/src/contexts/TopBarContext';

interface TopBarProps {
  role?: string;
}

export default function TopBar({ role = 'guest' }: TopBarProps) {
  const { isRTL } = useTopBar();

  return (
    <>
      <header className={`sticky top-0 z-40 h-14 bg-gradient-to-r from-[#023047] via-[#0061A8] to-[#00A859] text-white flex items-center justify-between shadow-sm border-b border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Brand */}
          <div className="font-bold text-lg">
            FIXZIT ENTERPRISE
          </div>
          
          {/* App Switcher */}
          <AppSwitcher />
        </div>

        {/* Search */}
        <GlobalSearch />

        {/* Right side actions */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <QuickActions />
          <Notifications />
          <LanguageSelector />
          <UserMenu />
        </div>
      </header>
      
      {/* Top Mega Menu */}
      <TopMegaMenu />
    </>
  );
}