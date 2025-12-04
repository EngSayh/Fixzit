// ==========================================
// Enhanced Navigation Configuration
// ==========================================
// Comprehensive navigation system with RBAC, subscription filtering,
// and multi-level menu support for Fixzit platform

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Wrench,
  Building2,
  Wallet,
  Users,
  Briefcase,
  UserCog,
  ShoppingBag,
  Headphones,
  ShieldCheck,
  BarChart3,
  Settings,
  User,
  CreditCard,
  Shield,
  Bell
} from 'lucide-react';
import { UserRole as UserRoleEnum, type UserRoleType } from '@/types/user';
import { logger } from '@/lib/logger';
import {
  Role,
  SubRole,
  normalizeRole as normalizeFmRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from '@/domain/fm/fm-lite';

// ==========================================
// Types & Interfaces
// ==========================================

type GuestRole = 'guest' | 'GUEST';
type RoleAlias = 'PROPERTY_ADMIN' | 'FINANCE_ADMIN' | 'BILLING_ADMIN';

export type NavigationRole = UserRoleType | GuestRole | RoleAlias;

type UserRoleInput = NavigationRole;

export const SUBSCRIPTION_PLAN_KEYS = [
  'DEFAULT',
  'FREE',
  'BASIC',
  'STANDARD',
  'PRO',
  'PREMIUM',
  'ENTERPRISE',
  'CUSTOM',
] as const;
export type SubscriptionPlan = typeof SUBSCRIPTION_PLAN_KEYS[number];

// Badge counts type for dynamic badge values
export interface BadgeCounts {
  vacant_units?: number;
  work_orders?: number;
  pending_work_orders?: number;
  in_progress_work_orders?: number;
  urgent_work_orders?: number;
  marketplace_orders?: number;
  open_rfqs?: number;
  marketplace_products?: number;
  pending_bids?: number;
  new_bids?: number;
  aqar_leads?: number;
  pending_invoices?: number;
  overdue_invoices?: number;
  hr_applications?: number;
  crm_deals?: number;
  properties_needing_attention?: number;
  open_support_tickets?: number;
  pending_approvals?: number;
  [key: string]: number | undefined;
}

export interface NavigationBadge {
  text?: string;
  key?: string; // Key to lookup dynamic count from BadgeCounts
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  variant?: 'solid' | 'outline' | 'soft';
  pulse?: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  labelAr?: string; // Arabic translation
  href?: string;
  icon?: LucideIcon;
  iconName?: string; // For dynamic icon loading
  badge?: NavigationBadge;
  
  // Access control
  roles?: NavigationRole[];
  subscriptionPlans?: SubscriptionPlan[];
  permissions?: string[];
  
  // Hierarchy
  children?: NavigationItem[];
  parent?: string;
  
  // Display options
  isNew?: boolean;
  isComingSoon?: boolean;
  isExternal?: boolean;
  separator?: boolean;
  hidden?: boolean;
  
  // Metadata
  description?: string;
  keywords?: string[];
  category?: string;
}

export interface NavigationSection {
  id: string;
  label: string;
  labelAr?: string;
  items: NavigationItem[];
  roles?: NavigationRole[];
  subscriptionPlans?: SubscriptionPlan[];
  collapsed?: boolean;
  permissions?: string[];
}

export interface NavigationConfig {
  sections: NavigationSection[];
  settings: {
    collapsible: boolean;
    persistState: boolean;
    showBadges: boolean;
    showTooltips: boolean;
    rtlSupport: boolean;
  };
}

// Canonical module IDs (phase out snake_case)
export const WORK_ORDERS_ID = 'workOrders';
export const WORK_ORDERS_ID_LEGACY = 'work_orders'; // temporary alias during migration

// Normalize module identifiers to canonical form
export const normalizeModuleId = (id?: string | null): string | null => {
  if (!id) return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (trimmed === WORK_ORDERS_ID_LEGACY) return WORK_ORDERS_ID;
  return trimmed;
};

const ROLE_EQUIVALENTS: Record<string, string[]> = {
  MANAGER: ['FM_MANAGER'],
  FM_MANAGER: ['MANAGER'],
  SUPER_ADMIN: ['CORPORATE_ADMIN'],
  ADMIN: ['CORPORATE_ADMIN'],
  CORPORATE_ADMIN: ['SUPER_ADMIN', 'ADMIN'],
  PROPERTY_ADMIN: ['PROPERTY_MANAGER'],
  PROPERTY_MANAGER: ['FM_MANAGER', 'MANAGER'],
  FINANCE_ADMIN: ['FINANCE'],
  BILLING_ADMIN: ['FINANCE'],
  GUEST: ['guest'],
};

export const ROLE_ALIASES: Readonly<Record<string, readonly string[]>> = ROLE_EQUIVALENTS;

const USER_ROLE_VALUES = new Set(Object.values(UserRoleEnum));

const normalizeRoleValue = (role?: string): string | null => {
  if (!role) return null;
  return role.trim().toUpperCase() || null;
};

const expandRoleValue = (role?: string): string[] => {
  const normalized = normalizeRoleValue(role);
  if (!normalized) {
    return [];
  }

  const equivalents = ROLE_EQUIVALENTS[normalized] ?? [];
  const normalizedEquivalents = equivalents
    .map((value) => normalizeRoleValue(value))
    .filter((value): value is string => Boolean(value));

  return [normalized, ...normalizedEquivalents];
};

const coerceRoleValue = (role: NavigationRole): NavigationRole => {
  const normalized = normalizeRoleValue(role);
  if (!normalized) {
    return role;
  }
  if (normalized === 'GUEST') {
    return 'guest';
  }
  if (USER_ROLE_VALUES.has(normalized as UserRoleType)) {
    return normalized as UserRoleType;
  }
  return role;
};

const canonicalizeRole = (role?: string | null, subRole?: string | null): string | null => {
  const fmSubRole =
    normalizeSubRole(subRole) ?? inferSubRoleFromRole(role);
  const fmRole = normalizeFmRole(role);
  if (!fmRole) return null;

  // Map canonical FM role back to navigation roles (UserRoleEnum)
  switch (fmRole) {
    case Role.SUPER_ADMIN:
      return UserRoleEnum.SUPER_ADMIN;
    case Role.ADMIN:
      return UserRoleEnum.ADMIN;
    case Role.CORPORATE_OWNER:
      return UserRoleEnum.OWNER;
    case Role.PROPERTY_MANAGER:
      return UserRoleEnum.PROPERTY_MANAGER;
    case Role.TECHNICIAN:
      return UserRoleEnum.TECHNICIAN;
    case Role.TENANT:
      return UserRoleEnum.TENANT;
    case Role.VENDOR:
      return UserRoleEnum.VENDOR;
    case Role.TEAM_MEMBER: {
      if (fmSubRole === SubRole.FINANCE_OFFICER) return UserRoleEnum.FINANCE;
      if (fmSubRole === SubRole.HR_OFFICER) return UserRoleEnum.HR;
      return UserRoleEnum.MANAGER;
    }
    default:
      return UserRoleEnum.MANAGER;
  }
};

const roleIsAllowed = (
  allowedRoles: NavigationRole[] | undefined,
  role: UserRoleInput | null | undefined
): boolean => {
  if (!allowedRoles?.length) {
    return true;
  }

  if (!role) {
    return false;
  }

  const canonical = canonicalizeRole(
    typeof role === 'string' ? role : String(role),
    null,
  ) ?? role;

  const targetSet = new Set(expandRoleValue(canonical as string));
  if (!targetSet.size) {
    return false;
  }

  return allowedRoles.some((allowedRole) => {
    const allowedValues = expandRoleValue(allowedRole);
    return allowedValues.some((value) => targetSet.has(value));
  });
};

if (process.env.NODE_ENV !== 'production') {
  const managerNormalization = roleIsAllowed(['MANAGER'], 'FM_MANAGER');
  const corporateNormalization = roleIsAllowed(['SUPER_ADMIN'], 'CORPORATE_ADMIN');
  const propertyNormalization = roleIsAllowed(['PROPERTY_MANAGER'], 'PROPERTY_MANAGER');
  const financeNormalization = roleIsAllowed(['FINANCE'], 'BILLING_ADMIN');

  if (!managerNormalization || !corporateNormalization || !propertyNormalization || !financeNormalization) {
    logger.warn('[navigation] Role normalization failed', {
      managerNormalization,
      corporateNormalization,
      propertyNormalization,
      financeNormalization,
    });
  }
}

const normalizePermission = (permission?: string): string | null => {
  if (!permission) return null;
  return permission.trim().toLowerCase() || null;
};

const hasRequiredPermissions = (
  requiredPermissions: string[] | undefined,
  userPermissions: readonly string[] | null | undefined = []
): boolean => {
  if (!requiredPermissions?.length) {
    return true;
  }

  const normalizedUserPermissions = new Set(
    (userPermissions ?? [])
      .map((permission) => normalizePermission(permission))
      .filter((permission): permission is string => Boolean(permission))
  );

  if (!normalizedUserPermissions.size) {
    return false;
  }

  return requiredPermissions.every((permission) => {
    const normalized = normalizePermission(permission);
    if (!normalized) {
      return false;
    }
    return normalizedUserPermissions.has(normalized);
  });
};

// ------------------------------------------
// Sidebar module metadata (Governance V5)
// ------------------------------------------

export type ModuleCategory =
  | 'core'
  | 'fm'
  | 'procurement'
  | 'finance'
  | 'hr'
  | 'crm'
  | 'marketplace'
  | 'support'
  | 'compliance'
  | 'reporting'
  | 'system';

export type ModuleId =
  | 'dashboard'
  | typeof WORK_ORDERS_ID
  | typeof WORK_ORDERS_ID_LEGACY
  | 'properties'
  | 'tenants'
  | 'finance'
  | 'hr'
  | 'administration'
  | 'crm'
  | 'marketplace'
  | 'vendors'
  | 'support'
  | 'compliance'
  | 'reports'
  | 'system'
  | 'assets'
  | 'projects'
  | 'rfqs';

export const MODULE_PATHS = {
  dashboard: '/fm/dashboard',
  [WORK_ORDERS_ID]: '/fm/work-orders',
  [WORK_ORDERS_ID_LEGACY]: '/fm/work-orders', // legacy alias
  properties: '/fm/properties',
  tenants: '/fm/tenants',
  finance: '/fm/finance',
  hr: '/fm/hr',
  administration: '/fm/administration',
  crm: '/fm/crm',
  marketplace: '/fm/marketplace',
  vendors: '/fm/vendors',
  support: '/fm/support',
  compliance: '/fm/compliance',
  reports: '/fm/reports',
  system: '/fm/system',
  assets: '/fm/assets',
  projects: '/fm/projects',
  rfqs: '/fm/rfqs',
} as const;


const MODULE_SLUG_LOOKUP = Object.entries(MODULE_PATHS).reduce<Record<string, ModuleId>>(
  (acc, [moduleId, modulePath]) => {
    const slug = modulePath.replace(/^\/fm\//, '');
    acc[slug] = moduleId as ModuleId;
    return acc;
  },
  {} as Record<string, ModuleId>
);

function normalizeHref(href?: string): string | undefined {
  if (!href || !href.startsWith('/fm/')) {
    return href;
  }

  const [pathPart, query] = href.split('?');
  const rest = pathPart.slice('/fm/'.length);
  const [slug, ...segments] = rest.split('/');
  const moduleId = MODULE_SLUG_LOOKUP[slug];
  if (!moduleId) {
    return href;
  }

  let resolved = MODULE_PATHS[moduleId];
  if (segments.length) {
    resolved += `/${segments.join('/')}`;
  }
  if (query) {
    resolved += `?${query}`;
  }
  return resolved;
}

function normalizeNavigationItems(items: NavigationItem[]): NavigationItem[] {
  return items.map((item) => {
    const normalizedRoles = item.roles?.map(coerceRoleValue);
    const normalized: NavigationItem = {
      ...item,
      href: normalizeHref(item.href),
      roles: normalizedRoles,
    };

    if (item.children) {
      normalized.children = normalizeNavigationItems(item.children);
    }

    return normalized;
  });
}

function normalizeNavigationConfig(config: NavigationConfig): NavigationConfig {
  return {
    ...config,
    sections: config.sections.map((section) => ({
      ...section,
      roles: section.roles?.map(coerceRoleValue),
      items: normalizeNavigationItems(section.items),
    })),
  };
}

export interface ModuleItem {
  id: ModuleId;
  name: string; // translation key
  fallbackLabel: string;
  path: string;
  icon: LucideIcon;
  category: ModuleCategory;
  order: number;
  badgeKey?: keyof BadgeCounts;
}

export interface UserLinkItem {
  id: string;
  name: string;
  fallbackLabel: string;
  path: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
}

export type ModuleSubView =
  | {
      id: string;
      name: string;
      fallbackLabel: string;
      kind: 'query';
      value: string;
    }
  | {
      id: string;
      name: string;
      fallbackLabel: string;
      kind: 'path';
      value: string;
    };

export const CATEGORY_FALLBACKS: Record<ModuleCategory, string> = {
  core: 'Core',
  fm: 'Facility Management',
  procurement: 'Procurement',
  finance: 'Finance',
  hr: 'Human Resources',
  crm: 'Customer Relations',
  marketplace: 'Marketplace',
  support: 'Support & Helpdesk',
  compliance: 'Compliance & Legal',
  reporting: 'Reports & Analytics',
  system: 'System Management',
};

export const MODULES: readonly ModuleItem[] = [
  {
    id: 'dashboard',
    name: 'nav.dashboard',
    fallbackLabel: 'Dashboard',
    path: MODULE_PATHS.dashboard,
    icon: LayoutDashboard,
    category: 'core',
    order: 1,
  },
  {
    id: 'work_orders',
    name: 'nav.workOrders',
    fallbackLabel: 'Work Orders',
    path: MODULE_PATHS.work_orders,
    icon: Wrench,
    category: 'fm',
    order: 2,
    badgeKey: 'pending_work_orders',
  },
  {
    id: 'properties',
    name: 'nav.properties',
    fallbackLabel: 'Properties',
    path: MODULE_PATHS.properties,
    icon: Building2,
    category: 'fm',
    order: 3,
    badgeKey: 'properties_needing_attention',
  },
  {
    id: 'finance',
    name: 'nav.finance',
    fallbackLabel: 'Finance',
    path: MODULE_PATHS.finance,
    icon: Wallet,
    category: 'finance',
    order: 4,
    badgeKey: 'pending_invoices',
  },
  {
    id: 'hr',
    name: 'nav.hr',
    fallbackLabel: 'Human Resources',
    path: MODULE_PATHS.hr,
    icon: Users,
    category: 'hr',
    order: 5,
    badgeKey: 'hr_applications',
  },
  {
    id: 'administration',
    name: 'nav.administration',
    fallbackLabel: 'Administration',
    path: MODULE_PATHS.administration,
    icon: Briefcase,
    category: 'system',
    order: 6,
  },
  {
    id: 'crm',
    name: 'nav.crm',
    fallbackLabel: 'CRM',
    path: MODULE_PATHS.crm,
    icon: UserCog,
    category: 'crm',
    order: 7,
  },
  {
    id: 'marketplace',
    name: 'nav.marketplace',
    fallbackLabel: 'Marketplace',
    path: MODULE_PATHS.marketplace,
    icon: ShoppingBag,
    category: 'marketplace',
    order: 8,
    badgeKey: 'open_rfqs',
  },
  {
    id: 'support',
    name: 'nav.support',
    fallbackLabel: 'Support & Helpdesk',
    path: MODULE_PATHS.support,
    icon: Headphones,
    category: 'support',
    order: 9,
    badgeKey: 'open_support_tickets',
  },
  {
    id: 'compliance',
    name: 'nav.compliance',
    fallbackLabel: 'Compliance & Legal',
    path: MODULE_PATHS.compliance,
    icon: ShieldCheck,
    category: 'compliance',
    order: 10,
    badgeKey: 'pending_approvals',
  },
  {
    id: 'reports',
    name: 'nav.reports',
    fallbackLabel: 'Reports & Analytics',
    path: MODULE_PATHS.reports,
    icon: BarChart3,
    category: 'reporting',
    order: 11,
  },
  {
    id: 'system',
    name: 'nav.system',
    fallbackLabel: 'System Management',
    path: MODULE_PATHS.system,
    icon: Settings,
    category: 'system',
    order: 12,
  },
];

export const MODULE_SUB_VIEWS: Partial<Record<ModuleId, ModuleSubView[]>> = {
  work_orders: [
    { id: 'work-orders-create', name: 'nav.workOrders.create', fallbackLabel: 'Create Work Order', kind: 'query', value: 'create' },
    { id: 'work-orders-track', name: 'nav.workOrders.trackAssign', fallbackLabel: 'Track & Assign', kind: 'query', value: 'track' },
    { id: 'work-orders-preventive', name: 'nav.workOrders.preventive', fallbackLabel: 'Preventive Maintenance', kind: 'query', value: 'preventive' },
    { id: 'work-orders-history', name: 'nav.workOrders.history', fallbackLabel: 'Service History', kind: 'query', value: 'history' },
  ],
  properties: [
    { id: 'properties-overview', name: 'nav.properties.list', fallbackLabel: 'Property List & Details', kind: 'query', value: 'overview' },
    { id: 'properties-units', name: 'nav.properties.unitsTenants', fallbackLabel: 'Units & Tenants', kind: 'query', value: 'units' },
    { id: 'properties-leases', name: 'nav.properties.leases', fallbackLabel: 'Lease Management', kind: 'query', value: 'leases' },
    { id: 'properties-inspections', name: 'nav.properties.inspections', fallbackLabel: 'Inspections', kind: 'query', value: 'inspections' },
    { id: 'properties-documents', name: 'nav.properties.documents', fallbackLabel: 'Documents', kind: 'query', value: 'documents' },
  ],
  finance: [
    { id: 'finance-invoices', name: 'nav.finance.invoices', fallbackLabel: 'Invoices', kind: 'query', value: 'invoices' },
    { id: 'finance-payments', name: 'nav.finance.payments', fallbackLabel: 'Payments', kind: 'query', value: 'payments' },
    { id: 'finance-expenses', name: 'nav.finance.expenses', fallbackLabel: 'Expenses', kind: 'query', value: 'expenses' },
    { id: 'finance-budgets', name: 'nav.finance.budgets', fallbackLabel: 'Budgets', kind: 'query', value: 'budgets' },
    { id: 'finance-reports', name: 'nav.finance.reports', fallbackLabel: 'Finance Reports', kind: 'query', value: 'reports' },
  ],
  hr: [
    { id: 'hr-directory', name: 'nav.hr.directory', fallbackLabel: 'Employee Directory', kind: 'path', value: `${MODULE_PATHS.hr}/employees` },
    { id: 'hr-attendance', name: 'nav.hr.attendanceLeave', fallbackLabel: 'Attendance & Leave', kind: 'query', value: 'attendance' },
    { id: 'hr-payroll', name: 'nav.hr.payroll', fallbackLabel: 'Payroll', kind: 'path', value: `${MODULE_PATHS.hr}/payroll` },
    { id: 'hr-recruitment', name: 'nav.hr.recruitment', fallbackLabel: 'Recruitment (ATS)', kind: 'query', value: 'recruitment' },
    { id: 'hr-training', name: 'nav.hr.training', fallbackLabel: 'Training', kind: 'query', value: 'training' },
    { id: 'hr-performance', name: 'nav.hr.performance', fallbackLabel: 'Performance', kind: 'query', value: 'performance' },
  ],
  administration: [
    { id: 'admin-doa', name: 'nav.admin.doa', fallbackLabel: 'Delegation of Authority', kind: 'query', value: 'doa' },
    { id: 'admin-policies', name: 'nav.admin.policies', fallbackLabel: 'Policies & Procedures', kind: 'query', value: 'policies' },
    { id: 'admin-assets', name: 'nav.admin.assets', fallbackLabel: 'Asset Management', kind: 'query', value: 'assets' },
    { id: 'admin-fleet', name: 'nav.admin.facilitiesFleet', fallbackLabel: 'Facilities & Fleet', kind: 'query', value: 'fleet' },
  ],
  crm: [
    { id: 'crm-directory', name: 'nav.crm.directory', fallbackLabel: 'Customer Directory', kind: 'query', value: 'customers' },
    { id: 'crm-leads', name: 'nav.crm.leads', fallbackLabel: 'Leads & Opportunities', kind: 'query', value: 'leads' },
    { id: 'crm-contracts', name: 'nav.crm.contracts', fallbackLabel: 'Contracts & Renewals', kind: 'query', value: 'contracts' },
    { id: 'crm-feedback', name: 'nav.crm.feedback', fallbackLabel: 'Feedback & Complaints', kind: 'query', value: 'feedback' },
  ],
  marketplace: [
    { id: 'marketplace-vendors', name: 'nav.marketplace.vendors', fallbackLabel: 'Vendors & Suppliers', kind: 'query', value: 'vendors' },
    { id: 'marketplace-catalog', name: 'nav.marketplace.catalog', fallbackLabel: 'Service Catalog', kind: 'query', value: 'catalog' },
    { id: 'marketplace-procurement', name: 'nav.marketplace.procurement', fallbackLabel: 'Procurement', kind: 'query', value: 'procurement' },
    { id: 'marketplace-bidding', name: 'nav.marketplace.bidding', fallbackLabel: 'Bidding / RFQs', kind: 'query', value: 'rfqs' },
  ],
  support: [
    { id: 'support-tickets', name: 'nav.support.tickets', fallbackLabel: 'Tickets', kind: 'query', value: 'tickets' },
    { id: 'support-kb', name: 'nav.support.kb', fallbackLabel: 'Knowledge Base', kind: 'query', value: 'kb' },
    { id: 'support-chat', name: 'nav.support.chat', fallbackLabel: 'Live Chat', kind: 'query', value: 'chat' },
    { id: 'support-sla', name: 'nav.support.sla', fallbackLabel: 'SLA Monitoring', kind: 'query', value: 'sla' },
  ],
  compliance: [
    { id: 'compliance-contracts', name: 'nav.compliance.contracts', fallbackLabel: 'Contracts', kind: 'query', value: 'contracts' },
    { id: 'compliance-disputes', name: 'nav.compliance.disputes', fallbackLabel: 'Disputes', kind: 'query', value: 'disputes' },
    { id: 'compliance-audit', name: 'nav.compliance.auditRisk', fallbackLabel: 'Audit & Risk', kind: 'query', value: 'audit' },
  ],
  reports: [
    { id: 'reports-standard', name: 'nav.reports.standard', fallbackLabel: 'Standard Reports', kind: 'query', value: 'standard' },
    { id: 'reports-custom', name: 'nav.reports.custom', fallbackLabel: 'Custom Reports', kind: 'query', value: 'custom' },
    { id: 'reports-dashboards', name: 'nav.reports.dashboards', fallbackLabel: 'Dashboards', kind: 'query', value: 'dashboards' },
  ],
  system: [
    { id: 'system-users', name: 'nav.system.users', fallbackLabel: 'Users', kind: 'query', value: 'users' },
    { id: 'system-roles', name: 'nav.system.roles', fallbackLabel: 'Roles & Permissions', kind: 'query', value: 'roles' },
    { id: 'system-billing', name: 'nav.system.billing', fallbackLabel: 'Billing', kind: 'query', value: 'billing' },
    { id: 'system-integrations', name: 'nav.system.integrations', fallbackLabel: 'Integrations', kind: 'query', value: 'integrations' },
    { id: 'system-settings', name: 'nav.system.settings', fallbackLabel: 'System Settings', kind: 'query', value: 'settings' },
  ],
};

const ALL_MODULE_IDS = MODULES.map((m) => m.id);
const CORE_PLAN: ModuleId[] = ['dashboard', WORK_ORDERS_ID, 'properties', 'support'];
const PRO_PLAN: ModuleId[] = [...CORE_PLAN, 'finance', 'hr', 'crm', 'marketplace', 'reports'];
const STANDARD_PLAN: ModuleId[] = CORE_PLAN;
const PREMIUM_PLAN: ModuleId[] = PRO_PLAN;

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, readonly ModuleId[]> = {
  DEFAULT: ALL_MODULE_IDS,
  FREE: CORE_PLAN,
  BASIC: CORE_PLAN,
  STANDARD: STANDARD_PLAN,
  PRO: PRO_PLAN,
  PREMIUM: PREMIUM_PLAN,
  ENTERPRISE: ALL_MODULE_IDS,
  CUSTOM: ALL_MODULE_IDS,
};

const fullAccess = ALL_MODULE_IDS;
const adminCore: ModuleId[] = [
  'dashboard',
  'work_orders',
  'properties',
  'finance',
  'hr',
  'administration',
  'crm',
  'marketplace',
  'support',
  'compliance',
  'reports',
  'system',
];
const fmLeadership: ModuleId[] = ['dashboard', WORK_ORDERS_ID, 'properties', 'hr', 'support', 'reports'];
const propertyOps: ModuleId[] = ['dashboard', 'properties', WORK_ORDERS_ID, 'crm', 'support', 'reports'];
const financeOnly: ModuleId[] = ['dashboard', 'finance', 'reports', 'support'];
const hrOnly: ModuleId[] = ['dashboard', 'hr', 'support', 'reports'];
const procurementOnly: ModuleId[] = ['dashboard', 'marketplace', 'support', 'reports'];
const technicianOnly: ModuleId[] = ['dashboard', WORK_ORDERS_ID, 'support'];
const ownerTenant: ModuleId[] = ['dashboard', 'properties', 'support', 'reports'];
const vendorOnly: ModuleId[] = ['dashboard', 'marketplace', 'support'];
const customerOnly: ModuleId[] = ['dashboard', 'support'];
const complianceOnly: ModuleId[] = ['dashboard', 'compliance', 'reports'];
const viewerOnly: ModuleId[] = ['dashboard', 'reports'];

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: fullAccess,
  CORPORATE_ADMIN: fullAccess,
  ADMIN: adminCore,
  MANAGER: fmLeadership,
  FM_MANAGER: fmLeadership,
  PROPERTY_MANAGER: propertyOps,
  TEAM_MEMBER: ['dashboard', WORK_ORDERS_ID, 'support', 'reports'] as ModuleId[], // Base team member access - specialize via sub-roles
  FINANCE: financeOnly,
  HR: hrOnly,
  PROCUREMENT: procurementOnly,
  TECHNICIAN: technicianOnly,
  FINANCE_OFFICER: financeOnly,
  HR_OFFICER: hrOnly,
  SUPPORT_AGENT: ['dashboard', 'support', 'crm', 'reports'] as ModuleId[],
  OPERATIONS_MANAGER: fmLeadership,
  FINANCE_MANAGER: financeOnly,
  EMPLOYEE: hrOnly,
  CORPORATE_OWNER: propertyOps,
  OWNER: ownerTenant,
  TENANT: ownerTenant,
  VENDOR: vendorOnly,
  CUSTOMER: customerOnly,
  AUDITOR: complianceOnly,
  VIEWER: viewerOnly,
  DISPATCHER: technicianOnly,
  SUPPORT: ['dashboard', 'support'] as ModuleId[],
  // External roles fall back to view-only
  guest: viewerOnly,
} satisfies Record<UserRoleType | 'guest', readonly ModuleId[]>;

const CANONICAL_ROLE_SET = new Set(
  Object.keys(ROLE_PERMISSIONS)
    .map((roleKey) => normalizeRoleValue(roleKey))
    .filter((value): value is string => Boolean(value))
);

export const resolveNavigationRole = (role?: string): UserRoleType | 'guest' => {
  const expandedValues = expandRoleValue(role);
  for (const value of expandedValues) {
    if (value && CANONICAL_ROLE_SET.has(value)) {
      return value === 'GUEST' ? 'guest' : (value as UserRoleType);
    }
  }
  return 'guest';
};

const moduleRoleAccess: Record<ModuleId, Set<NavigationRole>> = ALL_MODULE_IDS.reduce(
  (acc, moduleId) => {
    acc[moduleId] = new Set<NavigationRole>();
    return acc;
  },
  {} as Record<ModuleId, Set<NavigationRole>>
);

Object.entries(ROLE_PERMISSIONS).forEach(([roleKey, modules]) => {
  const normalizedRole = normalizeRoleValue(roleKey);
  if (!normalizedRole) {
    return;
  }

  modules.forEach((moduleId) => {
    moduleRoleAccess[moduleId]?.add(normalizedRole as NavigationRole);
  });
});

const moduleRolesCache = new Map<string, NavigationRole[]>();

const moduleRoles = (...moduleIds: ModuleId[]): NavigationRole[] => {
  if (!moduleIds.length) {
    return [];
  }

  const cacheKey = [...moduleIds].sort().join('|');
  const cached = moduleRolesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = new Set<NavigationRole>();
  moduleIds.forEach((moduleId) => {
    moduleRoleAccess[moduleId]?.forEach((role) => result.add(role));
  });

  const roleList = Array.from(result);
  moduleRolesCache.set(cacheKey, roleList);
  return roleList;
};

const DASHBOARD_ROLES = moduleRoles('dashboard');
const REPORT_ROLES = moduleRoles('reports');
const PROPERTIES_ROLES = moduleRoles('properties');
const WORK_ORDER_ROLES = moduleRoles(WORK_ORDERS_ID);
const FACILITY_ROLES = moduleRoles('properties', WORK_ORDERS_ID);
const MARKETPLACE_ROLES = moduleRoles('marketplace');
const REAL_ESTATE_ROLES = PROPERTIES_ROLES;
const FINANCE_ROLES = moduleRoles('finance');
const HR_ROLES = moduleRoles('hr');
const CRM_ROLES = moduleRoles('crm');
const SUPPORT_ROLES = moduleRoles('support');
const ADMIN_ROLES = moduleRoles('administration', 'system');
const COMPLIANCE_ROLES = moduleRoles('compliance');

export const USER_LINKS: readonly UserLinkItem[] = [
  {
    id: 'profile',
    name: 'sidebar.account.profile',
    fallbackLabel: 'Profile',
    path: '/account/profile',
    icon: User,
    requiresAuth: true,
  },
  {
    id: 'preferences',
    name: 'sidebar.account.preferences',
    fallbackLabel: 'Preferences',
    path: '/account/preferences',
    icon: Settings,
    requiresAuth: true,
  },
  {
    id: 'billing',
    name: 'sidebar.account.billing',
    fallbackLabel: 'Billing & Plans',
    path: '/account/billing',
    icon: CreditCard,
    requiresAuth: true,
  },
  {
    id: 'notifications',
    name: 'sidebar.account.notifications',
    fallbackLabel: 'Notifications',
    path: '/account/notifications',
    icon: Bell,
    requiresAuth: true,
  },
  {
    id: 'security',
    name: 'sidebar.account.security',
    fallbackLabel: 'Security & Audit',
    path: '/account/security',
    icon: Shield,
    requiresAuth: true,
  },
];

// ==========================================
// Navigation Configuration
// ==========================================

const rawNavigationConfig: NavigationConfig = {
  settings: {
    collapsible: true,
    persistState: true,
    showBadges: true,
    showTooltips: true,
    rtlSupport: true,
  },
  sections: [
    // ==========================================
    // Dashboard Section
    // ==========================================
    {
      id: 'dashboard',
      label: 'Dashboard',
      labelAr: 'لوحة التحكم',
      roles: DASHBOARD_ROLES,
      items: [
        {
          id: 'overview',
          label: 'Overview',
          labelAr: 'نظرة عامة',
          href: '/dashboard',
          iconName: 'LayoutDashboard',
          roles: DASHBOARD_ROLES,
        },
        {
          id: 'analytics',
          label: 'Analytics',
          labelAr: 'التحليلات',
          href: '/dashboard/analytics',
          iconName: 'BarChart3',
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
          roles: DASHBOARD_ROLES,
        },
        {
          id: 'reports',
          label: 'Reports',
          labelAr: 'التقارير',
          href: '/dashboard/reports',
          iconName: 'FileText',
          roles: REPORT_ROLES,
        },
      ],
    },

    // ==========================================
    // Facility Management Section
    // ==========================================
    {
      id: 'facility_management',
      label: 'Facility Management',
      labelAr: 'إدارة المرافق',
      roles: FACILITY_ROLES,
      permissions: ['module:fm'],
      items: [
        {
          id: 'properties',
          label: 'Properties',
          labelAr: 'العقارات',
          href: MODULE_PATHS.properties,
          iconName: 'Building2',
          roles: PROPERTIES_ROLES,
          children: [
            {
              id: 'property_list',
              label: 'Property List',
              labelAr: 'قائمة العقارات',
              href: MODULE_PATHS.properties,
            },
            {
              id: 'add_property',
              label: 'Add Property',
              labelAr: 'إضافة عقار',
              href: `${MODULE_PATHS.properties}/new`,
              roles: ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'FM_MANAGER'],
            },
          ],
        },
        {
          id: 'units',
          label: 'Units',
          labelAr: 'الوحدات',
          href: `${MODULE_PATHS.properties}/units`,
          iconName: 'Home',
          roles: PROPERTIES_ROLES,
          children: [
            {
              id: 'unit_list',
              label: 'Unit List',
              labelAr: 'قائمة الوحدات',
              href: `${MODULE_PATHS.properties}/units`,
            },
            {
              id: 'vacant_units',
              label: 'Vacant Units',
              labelAr: 'الوحدات الشاغرة',
              href: `${MODULE_PATHS.properties}/units?status=vacant`,
              badge: {
                key: 'vacant_units',
                color: 'green',
                variant: 'solid',
              },
            },
            {
              id: 'occupied_units',
              label: 'Occupied Units',
              labelAr: 'الوحدات المشغولة',
              href: `${MODULE_PATHS.properties}/units?status=occupied`,
            },
          ],
        },
        {
          id: 'work_orders',
          label: 'Work Orders',
          labelAr: 'أوامر العمل',
          href: MODULE_PATHS.work_orders,
          iconName: 'Wrench',
          roles: WORK_ORDER_ROLES,
          badge: {
            key: 'work_orders',
            color: 'red',
            variant: 'solid',
            pulse: true,
          },
          children: [
            {
              id: 'all_work_orders',
              label: 'All Work Orders',
              labelAr: 'جميع أوامر العمل',
              href: MODULE_PATHS.work_orders,
            },
            {
              id: 'pending_work_orders',
              label: 'Pending',
              labelAr: 'قيد الانتظار',
              href: `${MODULE_PATHS.work_orders}?status=pending`,
              badge: {
                key: 'pending_work_orders',
                color: 'yellow',
                variant: 'solid',
              },
            },
            {
              id: 'in_progress_work_orders',
              label: 'In Progress',
              labelAr: 'قيد التنفيذ',
              href: `${MODULE_PATHS.work_orders}?status=in_progress`,
              badge: {
                key: 'in_progress_work_orders',
                color: 'blue',
                variant: 'solid',
              },
            },
            {
              id: 'create_work_order',
              label: 'Create Work Order',
              labelAr: 'إنشاء أمر عمل',
              href: `${MODULE_PATHS.work_orders}/new`,
              roles: ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'FM_MANAGER', 'PROPERTY_MANAGER', 'TENANT'],
            },
          ],
        },
        {
          id: 'assets',
          label: 'Assets',
          labelAr: 'الأصول',
          href: `${MODULE_PATHS.administration}/assets`,
          iconName: 'Package',
          roles: PROPERTIES_ROLES,
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
          children: [
            {
              id: 'asset_list',
              label: 'Asset List',
              labelAr: 'قائمة الأصول',
              href: `${MODULE_PATHS.administration}/assets`,
            },
          ],
        },
        {
          id: 'tenants',
          label: 'Tenants',
          labelAr: 'المستأجرون',
          href: `${MODULE_PATHS.properties}/tenants`,
          iconName: 'Users',
          roles: PROPERTIES_ROLES,
          children: [
            {
              id: 'tenant_list',
              label: 'Tenant List',
              labelAr: 'قائمة المستأجرين',
              href: `${MODULE_PATHS.properties}/tenants`,
            },
            {
              id: 'lease_agreements',
              label: 'Lease Agreements',
              labelAr: 'اتفاقيات الإيجار',
              href: `${MODULE_PATHS.properties}/leases`,
            },
          ],
        },
      ],
    },

    // ==========================================
    // Souq Marketplace Section
    // ==========================================
    {
      id: 'marketplace',
      label: 'Souq Marketplace',
      labelAr: 'سوق الخدمات',
      roles: MARKETPLACE_ROLES,
      permissions: ['module:marketplace'],
      items: [
        {
          id: 'vendors',
          label: 'Vendors',
          labelAr: 'الموردون',
          href: `${MODULE_PATHS.marketplace}/vendors`,
          iconName: 'Store',
          roles: MARKETPLACE_ROLES,
          children: [
            {
              id: 'vendor_directory',
              label: 'Vendor Directory',
              labelAr: 'دليل الموردين',
              href: `${MODULE_PATHS.marketplace}/vendors`,
            },
            {
              id: 'vendor_registration',
              label: 'Vendor Registration',
              labelAr: 'تسجيل المورد',
              href: `${MODULE_PATHS.marketplace}/vendors/new`,
              roles: [
                UserRoleEnum.SUPER_ADMIN,
                UserRoleEnum.CORPORATE_ADMIN,
                UserRoleEnum.ADMIN,
                UserRoleEnum.PROCUREMENT,
              ],
            },
            {
              id: 'vendor_ratings',
              label: 'Ratings & Reviews',
              labelAr: 'التقييمات والمراجعات',
              href: `${MODULE_PATHS.marketplace}/vendors`,
            },
          ],
        },
        {
          id: 'products',
          label: 'Products',
          labelAr: 'المنتجات',
          href: `${MODULE_PATHS.marketplace}/listings`,
          iconName: 'ShoppingBag',
          roles: MARKETPLACE_ROLES,
          children: [
            {
              id: 'product_catalog',
              label: 'Product Catalog',
              labelAr: 'كتالوج المنتجات',
              href: `${MODULE_PATHS.marketplace}/listings`,
            },
            {
              id: 'categories',
              label: 'Categories',
              labelAr: 'الفئات',
              href: `${MODULE_PATHS.marketplace}/listings?view=categories`,
            },
            {
              id: 'inventory',
              label: 'Inventory',
              labelAr: 'المخزون',
              href: `${MODULE_PATHS.marketplace}/listings?view=inventory`,
              roles: [
                UserRoleEnum.SUPER_ADMIN,
                UserRoleEnum.CORPORATE_ADMIN,
                UserRoleEnum.ADMIN,
                UserRoleEnum.PROCUREMENT,
                UserRoleEnum.VENDOR,
              ],
            },
          ],
        },
        {
          id: 'services',
          label: 'Services',
          labelAr: 'الخدمات',
          href: `${MODULE_PATHS.marketplace}`,
          iconName: 'Settings',
          roles: MARKETPLACE_ROLES,
          children: [
            {
              id: 'service_catalog',
              label: 'Service Catalog',
              labelAr: 'كتالوج الخدمات',
              href: `${MODULE_PATHS.marketplace}`,
            },
            {
              id: 'service_packages',
              label: 'Service Packages',
              labelAr: 'حزم الخدمات',
              href: `${MODULE_PATHS.marketplace}?view=packages`,
            },
            {
              id: 'service_booking',
              label: 'Service Booking',
              labelAr: 'حجز الخدمات',
              href: `${MODULE_PATHS.marketplace}?view=booking`,
            },
          ],
        },
        {
          id: 'rfqs',
          label: 'RFQs',
          labelAr: 'طلبات التسعير',
          href: `${MODULE_PATHS.marketplace}/orders`,
          iconName: 'FileSearch',
          roles: MARKETPLACE_ROLES,
          children: [
            {
              id: 'rfq_list',
              label: 'RFQ List',
              labelAr: 'قائمة طلبات التسعير',
              href: `${MODULE_PATHS.marketplace}/orders`,
            },
            {
              id: 'create_rfq',
              label: 'Create RFQ',
              labelAr: 'إنشاء طلب تسعير',
              href: `${MODULE_PATHS.marketplace}/orders/new`,
              roles: [
                UserRoleEnum.SUPER_ADMIN,
                UserRoleEnum.CORPORATE_ADMIN,
                UserRoleEnum.ADMIN,
                UserRoleEnum.FM_MANAGER,
                UserRoleEnum.PROPERTY_MANAGER,
                UserRoleEnum.PROCUREMENT,
              ],
            },
            {
              id: 'my_bids',
              label: 'My Bids',
              labelAr: 'عروضي',
              href: `${MODULE_PATHS.marketplace}/orders`,
              roles: [UserRoleEnum.VENDOR],
            },
          ],
        },
        {
          id: 'orders',
          label: 'Orders',
          labelAr: 'الطلبات',
          href: `${MODULE_PATHS.marketplace}/orders`,
          iconName: 'ShoppingCart',
          roles: MARKETPLACE_ROLES,
          badge: {
            key: 'marketplace_orders',
            color: 'blue',
            variant: 'solid',
          },
          children: [
            {
              id: 'all_orders',
              label: 'All Orders',
              labelAr: 'جميع الطلبات',
              href: `${MODULE_PATHS.marketplace}/orders`,
            },
            {
              id: 'purchase_orders',
              label: 'Purchase Orders',
              labelAr: 'طلبات الشراء',
              href: `${MODULE_PATHS.marketplace}/orders?view=purchase`,
            },
            {
              id: 'order_tracking',
              label: 'Order Tracking',
              labelAr: 'تتبع الطلبات',
              href: `${MODULE_PATHS.marketplace}/orders?view=tracking`,
            },
          ],
        },
      ],
    },

    // ==========================================
    // Aqar Real Estate Section
    // ==========================================
    {
      id: 'real_estate',
      label: 'Aqar Real Estate',
      labelAr: 'عقار العقارات',
      roles: REAL_ESTATE_ROLES,
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      items: [
        {
          id: 'listings',
          label: 'Listings',
          labelAr: 'القوائم',
          href: '/aqar/properties',
          iconName: 'MapPin',
          children: [
            {
              id: 'active_listings',
              label: 'Active Listings',
              labelAr: 'القوائم النشطة',
              href: '/aqar/properties?status=active',
            },
            {
              id: 'draft_listings',
              label: 'Draft Listings',
              labelAr: 'المسودات',
              href: '/aqar/properties?status=draft',
            },
            {
              id: 'create_listing',
              label: 'Create Listing',
              labelAr: 'إنشاء قائمة',
              href: '/aqar/listings/new',
            },
          ],
        },
        {
          id: 'search_filters',
          label: 'Search & Filters',
          labelAr: 'البحث والفلاتر',
          href: '/aqar/filters',
          iconName: 'Filter',
          children: [
            {
              id: 'advanced_filters',
              label: 'Advanced Filters',
              labelAr: 'فلاتر متقدمة',
              href: '/aqar/filters',
            },
            {
              id: 'rnpl_filters',
              label: 'RNPL Eligible',
              labelAr: 'جاهز لبرامج RNPL',
              href: '/aqar/filters?rnplEligible=true',
            },
            {
              id: 'auction_filters',
              label: 'Auctions & Deposits',
              labelAr: 'المزادات والودائع',
              href: '/aqar/filters?intent=AUCTION',
            },
          ],
        },
        {
          id: 'auctions',
          label: 'Auctions',
          labelAr: 'المزادات',
          href: '/aqar/auctions',
          iconName: 'Gavel',
          children: [
            {
              id: 'auction_catalog',
              label: 'Auction Catalog',
              labelAr: 'كتالوج المزادات',
              href: '/aqar/auctions',
            },
            {
              id: 'auction_map',
              label: 'Auction Map View',
              labelAr: 'خريطة المزادات',
              href: '/aqar/map?intent=AUCTION',
            },
          ],
        },
        {
          id: 'valuations',
          label: 'Valuations',
          labelAr: 'التقييمات',
          href: '/aqar/valuation/new',
          iconName: 'ShieldCheck',
        },
      ],
    },

    // ==========================================
    // Finance Section
    // ==========================================
    {
      id: 'finance',
      label: 'Finance',
      labelAr: 'المالية',
      roles: FINANCE_ROLES,
      permissions: ['module:finance'],
      items: [
        {
          id: 'invoices',
          label: 'Invoices',
          labelAr: 'الفواتير',
          href: `${MODULE_PATHS.finance}/invoices`,
          iconName: 'FileText',
          badge: {
            key: 'pending_invoices',
            color: 'yellow',
            variant: 'solid',
          },
          children: [
            {
              id: 'all_invoices',
              label: 'All Invoices',
              labelAr: 'جميع الفواتير',
              href: `${MODULE_PATHS.finance}/invoices`,
            },
            {
              id: 'pending_invoices',
              label: 'Pending',
              labelAr: 'قيد الانتظار',
              href: `${MODULE_PATHS.finance}/invoices?status=pending`,
              badge: {
                key: 'pending_invoices',
                color: 'yellow',
                variant: 'solid',
              },
            },
            {
              id: 'overdue_invoices',
              label: 'Overdue',
              labelAr: 'متأخرة',
              href: `${MODULE_PATHS.finance}/invoices?status=overdue`,
              badge: {
                key: 'overdue_invoices',
                color: 'red',
                variant: 'solid',
              },
            },
            {
              id: 'create_invoice',
              label: 'Create Invoice',
              labelAr: 'إنشاء فاتورة',
              href: `${MODULE_PATHS.finance}/invoices/new`,
            },
          ],
        },
        {
          id: 'payments',
          label: 'Payments',
          labelAr: 'المدفوعات',
          href: `${MODULE_PATHS.finance}/payments`,
          iconName: 'CreditCard',
          children: [
            {
              id: 'payment_history',
              label: 'Payment History',
              labelAr: 'تاريخ المدفوعات',
              href: `${MODULE_PATHS.finance}/payments`,
            },
            {
              id: 'payment_methods',
              label: 'Payment Methods',
              labelAr: 'طرق الدفع',
              href: `${MODULE_PATHS.finance}/payments/methods`,
            },
            {
              id: 'recurring_payments',
              label: 'Recurring Payments',
              labelAr: 'المدفوعات المتكررة',
              href: `${MODULE_PATHS.finance}/payments/recurring`,
            },
          ],
        },
        {
          id: 'expenses',
          label: 'Expenses',
          labelAr: 'المصروفات',
          href: `${MODULE_PATHS.finance}/expenses`,
          iconName: 'Receipt',
          children: [
            {
              id: 'expense_tracking',
              label: 'Expense Tracking',
              labelAr: 'تتبع المصروفات',
              href: `${MODULE_PATHS.finance}/expenses`,
            },
            {
              id: 'expense_categories',
              label: 'Categories',
              labelAr: 'الفئات',
              href: `${MODULE_PATHS.finance}/expenses/categories`,
            },
            {
              id: 'expense_reports',
              label: 'Expense Reports',
              labelAr: 'تقارير المصروفات',
              href: `${MODULE_PATHS.finance}/expenses/reports`,
            },
          ],
        },
        {
          id: 'accounting',
          label: 'Accounting',
          labelAr: 'المحاسبة',
          href: `${MODULE_PATHS.finance}/accounting`,
          iconName: 'Calculator',
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
          children: [
            {
              id: 'chart_of_accounts',
              label: 'Chart of Accounts',
              labelAr: 'دليل الحسابات',
              href: `${MODULE_PATHS.finance}/accounting/accounts`,
            },
            {
              id: 'general_ledger',
              label: 'General Ledger',
              labelAr: 'دفتر الأستاذ العام',
              href: `${MODULE_PATHS.finance}/accounting/ledger`,
            },
            {
              id: 'financial_statements',
              label: 'Financial Statements',
              labelAr: 'القوائم المالية',
              href: `${MODULE_PATHS.finance}/accounting/statements`,
            },
          ],
        },
        {
          id: 'budgeting',
          label: 'Budgeting',
          labelAr: 'الميزانية',
          href: `${MODULE_PATHS.finance}/budgeting`,
          iconName: 'TrendingUp',
          subscriptionPlans: ['ENTERPRISE'],
          isNew: true,
          children: [
            {
              id: 'budget_planning',
              label: 'Budget Planning',
              labelAr: 'تخطيط الميزانية',
              href: `${MODULE_PATHS.finance}/budgeting/planning`,
            },
            {
              id: 'budget_tracking',
              label: 'Budget Tracking',
              labelAr: 'تتبع الميزانية',
              href: `${MODULE_PATHS.finance}/budgeting/tracking`,
            },
            {
              id: 'variance_analysis',
              label: 'Variance Analysis',
              labelAr: 'تحليل الانحراف',
              href: `${MODULE_PATHS.finance}/budgeting/variance`,
            },
          ],
        },
      ],
    },

    // ==========================================
    // HR Management Section
    // ==========================================
    {
      id: 'human_resources',
      label: 'Human Resources',
      labelAr: 'الموارد البشرية',
      roles: HR_ROLES,
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      permissions: ['module:hr'],
      items: [
        {
          id: 'employees',
          label: 'Employees',
          labelAr: 'الموظفون',
          href: `${MODULE_PATHS.hr}/employees`,
          iconName: 'Users',
          children: [
            {
              id: 'employee_directory',
              label: 'Employee Directory',
              labelAr: 'دليل الموظفين',
              href: `${MODULE_PATHS.hr}/employees`,
            },
            {
              id: 'employee_onboarding',
              label: 'Onboarding',
              labelAr: 'إدماج الموظفين',
              href: `${MODULE_PATHS.hr}/employees/onboarding`,
            },
            {
              id: 'performance_reviews',
              label: 'Performance Reviews',
              labelAr: 'تقييمات الأداء',
              href: `${MODULE_PATHS.hr}/employees/performance`,
            },
          ],
        },
        {
          id: 'recruitment',
          label: 'Recruitment',
          labelAr: 'التوظيف',
          href: `${MODULE_PATHS.hr}/recruitment`,
          iconName: 'UserPlus',
          children: [
            {
              id: 'job_postings',
              label: 'Job Postings',
              labelAr: 'الوظائف المنشورة',
              href: `${MODULE_PATHS.hr}/recruitment/jobs`,
            },
            {
              id: 'applications',
              label: 'Applications',
              labelAr: 'الطلبات',
              href: `${MODULE_PATHS.hr}/recruitment/applications`,
              badge: {
                key: 'hr_applications',
                color: 'blue',
                variant: 'solid',
              },
            },
            {
              id: 'interview_scheduling',
              label: 'Interview Scheduling',
              labelAr: 'جدولة المقابلات',
              href: `${MODULE_PATHS.hr}/recruitment/interviews`,
            },
          ],
        },
        {
          id: 'payroll',
          label: 'Payroll',
          labelAr: 'كشوف المرتبات',
          href: `${MODULE_PATHS.hr}/payroll`,
          iconName: 'DollarSign',
          subscriptionPlans: ['ENTERPRISE'],
          children: [
            {
              id: 'payroll_processing',
              label: 'Payroll Processing',
              labelAr: 'معالجة الرواتب',
              href: `${MODULE_PATHS.hr}/payroll/processing`,
            },
            {
              id: 'salary_structure',
              label: 'Salary Structure',
              labelAr: 'هيكل الرواتب',
              href: `${MODULE_PATHS.hr}/payroll/salary`,
            },
            {
              id: 'tax_calculations',
              label: 'Tax Calculations',
              labelAr: 'حسابات الضرائب',
              href: `${MODULE_PATHS.hr}/payroll/taxes`,
            },
          ],
        },
        {
          id: 'attendance',
          label: 'Attendance',
          labelAr: 'الحضور',
          href: `${MODULE_PATHS.hr}/attendance`,
          iconName: 'Clock',
          children: [
            {
              id: 'time_tracking',
              label: 'Time Tracking',
              labelAr: 'تتبع الوقت',
              href: `${MODULE_PATHS.hr}/attendance/tracking`,
            },
            {
              id: 'leave_management',
              label: 'Leave Management',
              labelAr: 'إدارة الإجازات',
              href: `${MODULE_PATHS.hr}/attendance/leave`,
            },
            {
              id: 'overtime_tracking',
              label: 'Overtime Tracking',
              labelAr: 'تتبع الوقت الإضافي',
              href: `${MODULE_PATHS.hr}/attendance/overtime`,
            },
          ],
        },
      ],
    },

    // ==========================================
    // CRM Section
    // ==========================================
    {
      id: 'crm',
      label: 'CRM',
      labelAr: 'إدارة علاقات العملاء',
      roles: CRM_ROLES,
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      items: [
        {
          id: 'contacts',
          label: 'Contacts',
          labelAr: 'جهات الاتصال',
          href: '/crm/contacts',
          iconName: 'Users',
          children: [
            {
              id: 'contact_list',
              label: 'Contact List',
              labelAr: 'قائمة جهات الاتصال',
              href: '/crm/contacts',
            },
            {
              id: 'contact_segmentation',
              label: 'Segmentation',
              labelAr: 'التقسيم',
              href: '/crm/contacts/segments',
            },
            {
              id: 'import_contacts',
              label: 'Import Contacts',
              labelAr: 'استيراد جهات الاتصال',
              href: '/crm/contacts/import',
            },
          ],
        },
        {
          id: 'deals',
          label: 'Deals',
          labelAr: 'الصفقات',
          href: `${MODULE_PATHS.crm}/deals`,
          iconName: 'Handshake',
          badge: {
            key: 'crm_deals',
            color: 'green',
            variant: 'solid',
          },
          children: [
            {
              id: 'deal_pipeline',
              label: 'Deal Pipeline',
              labelAr: 'خط أنابيب الصفقات',
              href: `${MODULE_PATHS.crm}/deals`,
            },
            {
              id: 'won_deals',
              label: 'Won Deals',
              labelAr: 'الصفقات المربوحة',
              href: '/crm/deals?status=won',
            },
            {
              id: 'forecast',
              label: 'Sales Forecast',
              labelAr: 'توقعات المبيعات',
              href: '/crm/deals/forecast',
            },
          ],
        },
        {
          id: 'activities',
          label: 'Activities',
          labelAr: 'الأنشطة',
          href: '/crm/activities',
          iconName: 'Activity',
          children: [
            {
              id: 'activity_timeline',
              label: 'Activity Timeline',
              labelAr: 'الجدول الزمني للأنشطة',
              href: '/crm/activities',
            },
            {
              id: 'tasks',
              label: 'Tasks',
              labelAr: 'المهام',
              href: '/crm/activities/tasks',
            },
            {
              id: 'meetings',
              label: 'Meetings',
              labelAr: 'الاجتماعات',
              href: '/crm/activities/meetings',
            },
          ],
        },
        {
          id: 'campaigns',
          label: 'Campaigns',
          labelAr: 'الحملات',
          href: '/crm/campaigns',
          iconName: 'Megaphone',
          subscriptionPlans: ['ENTERPRISE'],
          children: [
            {
              id: 'email_campaigns',
              label: 'Email Campaigns',
              labelAr: 'حملات البريد الإلكتروني',
              href: '/crm/campaigns/email',
            },
            {
              id: 'sms_campaigns',
              label: 'SMS Campaigns',
              labelAr: 'حملات الرسائل النصية',
              href: '/crm/campaigns/sms',
            },
            {
              id: 'campaign_analytics',
              label: 'Campaign Analytics',
              labelAr: 'تحليلات الحملات',
              href: '/crm/campaigns/analytics',
            },
          ],
        },
      ],
    },

    // ==========================================
    // Support Section
    // ==========================================
    {
      id: 'support',
      label: 'Support',
      labelAr: 'الدعم',
      roles: SUPPORT_ROLES,
      items: [
        {
          id: 'tickets',
          label: 'Support Tickets',
          labelAr: 'تذاكر الدعم',
          href: '/fm/support/tickets',
          iconName: 'MessageSquare',
          roles: SUPPORT_ROLES,
          badge: {
            key: 'open_support_tickets',
            color: 'red',
            variant: 'solid',
            pulse: true,
          },
          children: [
            {
              id: 'open_tickets',
              label: 'Open Tickets',
              labelAr: 'التذاكر المفتوحة',
              href: '/fm/support/tickets?status=open',
            },
            {
              id: 'assigned_tickets',
              label: 'Assigned to Me',
              labelAr: 'مُخصصة لي',
              href: '/fm/support/tickets?assignee=me',
            },
            {
              id: 'escalated_tickets',
              label: 'Escalated',
              labelAr: 'مُتصاعدة',
              href: '/fm/support/tickets?status=escalated',
            },
            {
              id: 'create_support_ticket',
              label: 'Create Ticket',
              labelAr: 'إنشاء تذكرة',
              href: '/fm/support/tickets/new',
              roles: ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'FM_MANAGER', 'EMPLOYEE', 'SUPPORT'],
            },
            {
              id: 'major_incident_escalation',
              label: 'Major Incident Escalation',
              labelAr: 'تصعيد حادثة كبرى',
              href: '/fm/support/escalations/new',
              roles: ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'FM_MANAGER', 'SUPPORT'],
            },
          ],
        },
        {
          id: 'knowledge_base',
          label: 'Knowledge Base',
          labelAr: 'قاعدة المعرفة',
          href: '/support/kb',
          iconName: 'BookOpen',
          children: [
            {
              id: 'articles',
              label: 'Articles',
              labelAr: 'المقالات',
              href: '/support/kb/articles',
            },
            {
              id: 'faqs',
              label: 'FAQs',
              labelAr: 'الأسئلة الشائعة',
              href: '/support/kb/faqs',
            },
            {
              id: 'tutorials',
              label: 'Tutorials',
              labelAr: 'البرامج التعليمية',
              href: '/support/kb/tutorials',
            },
          ],
        },
        {
          id: 'live_chat',
          label: 'Live Chat',
          labelAr: 'الدردشة المباشرة',
          href: '/support/chat',
          iconName: 'MessageCircle',
          roles: ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'FM_MANAGER', 'EMPLOYEE', 'SUPPORT'],
          isNew: true,
        },
      ],
    },

    // ==========================================
    // Compliance & Legal Section
    // ==========================================
    {
      id: 'compliance_module',
      label: 'Compliance & Legal',
      labelAr: 'الامتثال والشؤون القانونية',
      roles: COMPLIANCE_ROLES,
      items: [
        {
          id: 'compliance_overview',
          label: 'Overview',
          labelAr: 'نظرة عامة',
          href: '/fm/compliance',
          iconName: 'ShieldCheck',
        },
        {
          id: 'compliance_audits',
          label: 'Audit Programs',
          labelAr: 'برامج التدقيق',
          href: '/fm/compliance/audits',
          iconName: 'ClipboardCheck',
          children: [
            {
              id: 'compliance_audits_new',
              label: 'Plan Audit',
              labelAr: 'خطة تدقيق',
              href: '/fm/compliance/audits/new',
            },
          ],
        },
        {
          id: 'compliance_policies',
          label: 'Policy Library',
          labelAr: 'مكتبة السياسات',
          href: '/fm/compliance/policies',
          iconName: 'BookCheck',
          children: [
            {
              id: 'compliance_policy_draft',
              label: 'Draft Policy',
              labelAr: 'مسودة سياسة',
              href: '/fm/administration/policies/new',
            },
          ],
        },
        {
          id: 'compliance_contract_entry',
          label: 'Contracts & Obligations',
          labelAr: 'العقود والالتزامات',
          href: '/fm/compliance/contracts/new',
          iconName: 'FileSignature',
        },
      ],
    },

    // ==========================================
    // Settings & Administration
    // ==========================================
    {
      id: 'administration',
      label: 'Administration',
      labelAr: 'الإدارة',
      roles: ADMIN_ROLES,
      permissions: ['module:administration'],
      items: [
        {
          id: 'organization',
          label: 'Organization',
          labelAr: 'المؤسسة',
          href: '/admin/organization',
          iconName: 'Building',
          children: [
            {
              id: 'org_settings',
              label: 'Settings',
              labelAr: 'الإعدادات',
              href: '/admin/organization/settings',
            },
            {
              id: 'billing_subscription',
              label: 'Billing & Subscription',
              labelAr: 'الفواتير والاشتراك',
              href: '/admin/organization/billing',
            },
            {
              id: 'usage_analytics',
              label: 'Usage Analytics',
              labelAr: 'تحليلات الاستخدام',
              href: '/admin/organization/analytics',
            },
          ],
        },
        {
          id: 'users_permissions',
          label: 'Users & Permissions',
          labelAr: 'المستخدمون والصلاحيات',
          href: '/admin/users',
          iconName: 'Shield',
          children: [
            {
              id: 'user_management',
              label: 'User Management',
              labelAr: 'إدارة المستخدمين',
              href: '/admin/users',
            },
            {
              id: 'roles_permissions',
              label: 'Roles & Permissions',
              labelAr: 'الأدوار والصلاحيات',
              href: '/admin/users/roles',
            },
            {
              id: 'access_logs',
              label: 'Access Logs',
              labelAr: 'سجلات الوصول',
              href: '/admin/users/logs',
            },
          ],
        },
        {
          id: 'integrations',
          label: 'Integrations',
          labelAr: 'التكاملات',
          href: '/admin/integrations',
          iconName: 'Zap',
          children: [
            {
              id: 'api_keys',
              label: 'API Keys',
              labelAr: 'مفاتيح API',
              href: '/admin/integrations/api',
            },
            {
              id: 'webhooks',
              label: 'Webhooks',
              labelAr: 'Webhooks',
              href: '/admin/integrations/webhooks',
            },
            {
              id: 'third_party',
              label: 'Third Party Apps',
              labelAr: 'تطبيقات الطرف الثالث',
              href: '/admin/integrations/apps',
            },
          ],
        },
        {
          id: 'system_settings',
          label: 'System Settings',
          labelAr: 'إعدادات النظام',
          href: '/admin/system',
          iconName: 'Settings',
          children: [
            {
              id: 'general_settings',
              label: 'General Settings',
              labelAr: 'الإعدادات العامة',
              href: '/admin/system/general',
            },
            {
              id: 'notifications',
              label: 'Notifications',
              labelAr: 'الإشعارات',
              href: '/admin/system/notifications',
            },
            {
              id: 'help_articles_admin',
              label: 'Help Articles',
              labelAr: 'مقالات المساعدة',
              href: '/admin/help-articles',
            },
            {
              id: 'email_templates',
              label: 'Email Templates',
              labelAr: 'قوالب البريد الإلكتروني',
              href: '/admin/system/email-templates',
            },
            {
              id: 'backup_restore',
              label: 'Backup & Restore',
              labelAr: 'النسخ الاحتياطي والاستعادة',
              href: '/admin/system/backup',
            },
          ],
        },
      ],
    },

    // ==========================================
    // Personal Settings
    // ==========================================
    {
      id: 'personal',
      label: 'Personal',
      labelAr: 'شخصي',
      items: [
        {
          id: 'profile',
          label: 'Profile',
          labelAr: 'الملف الشخصي',
          href: '/profile',
          iconName: 'User',
          children: [
            {
              id: 'personal_info',
              label: 'Personal Information',
              labelAr: 'المعلومات الشخصية',
              href: '/profile/personal',
            },
            {
              id: 'security_settings',
              label: 'Security Settings',
              labelAr: 'إعدادات الأمان',
              href: '/profile/security',
            },
            {
              id: 'notification_preferences',
              label: 'Notifications',
              labelAr: 'الإشعارات',
              href: '/profile/notifications',
            },
          ],
        },
        {
          id: 'preferences',
          label: 'Preferences',
          labelAr: 'التفضيلات',
          href: '/profile/preferences',
          iconName: 'Sliders',
          children: [
            {
              id: 'language_region',
              label: 'Language & Region',
              labelAr: 'اللغة والمنطقة',
              href: '/profile/preferences/language',
            },
            {
              id: 'theme_appearance',
              label: 'Theme & Appearance',
              labelAr: 'المظهر والثيم',
              href: '/profile/preferences/theme',
            },
            {
              id: 'dashboard_layout',
              label: 'Dashboard Layout',
              labelAr: 'تخطيط لوحة التحكم',
              href: '/profile/preferences/dashboard',
            },
          ],
        },
        {
          id: 'help_support',
          label: 'Help & Support',
          labelAr: 'المساعدة والدعم',
          href: '/help',
          iconName: 'HelpCircle',
          children: [
            {
              id: 'documentation',
              label: 'Documentation',
              labelAr: 'التوثيق',
              href: '/help/docs',
              isExternal: true,
            },
            {
              id: 'contact_support',
              label: 'Contact Support',
              labelAr: 'اتصل بالدعم',
              href: '/help/contact',
            },
            {
              id: 'feature_requests',
              label: 'Feature Requests',
              labelAr: 'طلبات الميزات',
              href: '/help/features',
            },
          ],
        },
        {
          separator: true,
          id: 'logout_separator',
          label: '',
        },
        {
          id: 'logout',
          label: 'Logout',
          labelAr: 'تسجيل الخروج',
          href: '/logout',
          iconName: 'LogOut',
        },
      ],
    },
  ],
};

