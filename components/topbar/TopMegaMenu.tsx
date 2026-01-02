'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from '@/components/ui/icons';
import { useTopBar } from '@/contexts/TopBarContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { MODULES } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

export function TopMegaMenu() {
  const { navKey, megaMenuCollapsed, setMegaMenuCollapsed } = useTopBar();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const rawRole = (session?.user as { role?: string } | undefined)?.role;
  // STRICT v4.1: Check canonical roles first, then legacy aliases for migration period
  const canSeeAdmin = (rawRole || '').toUpperCase() === 'SUPER_ADMIN' || (rawRole || '').toUpperCase() === 'ADMIN' || (rawRole || '').toUpperCase() === 'CORPORATE_ADMIN';

  if (megaMenuCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setMegaMenuCollapsed(false)}
        className="hidden xl:inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        aria-label={t('topbar.expandMenu', 'Show module menu')}
      >
        ▸ {t('topbar.modules', 'Modules')}
      </button>
    );
  }

  return (
    <div className="hidden xl:flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-foreground">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {t('topbar.modules', 'Modules')}
      </span>
      <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
        {MODULES.filter(({ id }) => {
          if ((id === 'administration' || id === 'system') && !canSeeAdmin) return false;
          return true;
        }).map(({ id, name, fallbackLabel, path }) => {
          const active = navKey === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => router.push(path)}
              aria-label={t(name, fallbackLabel)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground/80 hover:bg-muted'
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
        className="ms-2 inline-flex items-center rounded-full border border-border px-2 py-1 text-muted-foreground hover:bg-muted transition-colors"
        aria-label={t('topbar.collapseMenu', 'Hide module menu')}
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );
}
