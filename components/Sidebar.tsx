'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Headphones as HeadphonesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import { STORAGE_KEYS } from '@/config/constants';
import { type UserRoleType, ALL_ROLES } from '@/types/user';
import {
  MODULES,
  USER_LINKS,
  ROLE_PERMISSIONS,
  SUBSCRIPTION_PLANS,
  CATEGORY_FALLBACKS,
  type ModuleItem,
  type UserLinkItem,
  type ModuleId,
  type BadgeCounts
} from '@/config/navigation';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  badgeCounts?: BadgeCounts;
}

type SubModuleItem = {
  id: string;
  name: string;
  fallbackLabel: string;
  path: string;
};

const COLLAPSE_KEY = STORAGE_KEYS.sidebarCollapsed;
type CategoryKey = keyof typeof CATEGORY_FALLBACKS;

type SubModuleConfig = Omit<SubModuleItem, 'path'> & { suffix?: string };

const modulePathMap = MODULES.reduce<Record<ModuleId, string>>((acc, module) => {
  acc[module.id] = module.path;
  return acc;
}, {} as Record<ModuleId, string>);

const SUB_MODULE_CONFIG: Partial<Record<ModuleId, SubModuleConfig[]>> = {
  work_orders: [
    { id: 'work-orders-create', name: 'nav.workOrders.create', fallbackLabel: 'Create Work Order', suffix: '?view=create' },
    { id: 'work-orders-track', name: 'nav.workOrders.trackAssign', fallbackLabel: 'Track & Assign', suffix: '?view=track' },
    { id: 'work-orders-preventive', name: 'nav.workOrders.preventive', fallbackLabel: 'Preventive Maintenance', suffix: '?view=pm' },
    { id: 'work-orders-history', name: 'nav.workOrders.history', fallbackLabel: 'Service History', suffix: '?view=history' },
  ],
  properties: [
    { id: 'properties-overview', name: 'nav.properties.list', fallbackLabel: 'Property List & Details', suffix: '?view=overview' },
    { id: 'properties-units', name: 'nav.properties.unitsTenants', fallbackLabel: 'Units & Tenants', suffix: '?view=units' },
    { id: 'properties-leases', name: 'nav.properties.leases', fallbackLabel: 'Lease Management', suffix: '?view=leases' },
    { id: 'properties-inspections', name: 'nav.properties.inspections', fallbackLabel: 'Inspections', suffix: '?view=inspections' },
    { id: 'properties-documents', name: 'nav.properties.documents', fallbackLabel: 'Documents', suffix: '?view=documents' },
  ],
  finance: [
    { id: 'finance-invoices', name: 'nav.finance.invoices', fallbackLabel: 'Invoices', suffix: '?view=invoices' },
    { id: 'finance-payments', name: 'nav.finance.payments', fallbackLabel: 'Payments', suffix: '?view=payments' },
    { id: 'finance-expenses', name: 'nav.finance.expenses', fallbackLabel: 'Expenses', suffix: '?view=expenses' },
    { id: 'finance-budgets', name: 'nav.finance.budgets', fallbackLabel: 'Budgets', suffix: '?view=budgets' },
    { id: 'finance-reports', name: 'nav.finance.reports', fallbackLabel: 'Finance Reports', suffix: '?view=reports' },
  ],
  hr: [
    { id: 'hr-directory', name: 'nav.hr.directory', fallbackLabel: 'Employee Directory', suffix: '/employees' },
    { id: 'hr-attendance', name: 'nav.hr.attendanceLeave', fallbackLabel: 'Attendance & Leave', suffix: '?view=attendance' },
    { id: 'hr-payroll', name: 'nav.hr.payroll', fallbackLabel: 'Payroll', suffix: '/payroll' },
    { id: 'hr-recruitment', name: 'nav.hr.recruitment', fallbackLabel: 'Recruitment (ATS)', suffix: '?view=recruitment' },
    { id: 'hr-training', name: 'nav.hr.training', fallbackLabel: 'Training', suffix: '?view=training' },
    { id: 'hr-performance', name: 'nav.hr.performance', fallbackLabel: 'Performance', suffix: '?view=performance' },
  ],
  administration: [
    { id: 'admin-doa', name: 'nav.admin.doa', fallbackLabel: 'Delegation of Authority', suffix: '?view=doa' },
    { id: 'admin-policies', name: 'nav.admin.policies', fallbackLabel: 'Policies & Procedures', suffix: '?view=policies' },
    { id: 'admin-assets', name: 'nav.admin.assets', fallbackLabel: 'Asset Management', suffix: '?view=assets' },
    { id: 'admin-fleet', name: 'nav.admin.facilitiesFleet', fallbackLabel: 'Facilities & Fleet', suffix: '?view=fleet' },
  ],
  crm: [
    { id: 'crm-directory', name: 'nav.crm.directory', fallbackLabel: 'Customer Directory', suffix: '?view=customers' },
    { id: 'crm-leads', name: 'nav.crm.leads', fallbackLabel: 'Leads & Opportunities', suffix: '?view=leads' },
    { id: 'crm-contracts', name: 'nav.crm.contracts', fallbackLabel: 'Contracts & Renewals', suffix: '?view=contracts' },
    { id: 'crm-feedback', name: 'nav.crm.feedback', fallbackLabel: 'Feedback & Complaints', suffix: '?view=feedback' },
  ],
  marketplace: [
    { id: 'marketplace-vendors', name: 'nav.marketplace.vendors', fallbackLabel: 'Vendors & Suppliers', suffix: '?view=vendors' },
    { id: 'marketplace-catalog', name: 'nav.marketplace.catalog', fallbackLabel: 'Service Catalog', suffix: '?view=catalog' },
    { id: 'marketplace-procurement', name: 'nav.marketplace.procurement', fallbackLabel: 'Procurement', suffix: '?view=procurement' },
    { id: 'marketplace-bidding', name: 'nav.marketplace.bidding', fallbackLabel: 'Bidding / RFQs', suffix: '?view=rfqs' },
  ],
  support: [
    { id: 'support-tickets', name: 'nav.support.tickets', fallbackLabel: 'Tickets', suffix: '?view=tickets' },
    { id: 'support-kb', name: 'nav.support.kb', fallbackLabel: 'Knowledge Base', suffix: '?view=kb' },
    { id: 'support-chat', name: 'nav.support.chat', fallbackLabel: 'Live Chat', suffix: '?view=chat' },
    { id: 'support-sla', name: 'nav.support.sla', fallbackLabel: 'SLA Monitoring', suffix: '?view=sla' },
  ],
  compliance: [
    { id: 'compliance-contracts', name: 'nav.compliance.contracts', fallbackLabel: 'Contracts', suffix: '?view=contracts' },
    { id: 'compliance-disputes', name: 'nav.compliance.disputes', fallbackLabel: 'Disputes', suffix: '?view=disputes' },
    { id: 'compliance-audit', name: 'nav.compliance.auditRisk', fallbackLabel: 'Audit & Risk', suffix: '?view=audit' },
  ],
  reports: [
    { id: 'reports-standard', name: 'nav.reports.standard', fallbackLabel: 'Standard Reports', suffix: '?view=standard' },
    { id: 'reports-custom', name: 'nav.reports.custom', fallbackLabel: 'Custom Reports', suffix: '?view=custom' },
    { id: 'reports-dashboards', name: 'nav.reports.dashboards', fallbackLabel: 'Dashboards', suffix: '?view=dashboards' },
  ],
  system: [
    { id: 'system-users', name: 'nav.system.users', fallbackLabel: 'Users', suffix: '?view=users' },
    { id: 'system-roles', name: 'nav.system.roles', fallbackLabel: 'Roles & Permissions', suffix: '?view=roles' },
    { id: 'system-billing', name: 'nav.system.billing', fallbackLabel: 'Billing', suffix: '?view=billing' },
    { id: 'system-integrations', name: 'nav.system.integrations', fallbackLabel: 'Integrations', suffix: '?view=integrations' },
    { id: 'system-settings', name: 'nav.system.settings', fallbackLabel: 'System Settings', suffix: '?view=settings' },
  ],
};

