// ==========================================
// Enhanced Navigation Configuration
// ==========================================
// Comprehensive navigation system with RBAC, subscription filtering,
// and multi-level menu support for Fixzit platform

import {
  LucideIcon,
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
import { type UserRoleType } from '@/types/user';

// ==========================================
// Types & Interfaces
// ==========================================

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'MANAGER'
  | 'PROPERTY_MANAGER'
  | 'OWNER'
  | 'TENANT'
  | 'VENDOR'
  | 'EMPLOYEE'
  | 'GUEST';

export type SubscriptionPlan = 'FREE' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

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
  roles?: UserRole[];
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
  roles?: UserRole[];
  subscriptionPlans?: SubscriptionPlan[];
  collapsed?: boolean;
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
  | 'work_orders'
  | 'properties'
  | 'finance'
  | 'hr'
  | 'administration'
  | 'crm'
  | 'marketplace'
  | 'support'
  | 'compliance'
  | 'reports'
  | 'system';

export const MODULE_PATHS = {
  dashboard: '/fm/dashboard',
  work_orders: '/fm/work-orders',
  properties: '/fm/properties',
  finance: '/fm/finance',
  hr: '/fm/hr',
  administration: '/fm/administration',
  crm: '/fm/crm',
  marketplace: '/fm/marketplace',
  support: '/fm/support',
  compliance: '/fm/compliance',
  reports: '/fm/reports',
  system: '/fm/system',
} as const;

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
    { id: 'hr-directory', name: 'nav.hr.directory', fallbackLabel: 'Employee Directory', kind: 'path', value: '/employees' },
    { id: 'hr-attendance', name: 'nav.hr.attendanceLeave', fallbackLabel: 'Attendance & Leave', kind: 'query', value: 'attendance' },
    { id: 'hr-payroll', name: 'nav.hr.payroll', fallbackLabel: 'Payroll', kind: 'path', value: '/payroll' },
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
const CORE_PLAN: ModuleId[] = ['dashboard', 'work_orders', 'properties', 'support'];
const PRO_PLAN: ModuleId[] = [...CORE_PLAN, 'finance', 'hr', 'crm', 'marketplace', 'reports'];

export const SUBSCRIPTION_PLANS: Record<string, readonly ModuleId[]> = {
  DEFAULT: ALL_MODULE_IDS,
  FREE: CORE_PLAN,
  BASIC: CORE_PLAN,
  PRO: PRO_PLAN,
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
const fmLeadership: ModuleId[] = ['dashboard', 'work_orders', 'properties', 'hr', 'support', 'reports'];
const propertyOps: ModuleId[] = ['dashboard', 'properties', 'work_orders', 'crm', 'support', 'reports'];
const financeOnly: ModuleId[] = ['dashboard', 'finance', 'reports', 'support'];
const hrOnly: ModuleId[] = ['dashboard', 'hr', 'support', 'reports'];
const procurementOnly: ModuleId[] = ['dashboard', 'marketplace', 'support', 'reports'];
const technicianOnly: ModuleId[] = ['dashboard', 'work_orders', 'support'];
const ownerTenant: ModuleId[] = ['dashboard', 'properties', 'support', 'reports'];
const vendorOnly: ModuleId[] = ['dashboard', 'marketplace', 'support'];
const customerOnly: ModuleId[] = ['dashboard', 'support'];
const complianceOnly: ModuleId[] = ['dashboard', 'compliance', 'reports'];
const viewerOnly: ModuleId[] = ['dashboard', 'reports'];

export const ROLE_PERMISSIONS: Record<UserRoleType | 'guest', readonly ModuleId[]> = {
  SUPER_ADMIN: fullAccess,
  CORPORATE_ADMIN: fullAccess,
  ADMIN: adminCore,
  FM_MANAGER: fmLeadership,
  PROPERTY_MANAGER: propertyOps,
  FINANCE: financeOnly,
  HR: hrOnly,
  PROCUREMENT: procurementOnly,
  TECHNICIAN: technicianOnly,
  EMPLOYEE: hrOnly,
  OWNER: ownerTenant,
  TENANT: ownerTenant,
  VENDOR: vendorOnly,
  CUSTOMER: customerOnly,
  AUDITOR: complianceOnly,
  VIEWER: viewerOnly,
  DISPATCHER: technicianOnly,
  SUPPORT: ['dashboard', 'support'],
  // External roles fall back to view-only
  guest: viewerOnly,
};

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

export const navigationConfig: NavigationConfig = {
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
      items: [
        {
          id: 'overview',
          label: 'Overview',
          labelAr: 'نظرة عامة',
          href: '/dashboard',
          iconName: 'LayoutDashboard',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
        },
        {
          id: 'analytics',
          label: 'Analytics',
          labelAr: 'التحليلات',
          href: '/dashboard/analytics',
          iconName: 'BarChart3',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
        },
        {
          id: 'reports',
          label: 'Reports',
          labelAr: 'التقارير',
          href: '/dashboard/reports',
          iconName: 'FileText',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
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
      items: [
        {
          id: 'properties',
          label: 'Properties',
          labelAr: 'العقارات',
          href: '/fm/properties',
          iconName: 'Building2',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
          children: [
            {
              id: 'property_list',
              label: 'Property List',
              labelAr: 'قائمة العقارات',
              href: '/fm/properties',
            },
            {
              id: 'add_property',
              label: 'Add Property',
              labelAr: 'إضافة عقار',
              href: '/fm/properties/add',
              roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
            },
            {
              id: 'property_types',
              label: 'Property Types',
              labelAr: 'أنواع العقارات',
              href: '/fm/properties/types',
              roles: ['SUPER_ADMIN', 'ADMIN'],
            },
          ],
        },
        {
          id: 'units',
          label: 'Units',
          labelAr: 'الوحدات',
          href: '/fm/units',
          iconName: 'Home',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
          children: [
            {
              id: 'unit_list',
              label: 'Unit List',
              labelAr: 'قائمة الوحدات',
              href: '/fm/units',
            },
            {
              id: 'vacant_units',
              label: 'Vacant Units',
              labelAr: 'الوحدات الشاغرة',
              href: '/fm/units?status=vacant',
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
              href: '/fm/units?status=occupied',
            },
          ],
        },
        {
          id: 'work_orders',
          label: 'Work Orders',
          labelAr: 'أوامر العمل',
          href: '/fm/work-orders',
          iconName: 'Wrench',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'EMPLOYEE', 'TENANT'],
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
              href: '/fm/work-orders',
            },
            {
              id: 'pending_work_orders',
              label: 'Pending',
              labelAr: 'قيد الانتظار',
              href: '/fm/work-orders?status=pending',
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
              href: '/fm/work-orders?status=in_progress',
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
              href: '/fm/work-orders/create',
              roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'TENANT'],
            },
          ],
        },
        {
          id: 'assets',
          label: 'Assets',
          labelAr: 'الأصول',
          href: '/fm/assets',
          iconName: 'Package',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER'],
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
          children: [
            {
              id: 'asset_list',
              label: 'Asset List',
              labelAr: 'قائمة الأصول',
              href: '/fm/assets',
            },
            {
              id: 'maintenance_schedules',
              label: 'Maintenance Schedules',
              labelAr: 'جداول الصيانة',
              href: '/fm/assets/maintenance',
            },
            {
              id: 'asset_tracking',
              label: 'Asset Tracking',
              labelAr: 'تتبع الأصول',
              href: '/fm/assets/tracking',
              subscriptionPlans: ['ENTERPRISE'],
            },
          ],
        },
        {
          id: 'tenants',
          label: 'Tenants',
          labelAr: 'المستأجرون',
          href: '/fm/tenants',
          iconName: 'Users',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
          children: [
            {
              id: 'tenant_list',
              label: 'Tenant List',
              labelAr: 'قائمة المستأجرين',
              href: '/fm/tenants',
            },
            {
              id: 'lease_agreements',
              label: 'Lease Agreements',
              labelAr: 'اتفاقيات الإيجار',
              href: '/fm/tenants/leases',
            },
            {
              id: 'tenant_portal',
              label: 'Tenant Portal',
              labelAr: 'بوابة المستأجرين',
              href: '/fm/tenants/portal',
              isNew: true,
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
      items: [
        {
          id: 'vendors',
          label: 'Vendors',
          labelAr: 'الموردون',
          href: '/souq/vendors',
          iconName: 'Store',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'vendor_directory',
              label: 'Vendor Directory',
              labelAr: 'دليل الموردين',
              href: '/souq/vendors',
            },
            {
              id: 'vendor_registration',
              label: 'Vendor Registration',
              labelAr: 'تسجيل المورد',
              href: '/souq/vendors/register',
              roles: ['SUPER_ADMIN', 'ADMIN'],
            },
            {
              id: 'vendor_ratings',
              label: 'Ratings & Reviews',
              labelAr: 'التقييمات والمراجعات',
              href: '/souq/vendors/ratings',
            },
          ],
        },
        {
          id: 'products',
          label: 'Products',
          labelAr: 'المنتجات',
          href: '/souq/products',
          iconName: 'ShoppingBag',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'product_catalog',
              label: 'Product Catalog',
              labelAr: 'كتالوج المنتجات',
              href: '/souq/products',
            },
            {
              id: 'categories',
              label: 'Categories',
              labelAr: 'الفئات',
              href: '/souq/products/categories',
            },
            {
              id: 'inventory',
              label: 'Inventory',
              labelAr: 'المخزون',
              href: '/souq/products/inventory',
              roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR'],
            },
          ],
        },
        {
          id: 'services',
          label: 'Services',
          labelAr: 'الخدمات',
          href: '/souq/services',
          iconName: 'Settings',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'service_catalog',
              label: 'Service Catalog',
              labelAr: 'كتالوج الخدمات',
              href: '/souq/services',
            },
            {
              id: 'service_packages',
              label: 'Service Packages',
              labelAr: 'حزم الخدمات',
              href: '/souq/services/packages',
            },
            {
              id: 'service_booking',
              label: 'Service Booking',
              labelAr: 'حجز الخدمات',
              href: '/souq/services/booking',
            },
          ],
        },
        {
          id: 'rfqs',
          label: 'RFQs',
          labelAr: 'طلبات التسعير',
          href: '/souq/rfqs',
          iconName: 'FileSearch',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'rfq_list',
              label: 'RFQ List',
              labelAr: 'قائمة طلبات التسعير',
              href: '/souq/rfqs',
            },
            {
              id: 'create_rfq',
              label: 'Create RFQ',
              labelAr: 'إنشاء طلب تسعير',
              href: '/souq/rfqs/create',
              roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER'],
            },
            {
              id: 'my_bids',
              label: 'My Bids',
              labelAr: 'عروضي',
              href: '/souq/rfqs/my-bids',
              roles: ['VENDOR'],
            },
          ],
        },
        {
          id: 'orders',
          label: 'Orders',
          labelAr: 'الطلبات',
          href: '/souq/orders',
          iconName: 'ShoppingCart',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
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
              href: '/souq/orders',
            },
            {
              id: 'purchase_orders',
              label: 'Purchase Orders',
              labelAr: 'طلبات الشراء',
              href: '/souq/orders/purchase',
            },
            {
              id: 'order_tracking',
              label: 'Order Tracking',
              labelAr: 'تتبع الطلبات',
              href: '/souq/orders/tracking',
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
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OWNER'],
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      items: [
        {
          id: 'listings',
          label: 'Listings',
          labelAr: 'القوائم',
          href: '/aqar/listings',
          iconName: 'MapPin',
          children: [
            {
              id: 'active_listings',
              label: 'Active Listings',
              labelAr: 'القوائم النشطة',
              href: '/aqar/listings?status=active',
            },
            {
              id: 'draft_listings',
              label: 'Draft Listings',
              labelAr: 'المسودات',
              href: '/aqar/listings?status=draft',
            },
            {
              id: 'create_listing',
              label: 'Create Listing',
              labelAr: 'إنشاء قائمة',
              href: '/aqar/listings/create',
            },
          ],
        },
        {
          id: 'projects',
          label: 'Projects',
          labelAr: 'المشاريع',
          href: '/aqar/projects',
          iconName: 'Building',
          children: [
            {
              id: 'project_list',
              label: 'Project List',
              labelAr: 'قائمة المشاريع',
              href: '/aqar/projects',
            },
            {
              id: 'development_projects',
              label: 'Development Projects',
              labelAr: 'مشاريع التطوير',
              href: '/aqar/projects/development',
            },
            {
              id: 'project_sales',
              label: 'Project Sales',
              labelAr: 'مبيعات المشاريع',
              href: '/aqar/projects/sales',
            },
          ],
        },
        {
          id: 'agents',
          label: 'Agents',
          labelAr: 'الوكلاء',
          href: '/aqar/agents',
          iconName: 'UserCheck',
          children: [
            {
              id: 'agent_directory',
              label: 'Agent Directory',
              labelAr: 'دليل الوكلاء',
              href: '/aqar/agents',
            },
            {
              id: 'agent_performance',
              label: 'Performance',
              labelAr: 'الأداء',
              href: '/aqar/agents/performance',
            },
            {
              id: 'commissions',
              label: 'Commissions',
              labelAr: 'العمولات',
              href: '/aqar/agents/commissions',
            },
          ],
        },
        {
          id: 'leads',
          label: 'Leads',
          labelAr: 'العملاء المحتملون',
          href: '/aqar/leads',
          iconName: 'Target',
          badge: {
            key: 'aqar_leads',
            color: 'green',
            variant: 'solid',
          },
          children: [
            {
              id: 'lead_management',
              label: 'Lead Management',
              labelAr: 'إدارة العملاء المحتملين',
              href: '/aqar/leads',
            },
            {
              id: 'lead_scoring',
              label: 'Lead Scoring',
              labelAr: 'تقييم العملاء',
              href: '/aqar/leads/scoring',
              subscriptionPlans: ['ENTERPRISE'],
            },
            {
              id: 'conversion_tracking',
              label: 'Conversion Tracking',
              labelAr: 'تتبع التحويل',
              href: '/aqar/leads/conversion',
            },
          ],
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
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      items: [
        {
          id: 'invoices',
          label: 'Invoices',
          labelAr: 'الفواتير',
          href: '/finance/invoices',
          iconName: 'FileText',
          children: [
            {
              id: 'all_invoices',
              label: 'All Invoices',
              labelAr: 'جميع الفواتير',
              href: '/finance/invoices',
            },
            {
              id: 'pending_invoices',
              label: 'Pending',
              labelAr: 'قيد الانتظار',
              href: '/finance/invoices?status=pending',
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
              href: '/finance/invoices?status=overdue',
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
              href: '/finance/invoices/create',
            },
          ],
        },
        {
          id: 'payments',
          label: 'Payments',
          labelAr: 'المدفوعات',
          href: '/finance/payments',
          iconName: 'CreditCard',
          children: [
            {
              id: 'payment_history',
              label: 'Payment History',
              labelAr: 'تاريخ المدفوعات',
              href: '/finance/payments',
            },
            {
              id: 'payment_methods',
              label: 'Payment Methods',
              labelAr: 'طرق الدفع',
              href: '/finance/payments/methods',
            },
            {
              id: 'recurring_payments',
              label: 'Recurring Payments',
              labelAr: 'المدفوعات المتكررة',
              href: '/finance/payments/recurring',
            },
          ],
        },
        {
          id: 'expenses',
          label: 'Expenses',
          labelAr: 'المصروفات',
          href: '/finance/expenses',
          iconName: 'Receipt',
          children: [
            {
              id: 'expense_tracking',
              label: 'Expense Tracking',
              labelAr: 'تتبع المصروفات',
              href: '/finance/expenses',
            },
            {
              id: 'expense_categories',
              label: 'Categories',
              labelAr: 'الفئات',
              href: '/finance/expenses/categories',
            },
            {
              id: 'expense_reports',
              label: 'Expense Reports',
              labelAr: 'تقارير المصروفات',
              href: '/finance/expenses/reports',
            },
          ],
        },
        {
          id: 'accounting',
          label: 'Accounting',
          labelAr: 'المحاسبة',
          href: '/finance/accounting',
          iconName: 'Calculator',
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
          children: [
            {
              id: 'chart_of_accounts',
              label: 'Chart of Accounts',
              labelAr: 'دليل الحسابات',
              href: '/finance/accounting/accounts',
            },
            {
              id: 'general_ledger',
              label: 'General Ledger',
              labelAr: 'دفتر الأستاذ العام',
              href: '/finance/accounting/ledger',
            },
            {
              id: 'financial_statements',
              label: 'Financial Statements',
              labelAr: 'القوائم المالية',
              href: '/finance/accounting/statements',
            },
          ],
        },
        {
          id: 'budgeting',
          label: 'Budgeting',
          labelAr: 'الميزانية',
          href: '/finance/budgeting',
          iconName: 'TrendingUp',
          subscriptionPlans: ['ENTERPRISE'],
          isNew: true,
          children: [
            {
              id: 'budget_planning',
              label: 'Budget Planning',
              labelAr: 'تخطيط الميزانية',
              href: '/finance/budgeting/planning',
            },
            {
              id: 'budget_tracking',
              label: 'Budget Tracking',
              labelAr: 'تتبع الميزانية',
              href: '/finance/budgeting/tracking',
            },
            {
              id: 'variance_analysis',
              label: 'Variance Analysis',
              labelAr: 'تحليل الانحراف',
              href: '/finance/budgeting/variance',
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
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      items: [
        {
          id: 'employees',
          label: 'Employees',
          labelAr: 'الموظفون',
          href: '/hr/employees',
          iconName: 'Users',
          children: [
            {
              id: 'employee_directory',
              label: 'Employee Directory',
              labelAr: 'دليل الموظفين',
              href: '/hr/employees',
            },
            {
              id: 'employee_onboarding',
              label: 'Onboarding',
              labelAr: 'إدماج الموظفين',
              href: '/hr/employees/onboarding',
            },
            {
              id: 'performance_reviews',
              label: 'Performance Reviews',
              labelAr: 'تقييمات الأداء',
              href: '/hr/employees/performance',
            },
          ],
        },
        {
          id: 'recruitment',
          label: 'Recruitment',
          labelAr: 'التوظيف',
          href: '/hr/recruitment',
          iconName: 'UserPlus',
          children: [
            {
              id: 'job_postings',
              label: 'Job Postings',
              labelAr: 'الوظائف المنشورة',
              href: '/hr/recruitment/jobs',
            },
            {
              id: 'applications',
              label: 'Applications',
              labelAr: 'الطلبات',
              href: '/hr/recruitment/applications',
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
              href: '/hr/recruitment/interviews',
            },
          ],
        },
        {
          id: 'payroll',
          label: 'Payroll',
          labelAr: 'كشوف المرتبات',
          href: '/hr/payroll',
          iconName: 'DollarSign',
          subscriptionPlans: ['ENTERPRISE'],
          children: [
            {
              id: 'payroll_processing',
              label: 'Payroll Processing',
              labelAr: 'معالجة الرواتب',
              href: '/hr/payroll/processing',
            },
            {
              id: 'salary_structure',
              label: 'Salary Structure',
              labelAr: 'هيكل الرواتب',
              href: '/hr/payroll/salary',
            },
            {
              id: 'tax_calculations',
              label: 'Tax Calculations',
              labelAr: 'حسابات الضرائب',
              href: '/hr/payroll/taxes',
            },
          ],
        },
        {
          id: 'attendance',
          label: 'Attendance',
          labelAr: 'الحضور',
          href: '/hr/attendance',
          iconName: 'Clock',
          children: [
            {
              id: 'time_tracking',
              label: 'Time Tracking',
              labelAr: 'تتبع الوقت',
              href: '/hr/attendance/tracking',
            },
            {
              id: 'leave_management',
              label: 'Leave Management',
              labelAr: 'إدارة الإجازات',
              href: '/hr/attendance/leave',
            },
            {
              id: 'overtime_tracking',
              label: 'Overtime Tracking',
              labelAr: 'تتبع الوقت الإضافي',
              href: '/hr/attendance/overtime',
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
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
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
          href: '/crm/deals',
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
              href: '/crm/deals',
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
      items: [
        {
          id: 'tickets',
          label: 'Support Tickets',
          labelAr: 'تذاكر الدعم',
          href: '/support/tickets',
          iconName: 'MessageSquare',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
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
              href: '/support/tickets?status=open',
            },
            {
              id: 'assigned_tickets',
              label: 'Assigned to Me',
              labelAr: 'مُخصصة لي',
              href: '/support/tickets?assignee=me',
            },
            {
              id: 'escalated_tickets',
              label: 'Escalated',
              labelAr: 'مُتصاعدة',
              href: '/support/tickets?status=escalated',
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
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
          isNew: true,
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
      roles: ['SUPER_ADMIN', 'ADMIN'],
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

// ==========================================
// Helper Functions
// ==========================================

/**
 * Filter navigation items based on user role and subscription plan
 */
export function filterNavigation(
  config: NavigationConfig,
  userRole: UserRole,
  subscriptionPlan: SubscriptionPlan
): NavigationConfig {
  const filteredSections = config.sections
    .map(section => {
      // Check section-level permissions
      if (section.roles && !section.roles.includes(userRole)) {
        return null;
      }
      if (section.subscriptionPlans && !section.subscriptionPlans.includes(subscriptionPlan)) {
        return null;
      }

      // Filter section items
      const filteredItems = filterNavigationItems(section.items, userRole, subscriptionPlan);
      
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
  userRole: UserRole,
  subscriptionPlan: SubscriptionPlan
): NavigationItem[] {
  return items
    .map(item => {
      // Check item-level permissions
      if (item.roles && !item.roles.includes(userRole)) {
        return null;
      }
      if (item.subscriptionPlans && !item.subscriptionPlans.includes(subscriptionPlan)) {
        return null;
      }
      if (item.hidden) {
        return null;
      }

      // Filter children recursively
      const filteredChildren = item.children
        ? filterNavigationItems(item.children, userRole, subscriptionPlan)
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
 * Check if user has access to specific navigation item
 */
export function hasAccessToItem(
  item: NavigationItem,
  userRole: UserRole,
  subscriptionPlan: SubscriptionPlan
): boolean {
  if (item.roles && !item.roles.includes(userRole)) {
    return false;
  }
  if (item.subscriptionPlans && !item.subscriptionPlans.includes(subscriptionPlan)) {
    return false;
  }
  if (item.hidden) {
    return false;
  }
  return true;
}
