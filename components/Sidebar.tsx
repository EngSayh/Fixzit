'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import { type UserRoleType } from '@/types/user';
import { Headphones } from 'lucide-react';

// ✅ FIX: Import configuration from centralized config file (Governance V5 compliance)
import {
  MODULES,
  USER_LINKS,
  ROLE_PERMISSIONS,
  SUBSCRIPTION_PLANS,
  CATEGORY_FALLBACKS,
  type ModuleItem
} from '@/config/navigation';

// ✅ FIX: Remove props - role and subscription derived from session (single source of truth)
interface SidebarProps {
  tenantId?: string; // Optional, kept for potential future use
}

 
export default function Sidebar({ tenantId: _tenantId }: SidebarProps) {
  const pathname = usePathname();
   
  const { responsiveClasses: _responsiveClasses, screenInfo } = useResponsiveLayout();

  // hooks must be top-level
  const { t, isRTL: translationIsRTL } = useTranslation();
  const { data: session, status } = useSession();

  // ✅ FIX: Derive role and subscription directly from session (single source of truth)
  const isAuthenticated = status === 'authenticated' && session != null;
  
  // Extract role from session - ensure it's a valid UserRoleType or 'guest'
  // @ts-expect-error: NextAuth session.user may have custom properties
  const role: UserRoleType | 'guest' = isAuthenticated ? (session.user?.role || 'VIEWER') : 'guest';
  
  // Extract subscription plan from session - default to 'DEFAULT' for unknown plans
  // @ts-expect-error: NextAuth session.user may have custom properties
  const subscription: string = isAuthenticated ? (session.user?.subscriptionPlan || 'DEFAULT') : 'DEFAULT';

  const active = useMemo(() => pathname || '', [pathname]);

  const allowedModules = useMemo(() => {
    const roleModules = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
    const subscriptionModules = SUBSCRIPTION_PLANS[subscription as keyof typeof SUBSCRIPTION_PLANS] ?? [];
    const allowedIds = new Set<string>(subscriptionModules.filter(id => (roleModules as readonly string[]).includes(id)));
    return MODULES.filter(m => allowedIds.has(m.id));
  }, [role, subscription]);

  const groupedModules = useMemo(() => {
    return allowedModules.reduce((acc, m) => {
      (acc[m.category] ||= []).push(m);
      return acc;
    }, {} as Record<string, ModuleItem[]>);
  }, [allowedModules]);

  const getCategoryName = (category: string) => t(`sidebar.category.${category}`, CATEGORY_FALLBACKS[category as keyof typeof CATEGORY_FALLBACKS] || category);

  const asideBase =
    screenInfo.isMobile || screenInfo.isTablet
      ? `fixed inset-y-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${translationIsRTL ? 'end-0' : 'start-0'}`
      : 'sticky top-14 w-64 h-[calc(100vh-3.5rem)]';

  return (
    <aside
      className={`${asideBase} bg-primary text-primary-foreground overflow-y-auto shadow-lg border-primary/20 ${translationIsRTL ? 'border-l' : 'border-r'}`}
      aria-label={t('sidebar.mainNav', 'Main navigation')}
      data-testid="sidebar"
    >
      <div className={`${screenInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`font-bold text-lg mb-6 ${translationIsRTL ? 'text-right' : ''}`}>
          {t('common.brand', 'Fixzit Enterprise')}
        </div>

        {/* Role & Plan */}
        {role !== 'guest' && (
          <section aria-label={t('sidebar.accountInfo', 'Account info')} className="mb-4 p-3 bg-primary/20 rounded-2xl border border-primary/30">
            <div className={`text-xs opacity-80 mb-1 ${translationIsRTL ? 'text-right' : ''}`}>{t('sidebar.role', 'Role')}</div>
            <div className={`text-sm font-medium ${translationIsRTL ? 'text-right' : ''}`}>{String(role).replace(/_/g, ' ')}</div>
            <div className={`text-xs opacity-80 mt-1 ${translationIsRTL ? 'text-right' : ''}`}>
              {t('sidebar.planLabel', 'Plan')}: {subscription}
            </div>
          </section>
        )}

        {/* Modules */}
        <nav className="space-y-6 mb-8" aria-label={t('sidebar.modules', 'Modules')}>
          {Object.entries(groupedModules).map(([category, modules]) => (
            <section key={category} aria-label={getCategoryName(category)}>
              <div className="text-xs font-medium opacity-80 mb-2 px-3 uppercase tracking-wider">
                {getCategoryName(category)}
              </div>
              <ul className="space-y-1">
                {modules.map(m => {
                  const Icon = m.icon;
                  const isActive = active === m.path || active.startsWith(m.path + '/');
                  return (
                    <li key={m.id}>
                      <Link
                        href={m.path}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200
                          ${isActive ? 'bg-primary-foreground/10 shadow-md' : 'opacity-80 hover:bg-primary-foreground/10 hover:opacity-100 hover:translate-x-1'}
                          ${translationIsRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                        aria-current={isActive ? 'page' : undefined}
                        data-testid={`nav-${m.id}`}
                        prefetch={false}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
                        <span className="text-sm font-medium">{t(m.name, m.name.replace('nav.', ''))}</span>
                        {isActive && (
                          <span
                            className={`${translationIsRTL ? 'me-auto' : 'ms-auto'} inline-block w-2 h-2 bg-card rounded-full`}
                            aria-hidden
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* Empty state if nothing is allowed */}
          {Object.keys(groupedModules).length === 0 && (
            <p className="px-3 text-xs opacity-80" data-testid="sidebar-empty">
              {t('sidebar.noModules', 'No modules available for your role/plan.')}
            </p>
          )}
        </nav>

        {/* User Account Links */}
        <div className="border-t border-primary-foreground/20 pt-4">
          <div className={`text-xs font-medium opacity-80 mb-3 px-3 uppercase tracking-wider ${translationIsRTL ? 'text-right' : ''}`}>
            {t('sidebar.account', 'Account')}
          </div>
          <ul className="space-y-1" aria-label={t('sidebar.account', 'Account')}>
            {USER_LINKS.map(link => {
              const Icon = link.icon;
              const isActive = active === link.path || active.startsWith(link.path + '/');
              return (
                <li key={link.id}>
                  <Link
                    href={link.path}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200
                      ${isActive ? 'bg-primary-foreground/10 shadow-md' : 'opacity-80 hover:bg-primary-foreground/10 hover:opacity-100 hover:translate-x-1'}
                      ${translationIsRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                    aria-current={isActive ? 'page' : undefined}
                    data-testid={`account-${link.id}`}
                    prefetch={false}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
                    <span className="text-sm font-medium">{t(link.name, link.name.replace('nav.', ''))}</span>
                    {isActive && (
                      <span className={`${translationIsRTL ? 'me-auto' : 'ms-auto'} inline-block w-2 h-2 bg-card rounded-full`} aria-hidden />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Help & Support (auth only) */}
        {isAuthenticated && (
          <div className="border-t border-primary-foreground/20 pt-4 mt-4">
            <div className={`text-xs font-medium opacity-80 mb-3 px-3 uppercase tracking-wider ${translationIsRTL ? 'text-right' : ''}`}>
              {t('sidebar.help', 'Help')}
            </div>
            <Link
              href="/help"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200 opacity-80 hover:bg-primary-foreground/10 hover:opacity-100 hover:translate-x-1 ${translationIsRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
              data-testid="nav-help"
              prefetch={false}
            >
              <Headphones className="w-5 h-5 flex-shrink-0" aria-hidden />
              <span className="text-sm font-medium">{t('sidebar.helpCenter', 'Help Center')}</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