const buildSubModuleMap = (): Record<string, SubModuleItem[]> => {
  const map: Record<string, SubModuleItem[]> = {};
  Object.entries(SUB_MODULE_CONFIG).forEach(([moduleId, subItems]) => {
    if (!subItems?.length) return;
    const basePath = modulePathMap[moduleId as ModuleId];
    if (!basePath) return;
    map[basePath] = subItems.map((item) => ({
      id: item.id,
      name: item.name,
      fallbackLabel: item.fallbackLabel,
      path: item.suffix ? `${basePath}${item.suffix}` : basePath,
    }));
  });
  return map;
};

const SUB_MODULES_BY_PATH = buildSubModuleMap();

const normalizeRole = (value?: string): UserRoleType | 'guest' => {
  if (!value) return 'guest';
  const normalized = value.toUpperCase().trim() as UserRoleType;
  return (ALL_ROLES as readonly string[]).includes(normalized) ? normalized : 'guest';
};

const normalizePlan = (value?: string): string => {
  if (!value) return 'DEFAULT';
  const normalized = value.toUpperCase().replace(/[\s-]+/g, '_');
  return SUBSCRIPTION_PLANS[normalized] ? normalized : 'DEFAULT';
};

const formatLabel = (value?: string) => value?.replace(/_/g, ' ') ?? '';

