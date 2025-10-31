'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import { type UserRoleType } from '@/types/user';
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings, UserCheck,
  ShoppingBag, Headphones, Shield, BarChart3, Cog, Bell
} from 'lucide-react';

type LucideIconCmp = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type ModuleItem = {
  id: string;
  name: string;          // i18n key
  icon: LucideIconCmp;
  path: string;
  category: keyof typeof CATEGORY_FALLBACKS | string;
};

type UserLink = {
  id: string;
  name: string;          // i18n key
  icon: LucideIconCmp;
  path: string;
};

// ---------- Role-based module permissions ----------
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'hr', 'administration',
    'crm', 'marketplace', 'support', 'compliance', 'reports', 'system'
  ],
  CORPORATE_ADMIN: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'support', 'reports'
  ],
  FM_MANAGER: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'support'
  ],
  PROPERTY_MANAGER: [
    'dashboard', 'properties', 'tenants', 'maintenance', 'reports'
  ],
  TENANT: [
    'dashboard', 'properties', 'tenants', 'support'
  ],
  VENDOR: [
    'dashboard', 'marketplace', 'orders', 'support'
  ],
  SUPPORT: [
    'dashboard', 'support', 'tickets'
  ],
  AUDITOR: [
    'dashboard', 'compliance', 'reports', 'audit'
  ],
  PROCUREMENT: [
    'dashboard', 'vendors', 'rfqs', 'orders', 'procurement'
  ],
  EMPLOYEE: [
    'dashboard', 'hr', 'support'
  ],
  CUSTOMER: [
    'marketplace', 'orders', 'support'
  ],
  
  // Additional roles from central types (with minimal permissions)
  ADMIN: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'support', 'reports'
  ],
  HR: ['dashboard', 'hr', 'reports'],
  TECHNICIAN: ['dashboard', 'work-orders', 'support'],
  OWNER: ['dashboard', 'properties', 'reports', 'support'],
  VIEWER: ['dashboard', 'reports'],
  DISPATCHER: ['dashboard', 'work-orders', 'properties']
} as const;

// ---------- Subscription-based module access ----------
const SUBSCRIPTION_PLANS = {
  BASIC: ['dashboard', 'properties', 'tenants', 'maintenance', 'support'],
  PROFESSIONAL: ['dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'support', 'reports'],
  ENTERPRISE: ['dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors', 'projects', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'marketplace', 'support', 'compliance', 'reports', 'system', 'administration']
} as const;

// ---------- Modules ----------
const MODULES: readonly ModuleItem[] = [
  { id:'dashboard',    name:'nav.dashboard',          icon:LayoutDashboard, path:'/fm/dashboard',    category:'core' },
  { id:'work-orders',  name:'nav.work-orders',        icon:ClipboardList,   path:'/fm/work-orders',  category:'fm' },
  { id:'properties',   name:'nav.properties',         icon:Building2,       path:'/fm/properties',   category:'fm' },
  { id:'assets',       name:'nav.assets',             icon:Settings,        path:'/fm/assets',       category:'fm' },
  { id:'tenants',      name:'nav.tenants',            icon:Users,           path:'/fm/tenants',      category:'fm' },
  { id:'vendors',      name:'nav.vendors',            icon:ShoppingBag,     path:'/fm/vendors',      category:'procurement' },
  { id:'projects',     name:'nav.projects',           icon:ClipboardList,   path:'/fm/projects',     category:'fm' },
  { id:'rfqs',         name:'nav.rfqs',               icon:ClipboardList,   path:'/fm/rfqs',         category:'procurement' },
  { id:'invoices',     name:'nav.invoices',           icon:DollarSign,      path:'/fm/invoices',     category:'finance' },
  { id:'finance',      name:'nav.finance',            icon:DollarSign,      path:'/fm/finance',      category:'finance' },
  { id:'hr',           name:'nav.hr',                 icon:Users,           path:'/fm/hr',           category:'hr' },
  { id:'crm',          name:'nav.crm',                icon:UserCheck,       path:'/fm/crm',          category:'crm' },
  // 🔧 aligned to /fm/marketplace to match tests and redirects
  { id:'marketplace',  name:'nav.marketplace',        icon:ShoppingBag,     path:'/fm/marketplace',  category:'marketplace' },
  { id:'support',      name:'nav.support',            icon:Headphones,      path:'/fm/support',      category:'support' },
  { id:'compliance',   name:'nav.compliance',         icon:Shield,          path:'/fm/compliance',   category:'compliance' },
  { id:'reports',      name:'nav.reports',            icon:BarChart3,       path:'/fm/reports',      category:'reporting' },
  { id:'system',       name:'nav.system',             icon:Cog,             path:'/fm/system',       category:'admin' },
  { id:'administration', name:'nav.administration',   icon:Settings,        path:'/fm/administration', category:'admin' },
  { id:'maintenance',  name:'nav.maintenance',        icon:Settings,        path:'/fm/maintenance',  category:'fm' },
  { id:'orders',       name:'nav.orders',             icon:ClipboardList,   path:'/fm/orders',       category:'procurement' }
] as const;

// ---------- User account links ----------
const USER_LINKS: readonly UserLink[] = [
  { id:'profile',       name:'nav.profile',       icon:UserCheck, path:'/profile' },
  { id:'settings',      name:'nav.settings',      icon:Settings,   path:'/settings' },
  { id:'notifications', name:'nav.notifications', icon:Bell,       path:'/notifications' }
] as const;

const CATEGORY_FALLBACKS = {
  core: 'Core',
  fm: 'Facility Management',
  procurement: 'Procurement',
  finance: 'Finance',
  hr: 'Human Resources',
  crm: 'Customer Relations',
  marketplace: 'Marketplace',
  support: 'Support',
  compliance: 'Compliance',
  reporting: 'Reporting',
  admin: 'Administration'
} as const;

interface SidebarProps {
  role?: UserRoleType | 'guest';
  subscription?: keyof typeof SUBSCRIPTION_PLANS;
  tenantId?: string;
}

export default function Sidebar({ role = 'guest', subscription = 'BASIC', tenantId: _tenantId }: SidebarProps) {
  const pathname = usePathname();
  const { responsiveClasses: _responsiveClasses, screenInfo } = useResponsiveLayout();

  // hooks must be top-level
  const { t, isRTL: translationIsRTL } = useTranslation();

  const active = useMemo(() => pathname || '', [pathname]);

  // ⚡ FIXED: GOLD STANDARD unified auth pattern from TopBar.tsx
  // Check BOTH NextAuth session AND JWT-based auth
  const { data: session, status } = useSession();
  // ✅ SINGLE AUTH SOURCE: Use NextAuth only (removed dual-auth pattern)
  // Previously: Component had dual-auth system (NextAuth + JWT via fetch('/api/auth/me'))
  // This caused race conditions, inconsistent state, and violated single-source-of-truth
  const isAuthenticated = status === 'authenticated' && session != null;

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
      ? `fixed inset-y-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${translationIsRTL ? 'right-0' : 'left-0'}`
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
                            className={`${translationIsRTL ? 'mr-auto' : 'ml-auto'} inline-block w-2 h-2 bg-card rounded-full`}
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
                      <span className={`${translationIsRTL ? 'mr-auto' : 'ml-auto'} inline-block w-2 h-2 bg-card rounded-full`} aria-hidden />
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
