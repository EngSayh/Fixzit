'use client&apos;;

import { useTopBar } from &apos;@/src/contexts/TopBarContext&apos;;
import { APPS } from &apos;@/src/config/topbar-modules&apos;;
import Link from &apos;next/link&apos;;
import { ChevronDown, Building2, Store, Landmark } from &apos;lucide-react&apos;;
import { useState } from &apos;react&apos;;

const appIcons = {
  fm: Building2,
  souq: Store,
  aqar: Landmark,
};

export default function AppSwitcher() {
  const { app, setApp } = useTopBar();
  const [open, setOpen] = useState(false);

  const currentApp = APPS[app];
  const Icon = appIcons[app];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors"
        aria-label="Switch application"
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{currentApp.label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Switch Application</h3>
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
                  className={`flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors ${
                    isActive ? &apos;bg-blue-50 text-blue-600&apos; : &apos;text-gray-700&apos;
                  }`}
                >
                  <AppIcon className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{appConfig.label}</div>
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