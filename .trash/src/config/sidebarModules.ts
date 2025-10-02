import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings,
  UserCheck, ShoppingBag, Headphones, Shield, BarChart3, Cog
} from 'lucide-react';

export const SIDEBAR_ITEMS = [
  { id: 'dashboard',    name: 'Dashboard',        icon: LayoutDashboard, path: '/dashboard',    group: 'Core' },
  { id: 'work-orders',  name: 'Work Orders',      icon: ClipboardList,   path: '/work-orders',  group: 'Operations',
    children: [
      { name: 'Create',            path: '/work-orders/create' },
      { name: 'Assign & Track',    path: '/work-orders/board' },
      { name: 'Preventive Maint.', path: '/work-orders/preventive' },
      { name: 'Service History',   path: '/work-orders/history' }
    ]
  },
  { id: 'properties',   name: 'Properties',       icon: Building2,       path: '/properties',   group: 'Operations',
    children: [
      { name: 'Property List',     path: '/properties' },
      { name: 'Units & Tenants',   path: '/properties/units' },
      { name: 'Lease Mgmt',        path: '/properties/leases' },
      { name: 'Inspections',       path: '/properties/inspections' },
      { name: 'Documents',         path: '/properties/documents' }
    ]
  },
  { id: 'finance',      name: 'Finance',          icon: DollarSign,      path: '/finance',      group: 'Finance',
    children: [
      { name: 'Invoices',          path: '/finance/invoices' },
      { name: 'Payments',          path: '/finance/payments' },
      { name: 'Expenses',          path: '/finance/expenses' },
      { name: 'Budgets',           path: '/finance/budgets' },
      { name: 'Reports',           path: '/finance/reports' }
    ]
  },
  { id: 'hr',           name: 'Human Resources',  icon: Users,           path: '/hr',           group: 'People',
    children: [
      { name: 'Directory',         path: '/hr/directory' },
      { name: 'Attendance & Leave',path: '/hr/leave' },
      { name: 'Payroll',           path: '/hr/payroll' },
      { name: 'Recruitment (ATS)', path: '/hr/ats' },
      { name: 'Training',          path: '/hr/training' },
      { name: 'Performance',       path: '/hr/performance' }
    ]
  },
  { id: 'administration', name: 'Administration', icon: Settings,        path: '/administration', group: 'Operations' },
  { id: 'crm',           name: 'CRM',             icon: UserCheck,       path: '/crm',          group: 'Core' },
  { id: 'marketplace',   name: 'Marketplace',     icon: ShoppingBag,     path: '/marketplace',  group: 'Operations' },
  { id: 'support',       name: 'Support',         icon: Headphones,      path: '/support',      group: 'Support' },
  { id: 'compliance',    name: 'Compliance',      icon: Shield,          path: '/compliance',   group: 'Governance' },
  { id: 'reports',       name: 'Reports',         icon: BarChart3,       path: '/reports',      group: 'Core' },
  { id: 'system',        name: 'System Mgmt',     icon: Cog,             path: '/system',       group: 'System' }
];