export const navigationConfig = normalizeNavigationConfig(rawNavigationConfig);

// ==========================================
// Helper Functions
// ==========================================

/**
 * Filter navigation items based on role/subscription with legacy role normalization (e.g. MANAGER ⇔ FM_MANAGER).
 */
export function filterNavigation(
  config: NavigationConfig,
  userRole: UserRoleInput | null | undefined,
  subscriptionPlan: SubscriptionPlan | null | undefined,
  userPermissions: readonly string[] = []
): NavigationConfig {
  const effectivePlan = subscriptionPlan ?? 'DEFAULT';
  const filteredSections = config.sections
    .map(section => {
      // Check section-level permissions
      if (!roleIsAllowed(section.roles, userRole)) {
        return null;
      }
      if (!hasRequiredPermissions(section.permissions, userPermissions)) {
        return null;
      }
      if (section.subscriptionPlans && !section.subscriptionPlans.includes(effectivePlan)) {
        return null;
      }

      // Filter section items
      const filteredItems = filterNavigationItems(
        section.items,
        userRole,
        effectivePlan,
        userPermissions
      );
      
      if (filteredItems.length === 0) {
        return null;
      }

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section): section is NavigationSection => section !== null);

  return {
    ...config,
    sections: filteredSections,
  };
}

/**
 * Filter navigation items recursively
 */