const Sidebar = ({ className, onNavigate, badgeCounts }: SidebarProps) => {
  const pathname = usePathname() || '';
  const { data: session, status } = useSession();
  const sessionUser = session?.user as { role?: string; subscriptionPlan?: string; plan?: string } | undefined;

  const { t, isRTL } = useTranslation();
  const { screenInfo } = useResponsiveLayout();

  const isAuthenticated = status === 'authenticated' && !!sessionUser;
  const role = normalizeRole(sessionUser?.role);
  const subscription = normalizePlan(sessionUser?.subscriptionPlan ?? sessionUser?.plan);

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY);
      if (stored) {
        setIsCollapsed(Boolean(JSON.parse(stored)));
      }
    } catch {
      // ignore corrupted state
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const allowedModules = useMemo(() => {
    const roleModules = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.guest;
    const planModules = SUBSCRIPTION_PLANS[subscription] ?? SUBSCRIPTION_PLANS.DEFAULT;
    const allowedIds = planModules.filter((id) => roleModules.includes(id));

    if (
      process.env.NODE_ENV !== 'production' &&
      roleModules.length > 0 &&
      planModules.length > 0 &&
      allowedIds.length === 0
    ) {
      console.warn(`[Sidebar] RBAC mismatch for role ${role} and plan ${subscription}.`);
    }

    const allowedSet = new Set(allowedIds);
    return MODULES.filter((module) => allowedSet.has(module.id));
  }, [role, subscription]);

  const groupedModules = useMemo(() => {
    const groups = new Map<string, ModuleItem[]>();
    allowedModules
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((module) => {
        if (!groups.has(module.category)) {
          groups.set(module.category, []);
        }
        groups.get(module.category)!.push(module);
      });

    return Array.from(groups.entries());
  }, [allowedModules]);

  const getCategoryName = useCallback(
    (category: string) => t(`sidebar.category.${category}`, CATEGORY_FALLBACKS[category as CategoryKey] ?? category),
    [t]
  );

  const isMobile = screenInfo.isMobile || screenInfo.isTablet;
  const asideWidth = isCollapsed ? 'w-16' : 'w-64';
  const logicalEdge = isRTL ? 'right-0' : 'left-0';
  const hoverShiftClass = isRTL ? 'hover:-translate-x-1' : 'hover:translate-x-1';
  const alignAutoClass = isRTL ? 'mr-auto' : 'ml-auto';

  const CollapseIcon = isCollapsed ? (isRTL ? ChevronLeft : ChevronRight) : (isRTL ? ChevronRight : ChevronLeft);

  const asideBase = isMobile
    ? `fixed inset-y-0 z-50 ${asideWidth} transform transition-transform duration-300 ease-in-out ${logicalEdge}`
    : `sticky top-14 ${asideWidth} h-[calc(100vh-3.5rem)] transition-[width] duration-300 ease-in-out`;

  const handleNavigate = useCallback(() => {
    if (isMobile && onNavigate) {
      onNavigate();
    }
  }, [isMobile, onNavigate]);

  const renderBadge = (module: ModuleItem) => {
    if (!module.badgeKey || !badgeCounts) return null;
    const value = badgeCounts[module.badgeKey];
    if (typeof value !== 'number' || value <= 0) return null;
    return (
      <span
        className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-foreground/80"
        aria-label={`${value} ${module.fallbackLabel}`}
      >
        {value}
      </span>
    );
  };

  return (
    <aside
      className={cn(
        asideBase,
        'bg-background text-foreground border-border shadow-lg overflow-y-auto flex flex-col',
        isRTL ? 'border-l' : 'border-r',
        className
      )}
      aria-label={t('sidebar.mainNav', 'Main navigation')}
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="sidebar"
    >
      <div className={cn(isMobile ? 'p-3' : 'p-4', 'flex flex-col h-full')}>
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className={cn(
              'mb-4 p-2 rounded-full border border-border hover:bg-muted transition-all duration-200',
              isRTL ? 'ml-auto' : 'mr-auto'
            )}
            aria-label={isCollapsed ? t('sidebar.expand', 'Expand sidebar') : t('sidebar.collapse', 'Collapse sidebar')}
          >
            <CollapseIcon className="h-4 w-4" aria-hidden />
          </button>
        )}

        {!isCollapsed && (
          <div className={cn('font-bold text-lg mb-6', isRTL && 'text-right')}>
            {t('common.brand', 'Fixzit Enterprise')}
          </div>
        )}

        {isAuthenticated && !isCollapsed && (
          <section
            aria-label={t('sidebar.accountInfo', 'Account info')}
            className="mb-4 rounded-2xl border border-border bg-muted/30 p-3"
          >
            <div className={cn('text-xs opacity-80 mb-1', isRTL && 'text-right')}>{t('sidebar.role', 'Role')}</div>
            <div className={cn('text-sm font-medium capitalize', isRTL && 'text-right')}>{formatLabel(role)}</div>
            <div className={cn('text-xs opacity-80 mt-1', isRTL && 'text-right')}>
              {t('sidebar.planLabel', 'Plan')}: {formatLabel(subscription)}
            </div>
          </section>
        )}

        <nav className="flex-1 space-y-6" aria-label={t('sidebar.modules', 'Modules')}>
          {groupedModules.map(([category, modules]) => (
            <section key={category} aria-label={getCategoryName(category)}>
              {!isCollapsed && (
                <div className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {getCategoryName(category)}
                </div>
              )}

              <ul className="space-y-1">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const isActive = pathname === module.path || pathname.startsWith(`${module.path}/`);
                  const subModules = SUB_MODULES_BY_PATH[module.path] || [];
                  const badge = renderBadge(module);

                  return (
                    <li key={module.id}>
                      <Link
                        href={module.path}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-md'
                            : `opacity-80 hover:bg-muted ${hoverShiftClass}`,
                          isRTL ? 'flex-row-reverse text-right' : '',
                          isCollapsed && 'justify-center'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                        data-testid={`nav-${module.id}`}
                        prefetch={false}
                        onClick={handleNavigate}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1">
                              {t(module.name, module.fallbackLabel || module.name.replace('nav.', ''))}
                            </span>
                            {badge}
                            {isActive && <span className={cn('inline-block h-2 w-2 rounded-full bg-primary', alignAutoClass)} />}
                          </>
                        )}
                      </Link>

                      {!isCollapsed && subModules.length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {subModules.map((sub) => {
                            const isSubActive = pathname === sub.path || pathname.startsWith(`${sub.path}/`);
                            return (
                              <li key={sub.id}>
                                <Link
                                  href={sub.path}
                                  className={cn(
                                    'flex items-center gap-2 rounded-2xl px-4 py-1.5 text-xs transition-all duration-200',
                                    isSubActive
                                      ? 'bg-muted text-foreground shadow-sm'
                                      : `opacity-70 hover:bg-muted ${hoverShiftClass}`,
                                    isRTL ? 'flex-row-reverse text-right' : ''
                                  )}
                                  aria-current={isSubActive ? 'page' : undefined}
                                  data-testid={`nav-${sub.id}`}
                                  prefetch={false}
                                  onClick={handleNavigate}
                                >
                                  <span
                                    className={cn(
                                      'inline-block h-1.5 w-1.5 rounded-full bg-border flex-shrink-0',
                                      isRTL ? 'ml-2' : 'mr-2'
                                    )}
                                    aria-hidden
                                  />
                                  <span className="truncate">{t(sub.name, sub.fallbackLabel)}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {groupedModules.length === 0 && !isCollapsed && (
            <p className="px-3 text-xs opacity-80" data-testid="sidebar-empty">
              {t('sidebar.noModules', 'No modules available for your role/plan.')}
            </p>
          )}
        </nav>

        {!isCollapsed && (
          <div className="border-t border-border pt-4 mt-4">
            <div className={cn('px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3', isRTL && 'text-right')}>
              {t('sidebar.account', 'Account')}
            </div>
            <ul className="space-y-1" aria-label={t('sidebar.account', 'Account')}>
              {USER_LINKS.map((link: UserLinkItem) => {
                if (!isAuthenticated && link.requiresAuth) {
                  return null;
                }
                const Icon = link.icon;
                const isActive = pathname === link.path || pathname.startsWith(`${link.path}/`);
                return (
                  <li key={link.id}>
                    <Link
                      href={link.path}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-accent text-accent-foreground shadow-md'
                          : `opacity-80 hover:bg-muted ${hoverShiftClass}`,
                        isRTL ? 'flex-row-reverse text-right' : ''
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`account-${link.id}`}
                      prefetch={false}
                      onClick={handleNavigate}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                      <span className="text-sm font-medium">
                        {t(link.name, link.fallbackLabel || link.name.replace('sidebar.', ''))}
                      </span>
                      {isActive && <span className={cn('inline-block h-2 w-2 rounded-full bg-primary', alignAutoClass)} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isAuthenticated && !isCollapsed && (
          <div className="border-t border-border pt-4 mt-4">
            <div className={cn('px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3', isRTL && 'text-right')}>
              {t('sidebar.help', 'Help')}
            </div>
            <Link
              href="/help"
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium opacity-80 transition-all duration-200 hover:bg-muted',
                isRTL ? 'flex-row-reverse text-right' : '',
                hoverShiftClass
              )}
              data-testid="nav-help"
              prefetch={false}
              onClick={handleNavigate}
            >
              <HeadphonesIcon className="h-5 w-5 flex-shrink-0" aria-hidden />
              <span>{t('sidebar.helpCenter', 'Help Center')}</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
