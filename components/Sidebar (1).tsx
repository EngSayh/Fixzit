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

// ✅ Local type for sub-modules in the sidebar
type SubModuleItem = {
  id: string;
  name: string; // i18n key, e.g. 'nav.workOrders.create'
  fallbackLabel: string; // fallback text if translation missing
  path: string;
};

// ✅ Governance-aligned sub-menus per root path (no placeholders)
//    Paths follow your FM + Marketplace IA: Work Orders, Properties, Finance, HR, Admin, CRM, Marketplace, Support, Compliance, Reports, System. 
const SUB_MODULES_BY_PATH: Record<string, SubModuleItem[]> = {
  // Work Orders → Create / Track & Assign / Preventive / Service History
  '/work-orders': [
    {
      id: 'work-orders-create',
      name: 'nav.workOrders.create',
      fallbackLabel: 'Create Work Order',
      path: '/work-orders/create'
    },
    {
      id: 'work-orders-track',
      name: 'nav.workOrders.trackAssign',
      fallbackLabel: 'Track & Assign',
      path: '/work-orders/track'
    },
    {
      id: 'work-orders-preventive',
      name: 'nav.workOrders.preventive',
      fallbackLabel: 'Preventive Maintenance',
      path: '/work-orders/preventive'
    },
    {
      id: 'work-orders-history',
      name: 'nav.workOrders.history',
      fallbackLabel: 'Service History',
      path: '/work-orders/history'
    }
  ],

  // Properties → List & Details / Units & Tenants / Lease / Inspections / Documents
  '/properties': [
    {
      id: 'properties-list',
      name: 'nav.properties.list',
      fallbackLabel: 'Property List & Details',
      path: '/properties'
    },
    {
      id: 'properties-units',
      name: 'nav.properties.unitsTenants',
      fallbackLabel: 'Units & Tenants',
      path: '/properties/units'
    },
    {
      id: 'properties-leases',
      name: 'nav.properties.leases',
      fallbackLabel: 'Lease Management',
      path: '/properties/leases'
    },
    {
      id: 'properties-inspections',
      name: 'nav.properties.inspections',
      fallbackLabel: 'Inspections',
      path: '/properties/inspections'
    },
    {
      id: 'properties-documents',
      name: 'nav.properties.documents',
      fallbackLabel: 'Documents',
      path: '/properties/documents'
    }
  ],

  // Finance → Invoices / Payments / Expenses / Budgets / Reports
  '/finance': [
    {
      id: 'finance-invoices',
      name: 'nav.finance.invoices',
      fallbackLabel: 'Invoices',
      path: '/finance/invoices'
    },
    {
      id: 'finance-payments',
      name: 'nav.finance.payments',
      fallbackLabel: 'Payments',
      path: '/finance/payments'
    },
    {
      id: 'finance-expenses',
      name: 'nav.finance.expenses',
      fallbackLabel: 'Expenses',
      path: '/finance/expenses'
    },
    {
      id: 'finance-budgets',
      name: 'nav.finance.budgets',
      fallbackLabel: 'Budgets',
      path: '/finance/budgets'
    },
    {
      id: 'finance-reports',
      name: 'nav.finance.reports',
      fallbackLabel: 'Finance Reports',
      path: '/finance/reports'
    }
  ],

  // HR → Directory / Attendance & Leave / Payroll / Recruitment / Training / Performance
  '/hr': [
    {
      id: 'hr-directory',
      name: 'nav.hr.directory',
      fallbackLabel: 'Employee Directory',
      path: '/hr/directory'
    },
    {
      id: 'hr-attendance',
      name: 'nav.hr.attendanceLeave',
      fallbackLabel: 'Attendance & Leave',
      path: '/hr/attendance'
    },
    {
      id: 'hr-payroll',
      name: 'nav.hr.payroll',
      fallbackLabel: 'Payroll',
      path: '/hr/payroll'
    },
    {
      id: 'hr-recruitment',
      name: 'nav.hr.recruitment',
      fallbackLabel: 'Recruitment (ATS)',
      path: '/hr/recruitment'
    },
    {
      id: 'hr-training',
      name: 'nav.hr.training',
      fallbackLabel: 'Training',
      path: '/hr/training'
    },
    {
      id: 'hr-performance',
      name: 'nav.hr.performance',
      fallbackLabel: 'Performance',
      path: '/hr/performance'
    }
  ],

  // Administration → DoA / Policies / Assets / Facilities & Fleet
  '/administration': [
    {
      id: 'admin-doa',
      name: 'nav.admin.doa',
      fallbackLabel: 'Delegation of Authority',
      path: '/administration/doa'
    },
    {
      id: 'admin-policies',
      name: 'nav.admin.policies',
      fallbackLabel: 'Policies & Procedures',
      path: '/administration/policies'
    },
    {
      id: 'admin-assets',
      name: 'nav.admin.assets',
      fallbackLabel: 'Asset Management',
      path: '/administration/assets'
    },
    {
      id: 'admin-facilities-fleet',
      name: 'nav.admin.facilitiesFleet',
      fallbackLabel: 'Facilities & Fleet',
      path: '/administration/facilities-fleet'
    }
  ],

  // CRM → Directory / Leads / Contracts / Feedback
  '/crm': [
    {
      id: 'crm-directory',
      name: 'nav.crm.directory',
      fallbackLabel: 'Customer Directory',
      path: '/crm/directory'
    },
    {
      id: 'crm-leads',
      name: 'nav.crm.leads',
      fallbackLabel: 'Leads',
      path: '/crm/leads'
    },
    {
      id: 'crm-contracts',
      name: 'nav.crm.contracts',
      fallbackLabel: 'Contracts',
      path: '/crm/contracts'
    },
    {
      id: 'crm-feedback',
      name: 'nav.crm.feedback',
      fallbackLabel: 'Feedback',
      path: '/crm/feedback'
    }
  ],

  // Marketplace → Vendors / Catalog / Procurement / Bidding
  '/marketplace': [
    {
      id: 'marketplace-vendors',
      name: 'nav.marketplace.vendors',
      fallbackLabel: 'Vendors',
      path: '/marketplace/vendors'
    },
    {
      id: 'marketplace-catalog',
      name: 'nav.marketplace.catalog',
      fallbackLabel: 'Service & Parts Catalog',
      path: '/marketplace/catalog'
    },
    {
      id: 'marketplace-procurement',
      name: 'nav.marketplace.procurement',
      fallbackLabel: 'Procurement',
      path: '/marketplace/procurement'
    },
    {
      id: 'marketplace-bidding',
      name: 'nav.marketplace.bidding',
      fallbackLabel: 'Bidding / RFQs',
      path: '/marketplace/bidding'
    }
  ],

  // Support → Tickets / Knowledge Base / Live Chat / SLA Monitoring
  '/support': [
    {
      id: 'support-tickets',
      name: 'nav.support.tickets',
      fallbackLabel: 'Tickets',
      path: '/support/tickets'
    },
    {
      id: 'support-kb',
      name: 'nav.support.kb',
      fallbackLabel: 'Knowledge Base',
      path: '/support/kb'
    },
    {
      id: 'support-chat',
      name: 'nav.support.chat',
      fallbackLabel: 'Live Chat',
      path: '/support/chat'
    },
    {
      id: 'support-sla',
      name: 'nav.support.sla',
      fallbackLabel: 'SLA Monitoring',
      path: '/support/sla'
    }
  ],

  // Compliance & Legal → Contracts / Disputes / Audit & Risk
  '/compliance': [
    {
      id: 'compliance-contracts',
      name: 'nav.compliance.contracts',
      fallbackLabel: 'Contracts',
      path: '/compliance/contracts'
    },
    {
      id: 'compliance-disputes',
      name: 'nav.compliance.disputes',
      fallbackLabel: 'Disputes',
      path: '/compliance/disputes'
    },
    {
      id: 'compliance-audit',
      name: 'nav.compliance.auditRisk',
      fallbackLabel: 'Audit & Risk',
      path: '/compliance/audit'
    }
  ],

  // Reports & Analytics → Standard / Custom / Dashboards
  '/reports': [
    {
      id: 'reports-standard',
      name: 'nav.reports.standard',
      fallbackLabel: 'Standard Reports',
      path: '/reports/standard'
    },
    {
      id: 'reports-custom',
      name: 'nav.reports.custom',
      fallbackLabel: 'Custom Reports',
      path: '/reports/custom'
    },
    {
      id: 'reports-dashboards',
      name: 'nav.reports.dashboards',
      fallbackLabel: 'Dashboards',
      path: '/reports/dashboards'
    }
  ],

  // System Management → Users / Roles / Billing / Integrations / Settings
  '/system': [
    {
      id: 'system-users',
      name: 'nav.system.users',
      fallbackLabel: 'Users',
      path: '/system/users'
    },
    {
      id: 'system-roles',
      name: 'nav.system.roles',
      fallbackLabel: 'Roles & Permissions',
      path: '/system/roles'
    },
    {
      id: 'system-billing',
      name: 'nav.system.billing',
      fallbackLabel: 'Billing',
      path: '/system/billing'
    },
    {
      id: 'system-integrations',
      name: 'nav.system.integrations',
      fallbackLabel: 'Integrations',
      path: '/system/integrations'
    },
    {
      id: 'system-settings',
      name: 'nav.system.settings',
      fallbackLabel: 'System Settings',
      path: '/system/settings'
    }
  ]
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  core: 'sidebar.category.core',
  fm: 'sidebar.category.fm',
  procurement: 'sidebar.category.procurement',
  finance: 'sidebar.category.finance',
  hr: 'sidebar.category.hr',
  crm: 'sidebar.category.crm',
  marketplace: 'sidebar.category.marketplace',
  support: 'sidebar.category.support',
  compliance: 'sidebar.category.compliance',
  reporting: 'sidebar.category.reporting',
  admin: 'sidebar.category.admin',
  business: 'sidebar.category.business',
  system: 'sidebar.category.system'
};

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
  const role = (isAuthenticated ? (session.user?.role || 'VIEWER') : 'guest') as UserRoleType | 'guest';
  
  // Extract subscription plan from session - default to 'DEFAULT' for unknown plans
  const subscription: string = isAuthenticated ? (session.user?.subscriptionPlan || 'DEFAULT') : 'DEFAULT';

  const active = useMemo(() => pathname || '', [pathname]);

  const allowedModules = useMemo(() => {
    const roleModules = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
    const subscriptionModules =
      SUBSCRIPTION_PLANS[subscription as keyof typeof SUBSCRIPTION_PLANS] ?? [];
    const allowedIds = new Set<string>(
      subscriptionModules.filter(id => (roleModules as readonly string[]).includes(id))
    );
    return MODULES.filter(m => allowedIds.has(m.id));
  }, [role, subscription]);

  const groupedModules = useMemo(() => {
    return allowedModules.reduce((acc, m) => {
      (acc[m.category] ||= []).push(m);
      return acc;
    }, {} as Record<string, ModuleItem[]>);
  }, [allowedModules]);

  const getCategoryName = (category: string) => {
    const key = CATEGORY_LABEL_KEYS[category] || `sidebar.category.${category}`;
    const fallback = CATEGORY_FALLBACKS[category as keyof typeof CATEGORY_FALLBACKS] || category;
    return t(key, fallback);
  };

  const asideBase =
    screenInfo.isMobile || screenInfo.isTablet
      ? `fixed inset-y-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
          translationIsRTL ? 'end-0' : 'start-0'
        }`
      : 'sticky top-14 w-64 h-[calc(100vh-3.5rem)]';

  return (
    <aside
      className={`${asideBase} bg-primary text-primary-foreground overflow-y-auto shadow-lg border-primary/20 ${
        translationIsRTL ? 'border-l' : 'border-r'
      }`}
      aria-label={t('sidebar.mainNav', 'Main navigation')}
      data-testid="sidebar"
    >
      <div className={`${screenInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`font-bold text-lg mb-6 ${translationIsRTL ? 'text-right' : ''}`}>
          {t('common.brand', 'Fixzit Enterprise')}
        </div>

        {/* Role & Plan */}
        {role !== 'guest' && (
          <section
            aria-label={t('sidebar.accountInfo', 'Account info')}
            className="mb-4 p-3 bg-primary/20 rounded-2xl border border-primary/30"
          >
            <div
              className={`text-xs opacity-80 mb-1 ${translationIsRTL ? 'text-right' : ''}`}
            >
              {t('sidebar.role', 'Role')}
            </div>
            <div className={`text-sm font-medium ${translationIsRTL ? 'text-right' : ''}`}>
              {String(role).replace(/_/g, ' ')}
            </div>
            <div
              className={`text-xs opacity-80 mt-1 ${translationIsRTL ? 'text-right' : ''}`}
            >
              {t('sidebar.planLabel', 'Plan')}: {subscription}
            </div>
          </section>
        )}

        {/* Modules with sub-menus */}
        <nav className="space-y-6 mb-8" aria-label={t('sidebar.modules', 'Modules')}>
          {Object.entries(groupedModules).map(([category, modules]) => (
            <section key={category} aria-label={getCategoryName(category)}>
              <div className="text-xs font-medium opacity-80 mb-2 px-3 uppercase tracking-wider">
                {getCategoryName(category)}
              </div>
              <ul className="space-y-1">
                {modules.map(m => {
                  const Icon = m.icon;
                  const isActive =
                    active === m.path || active.startsWith(m.path + '/');
                  const subModules = SUB_MODULES_BY_PATH[m.path] || [];

                  return (
                    <li key={m.id}>
                      {/* Top-level module link */}
                      <Link
                        href={m.path}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200
                          ${
                            isActive
                              ? 'bg-primary-foreground/10 shadow-md'
                              : 'opacity-80 hover:bg-primary-foreground/10 hover:opacity-100 hover:translate-x-1'
                          }
                          ${
                            translationIsRTL
                              ? 'flex-row-reverse text-right'
                              : 'text-left'
                          }`}
                        aria-current={isActive ? 'page' : undefined}
                        data-testid={`nav-${m.id}`}
                        prefetch={false}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
                        <span className="text-sm font-medium">
                          {t(m.name, m.name.replace('nav.', ''))}
                        </span>
                        {isActive && (
                          <span
                            className={`${
                              translationIsRTL ? 'me-auto' : 'ms-auto'
                            } inline-block w-2 h-2 bg-card rounded-full`}
                            aria-hidden
                          />
                        )}
                      </Link>

                      {/* Sub-modules */}
                      {subModules.length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {subModules.map(sub => {
                            const isSubActive =
                              active === sub.path ||
                              active.startsWith(sub.path + '/');

                            return (
                              <li key={sub.id}>
                                <Link
                                  href={sub.path}
                                  className={`w-full flex items-center gap-2 px-4 py-1.5 rounded-2xl text-xs transition-all duration-200
                                    ${
                                      isSubActive
                                        ? 'bg-primary-foreground/10 shadow-sm'
                                        : 'opacity-70 hover:bg-primary-foreground/10 hover:opacity-100 hover:translate-x-1'
                                    }
                                    ${
                                      translationIsRTL
                                        ? 'flex-row-reverse text-right'
                                        : 'text-left'
                                    }`}
                                  aria-current={isSubActive ? 'page' : undefined}
                                  data-testid={`nav-${sub.id}`}
                                  prefetch={false}
                                >
                                  {/* Bullet dot for sub-items */}
                                  <span
                                    className="inline-block w-1.5 h-1.5 rounded-full bg-card flex-shrink-0"
                                    aria-hidden
                                  />
                                  <span className="truncate">
                                    {t(sub.name, sub.fallbackLabel)}
                                  </span>
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

          {/* Empty state if nothing is allowed */}
          {Object.keys(groupedModules).length === 0 && (
            <p className="px-3 text-xs opacity-80" data-testid="sidebar-empty">
              {t(
                'sidebar.noModules',
                'No modules available for your role/plan.'
              )}
            </p>
          )}
        </nav>

        {/* User Account Links */}
        <div className="border-t border-primary-foreground/20 pt-4">
          <div
            className={`text-xs font-medium opacity-80 mb-3 px-3 uppercase tracking-wider ${
              translationIsRTL ? 'text-right' : ''
            }`}
          >
            {t('sidebar.account', 'Account')}
          </div>
          <ul className="space-y-1" aria-label={t('sidebar.account', 'Account')}>
            {USER_LINKS.map(link => {
              const Icon = link.icon;
              const isActive =
                active === link.path ||
                active.startsWith(link.path + '/');
              return (
                <li key={link.id}>
                  <Link
                    href={link.path}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary-foreground/10 shadow-md'
                          : 'opacity-80 hover:bg-primary-foreground/10 hover:opacity-100 hover:translate-x-1'
                      }
                      ${
                        translationIsRTL
                          ? 'flex-row-reverse text-right'
                          : 'text-left'
                      }`}
                    aria-current={isActive ? 'page' : undefined}
                    data-testid={`account-${link.id}`}
                    prefetch={false}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
                    <span className="text-sm font-medium">
                      {t(link.name, link.name.replace('nav.', ''))}
                    </span>
                    {isActive && (
                      <span
                        className={`${
                          translationIsRTL ? 'me-auto' : 'ms-auto'
                        } inline-block w-2 h-2 bg-card rounded-full`}
                        aria-hidden
                      />
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
            <div
              className={`text-xs font-medium opacity-80 mb-3 px-3 uppercase tracking-wider ${
                translationIsRTL ? 'text-right' : ''
              }`}
            >
              {t('sidebar.help', 'Help')}
            </div>
            <Link
              href="/help"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200 opacity-80 hover:bg-primary-foreground/10 hover:opacity-100 hover:translate-x-1 ${
                translationIsRTL ? 'flex-row-reverse text-right' : 'text-left'
              }`}
              data-testid="nav-help"
              prefetch={false}
            >
              <Headphones className="w-5 h-5 flex-shrink-0" aria-hidden />
              <span className="text-sm font-medium">
                {t('sidebar.helpCenter', 'Help Center')}
              </span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
