// src/components/topbar/TopBar.tsx
'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAppScope } from '@/src/contexts/AppScopeContext';
import ModuleSearch from './ModuleSearch';
import LanguageMenu from './LanguageMenu';
import CurrencyMenu from './CurrencyMenu';
import NotificationsMenu from './NotificationsMenu';
import QuickActions from './QuickActions';
import TopMenu from './TopMenu';

// Brand tokens per governance (blue/green/yellow).
export default function TopBar() {
  const { moduleLabel, language } = useAppScope();
  const [marketOpen, setMarketOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const floatingSafeRight = 72; // avoid overlapping with chatbot FAB if present

  // Close menus on outside click / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMarketOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <header className="fixed top-0 z-40 w-full border-b bg-white" role="banner">
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

          {/* Language (STRICT v4 component) */}
          <LanguageMenu />

          {/* Currency */}
          <CurrencyMenu />

          {/* Marketplaces switcher trigger */}
          <button
            className="ml-1 px-3 py-2 rounded bg-[#0061A8] text-white hover:bg-[#0061A8]/90"
            onClick={() => setMarketOpen(true)}
            aria-label={language==='ar'?'الأسواق':'Marketplaces'}
          >{language==='ar'?'الأسواق':'Marketplaces'}</button>

          {/* User menu */}
          <div className="relative" ref={profileRef}>
            <button
              className="ml-1 px-3 py-2 rounded hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label={language==='ar'?'القائمة':'User menu'}
              onClick={() => {
                // close other popovers when opening this
                setMarketOpen(false);
                setProfileOpen(v => !v);
              }}
            >
              👤
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-lg z-[60]"
                style={{ maxHeight: '60vh', overflow: 'auto', marginRight: floatingSafeRight }}
              >
                <a className="block px-3 py-2 hover:bg-gray-50" href="/profile">{language==='ar'?'ملفي الشخصي':'My Profile'}</a>
                <a className="block px-3 py-2 hover:bg-gray-50" href="/settings">{language==='ar'?'الإعدادات':'Settings'}</a>
                <div className="h-px bg-gray-200 my-1" />
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
                  onClick={async()=>{
                    try { await fetch('/api/auth/logout',{ method:'POST' }); } catch {}
                    try {
                      // clear local state to remove badges instantly
                      localStorage.removeItem('fixzit-login-notification');
                      localStorage.removeItem('fixzit-notifications');
                      sessionStorage.clear();
                    } catch {}
                    window.location.href='/login';
                  }}
                >{language==='ar'?'تسجيل الخروج':'Sign out'}</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {marketOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{language==='ar'?'اختر الوجهة':'Choose a destination'}</h3>
              <button onClick={()=>setMarketOpen(false)} className="rounded px-2 py-1 hover:bg-slate-100" aria-label={language==='ar'?'إغلاق':'Close'}>✕</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link href="/fm/dashboard" className="rounded border p-4 hover:bg-slate-50" onClick={()=>setMarketOpen(false)}>
                <div className="font-medium">{language==='ar'?'حل إدارة المرافق من فِكزت':'Fixzit Facility Management'}</div>
                <div className="text-xs opacity-70">{language==='ar'?'الإرسال، اتفاقيات الخدمة، الأصول، العقود.':'Dispatch, SLAs, assets, leases.'}</div>
              </Link>
              <Link href="/aqar" className="rounded border p-4 hover:bg-slate-50" onClick={()=>setMarketOpen(false)}>
                <div className="font-medium">{language==='ar'?'سوق العقار':'Aqar Souq'}</div>
                <div className="text-xs opacity-70">{language==='ar'?'كتالوج عقاري.':'Real estate catalog.'}</div>
              </Link>
              <Link href="/souq" className="rounded border p-4 hover:bg-slate-50" onClick={()=>setMarketOpen(false)}>
                <div className="font-medium">{language==='ar'?'سوق فِكزت':'Fixzit Souq'}</div>
                <div className="text-xs opacity-70">{language==='ar'?'سوق المواد والخدمات.':'Materials & services marketplace.'}</div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
