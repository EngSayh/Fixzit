'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useTopBar } from '@/contexts/TopBarContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { MODULES } from '@/config/navigation';
import { cn } from '@/lib/utils';

export function TopMegaMenu() {
  const { navKey, megaMenuCollapsed, setMegaMenuCollapsed } = useTopBar();
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  if (megaMenuCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setMegaMenuCollapsed(false)}
        className="hidden xl:inline-flex items-center gap-1 rounded-full border border-white/30 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
        aria-label={t('topbar.expandMenu', 'Show module menu')}
      >
        ▸ {t('topbar.modules', 'Modules')}
      </button>
    );
  }

  return (
    <div className="hidden xl:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
      <span className="text-[11px] uppercase tracking-wide text-white/70">
        {t('topbar.modules', 'Modules')}
      </span>
      <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
        {MODULES.map(({ id, name, fallbackLabel, path }) => {
          const active = navKey === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => router.push(path)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition-colors',
                active
                  ? 'bg-white text-primary font-semibold'
                  : 'text-white/80 hover:bg-white/20'
              )}
            >
              {t(name, fallbackLabel)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setMegaMenuCollapsed(true)}
        className="ms-2 inline-flex items-center rounded-full border border-white/30 px-2 py-1 text-white/70 hover:bg-white/10 transition-colors"
        aria-label={t('topbar.collapseMenu', 'Hide module menu')}
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );
}
