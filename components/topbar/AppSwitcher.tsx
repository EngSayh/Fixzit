'use client';

import { useTopBar } from '@/contexts/TopBarContext';
import { APPS, type AppKey } from '@/config/topbar-modules';
import { useTranslation } from '@/contexts/TranslationContext';
import Link from 'next/link';
import { ChevronDown, Building2, Store, Landmark } from 'lucide-react';
import { useState, useEffect } from 'react';

const appIcons = {
  fm: Building2,
  souq: Store,
  aqar: Landmark,
};

export default function AppSwitcher() {
  const { app, setApp } = useTopBar();
  const { t, isRTL } = useTranslation();
  const [open, setOpen] = useState(false);

  const Icon = appIcons[app];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (open && !target.closest('.app-switcher-container')) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') {
        setOpen(false);
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
  }, [open]);

  // Get translated app name
  const getAppName = (appId: string) => {
    const appConfig = APPS[appId as AppKey];
    return t(`app.${appId}`, appConfig?.label || 'Unknown App');
  };

  return (
    <div className={`app-switcher-container relative ${isRTL ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        aria-label={t('app.switchApplication', 'Switch application')}
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{getAppName(app)}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] animate-in slide-in-from-top-2 duration-200`}>
          {/* Arrow pointer */}
          <div className={`hidden md:block absolute -top-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45 ${isRTL ? 'right-8' : 'left-8'}`}></div>
          
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('app.switchApplication', 'Switch Application')}</h3>
          </div>
          <div className="p-2 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {Object.values(APPS).map((appConfig) => {
              const AppIcon = appIcons[appConfig.id];
              const isActive = app === appConfig.id;
              
              return (
                <Link
                  key={appConfig.id}
                  href={appConfig.routePrefix}
                  onClick={() => {
                    setApp(appConfig.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  } ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <AppIcon className="w-5 h-5" />
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="font-medium text-sm">{getAppName(appConfig.id)}</div>
                    <div className="text-xs text-gray-500">
                      {Array.isArray(appConfig.searchEntities) ? appConfig.searchEntities.length : 0} {t('app.searchableEntities', 'searchable entities')}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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
