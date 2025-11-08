import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings, UserCheck,
  ShoppingBag, Headphones, Shield, BarChart3, Cog, Bell
} from 'lucide-react';
import { type UserRoleType } from '@/types/user';

type LucideIconCmp = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export type ModuleItem = {
  id: string;
  name: string;
  icon: LucideIconCmp;
  path: string;
  category: keyof typeof CATEGORY_FALLBACKS | string;
};

export type UserLink = {
  id: string;
  name: string;
  icon: LucideIconCmp;
  path: string;
};

// ---------- Role-based module permissions ----------
export const ROLE_PERMISSIONS: Record<UserRoleType | 'guest', readonly string[]> = {
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
  ADMIN: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'support', 'reports'
  ],
  FINANCE: ['dashboard', 'finance', 'invoices', 'reports'],
  HR: ['dashboard', 'hr', 'reports'],
  TECHNICIAN: ['dashboard', 'work-orders', 'support'],
  OWNER: ['dashboard', 'properties', 'reports', 'support'],
  VIEWER: ['dashboard', 'reports'],
  DISPATCHER: ['dashboard', 'work-orders', 'properties'],
  guest: [] // Guests see no modules in the sidebar
} as const;

// ---------- Subscription-based module access ----------
export const SUBSCRIPTION_PLANS: Record<string, readonly string[]> = {
  BASIC: ['dashboard', 'properties', 'tenants', 'maintenance', 'support'],
  PROFESSIONAL: ['dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'support', 'reports'],
  ENTERPRISE: ['dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors', 'projects', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'marketplace', 'support', 'compliance', 'reports', 'system', 'administration'],
  DEFAULT: [] // Fallback for unknown plans
} as const;

// ---------- Modules ----------
export const MODULES: readonly ModuleItem[] = [
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
export const USER_LINKS: readonly UserLink[] = [
  { id:'profile',       name:'nav.profile',       icon:UserCheck, path:'/profile' },
  { id:'settings',      name:'nav.settings',      icon:Settings,   path:'/settings' },
  { id:'notifications', name:'nav.notifications', icon:Bell,       path:'/notifications' }
] as const;

// ---------- Category i18n mapping ----------
export const CATEGORY_FALLBACKS: Record<string, string> = {
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
