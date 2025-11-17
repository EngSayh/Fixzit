'use client';

import React, { useState, useEffect } from 'react';
import { useTopBar } from '@/contexts/TopBarContext';
import { APPS, type AppKey } from '@/config/topbar-modules';
import { useTranslation } from '@/contexts/TranslationContext';
import Link from 'next/link';
import { ChevronDown, Building2, Store, Landmark } from 'lucide-react';

const appIcons = {
  fm: Building2,
  souq: Store,
  aqar: Landmark,
};

export default function AppSwitcher() {
  const { app, setApp } = useTopBar();
  const { t, isRTL } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const Icon = appIcons[app];
  const appList = Object.values(APPS);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (open && !target.closest('.app-switcher-container')) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      switch (event.key) {
        case 'Escape':
          setOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((prev) => (prev + 1) % appList.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex((prev) => (prev - 1 + appList.length) % appList.length);
          break;
        case 'Enter':
        case ' ':
          {
            event.preventDefault();
            const selectedApp = appList[activeIndex];
            if (selectedApp) {
              setApp(selectedApp.id);
              setOpen(false);
            }
            break;
          }
        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setActiveIndex(appList.length - 1);
          break;
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, activeIndex, appList, setApp]);

  // Get translated app name
  const getAppName = (appId: string) => {
    const appConfig = APPS[appId as AppKey];
    // FIX: Use labelKey instead of label
    return t(appConfig?.labelKey || `app.${appId}`, 'Unknown App');
  };

  return (
    <div className={`app-switcher-container relative ${isRTL ? 'text-end' : 'text-start'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        aria-label={t('app.switchApplication', 'Switch application')}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="app-switcher-menu"
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{getAppName(app)}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div 
          id="app-switcher-menu"
          role="menu"
          aria-label={t('app.switchApplication', 'Switch Application')}
          className={`absolute ${isRTL ? 'end-0' : 'start-0'} top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-popover rounded-lg shadow-2xl border border-border z-[100] animate-in slide-in-from-top-2 duration-200`}
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Arrow pointer */}
          <div className={`hidden md:block absolute -top-2 w-3 h-3 bg-popover border-l border-t border-border transform rotate-45 ${isRTL ? 'end-8' : 'start-8'}`}></div>
          
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">{t('app.switchApplication', 'Switch Application')}</h3>
          </div>
          <div className="p-2 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {appList.map((appConfig, idx) => {
              const AppIcon = appIcons[appConfig.id];
              const isActive = app === appConfig.id;
              const isFocused = idx === activeIndex;
              
              return (
                <Link
                  key={appConfig.id}
                  href={appConfig.routePrefix}
                  role="menuitem"
                  tabIndex={isFocused ? 0 : -1}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setApp(appConfig.id);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center gap-3 p-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors ${
                    isActive ? 'bg-accent/50 text-primary' : 'text-foreground'
                  } ${isFocused ? 'ring-2 ring-primary ring-inset' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <AppIcon className="w-5 h-5" aria-hidden="true" />
                  <div className={`flex-1 ${isRTL ? 'text-end' : 'text-start'}`}>
                    <div className="font-medium text-sm">{getAppName(appConfig.id)}</div>
                    <div className="text-xs text-muted-foreground" aria-label={`${Array.isArray(appConfig.searchEntities) ? appConfig.searchEntities.length : 0} ${t('app.searchableEntities', 'searchable entities')}`}>
                      {Array.isArray(appConfig.searchEntities) ? appConfig.searchEntities.length : 0} {t('app.searchableEntities', 'modules')}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-primary" aria-label={t('app.currentApp', 'Current application')}></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
