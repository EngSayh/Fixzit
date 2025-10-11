'use client';

import { useTopBar } from '@/contexts/TopBarContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { APPS } from '@/config/topbar-modules';
import Link from 'next/link';
import { ChevronDown, Building2, Store, Landmark } from 'lucide-react';
import { useState } from 'react';

const appIcons = {
  fm: Building2,
  souq: Store,
  aqar: Landmark,
};

export default function AppSwitcher() {
  const { app, setApp } = useTopBar();
  const [open, setOpen] = useState(false);
  const { t, isRTL } = useTranslation();

  const currentApp = APPS[app];
  const Icon = appIcons[app];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        aria-label={t('topbar.switchApplication', 'Switch application')}
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{t(`apps.${app}.label`, currentApp.label)}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${isRTL ? 'text-right' : ''}`}>
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('topbar.switchApplication', 'Switch Application')}</h3>
          </div>
          <div className="p-2">
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
                  className={`flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''} ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <AppIcon className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{t(`apps.${appConfig.id}.label`, appConfig.label)}</div>
                    <div className="text-xs text-gray-500">
                      {appConfig.searchEntities.length} searchable entities
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