function filterNavigationItems(
  items: NavigationItem[],
  userRole: UserRoleInput | null | undefined,
  subscriptionPlan: SubscriptionPlan,
  userPermissions: readonly string[]
): NavigationItem[] {
  return items
    .map(item => {
      // Check item-level permissions
      if (!roleIsAllowed(item.roles, userRole)) {
        return null;
      }
      if (item.subscriptionPlans && !item.subscriptionPlans.includes(subscriptionPlan)) {
        return null;
      }
      if (!hasRequiredPermissions(item.permissions, userPermissions)) {
        return null;
      }
      if (item.hidden) {
        return null;
      }

      // Filter children recursively
      const filteredChildren = item.children
        ? filterNavigationItems(item.children, userRole, subscriptionPlan, userPermissions)
        : undefined;

      return {
        ...item,
        children: filteredChildren,
      };
    })
    .filter(item => item !== null) as NavigationItem[];
}

/**
 * Get navigation item by ID
 */
export function getNavigationItem(config: NavigationConfig, id: string): NavigationItem | null {
  for (const section of config.sections) {
    const item = findNavigationItemInItems(section.items, id);
    if (item) {
      return item;
    }
  }
  return null;
}

/**
 * Find navigation item in items array recursively
 */
function findNavigationItemInItems(items: NavigationItem[], id: string): NavigationItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findNavigationItemInItems(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Get breadcrumb trail for navigation item
 */
export function getBreadcrumb(config: NavigationConfig, id: string): NavigationItem[] {
  for (const section of config.sections) {
    const trail = findBreadcrumbInItems(section.items, id, []);
    if (trail) {
      return trail;
    }
  }
  return [];
}

/**
 * Find breadcrumb trail recursively
 */
function findBreadcrumbInItems(
  items: NavigationItem[],
  targetId: string,
  currentTrail: NavigationItem[]
): NavigationItem[] | null {
  for (const item of items) {
    const newTrail = [...currentTrail, item];
    
    if (item.id === targetId) {
      return newTrail;
    }
    
    if (item.children) {
      const foundTrail = findBreadcrumbInItems(item.children, targetId, newTrail);
      if (foundTrail) {
        return foundTrail;
      }
    }
  }
  return null;
}

/**
 * Returns true when a user with the given role/subscription can reach the item (alias-aware).
 */
export function hasAccessToItem(
  item: NavigationItem,
  userRole: UserRoleInput,
  subscriptionPlan: SubscriptionPlan,
  userPermissions: string[] = []
): boolean {
  if (!roleIsAllowed(item.roles, userRole)) {
    return false;
  }
  if (item.subscriptionPlans && !item.subscriptionPlans.includes(subscriptionPlan)) {
    return false;
  }
  if (!hasRequiredPermissions(item.permissions, userPermissions)) {
    return false;
  }
  if (item.hidden) {
    return false;
  }
  return true;
}
