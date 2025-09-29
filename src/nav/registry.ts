// src/nav/registry.ts
import React from 'react';
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings,
  UserCheck, ShoppingBag, Headphones, ShieldCheck, BarChart3, Cog
} from 'lucide-react';

export type Role =
  | 'super-admin' | 'admin' | 'corp-owner' | 'team' | 'technician'
  | 'property-manager' | 'tenant' | 'vendor' | 'guest';

export type QuickAction = { id: string; label: string; path: string; roles?: Role[] };

export type ModuleDef = {
  id: string;
  label: string;
  route: string;
  icon: React.ComponentType<any>;
  roles: Role[];               // who can see the module
  children?: { label: string; route: string }[];
  quickActions: QuickAction[];
};

export const modules: ModuleDef[] = [
  {
    id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard,
    roles: ['super-admin','admin','corp-owner','team','technician','property-manager','tenant','vendor','guest'],
    quickActions: [
      { id: 'qa-new-wo', label: 'New Work Order', path: '/work-orders/new' },
      { id: 'qa-new-invoice', label: 'New Invoice', path: '/finance/invoices/new' },
      { id: 'qa-add-property', label: 'Add Property', path: '/properties/new' },
    ],
  },
  {
    id: 'work-orders', label: 'Work Orders', route: '/work-orders', icon: ClipboardList,
    roles: ['super-admin','admin','corp-owner','team','technician','property-manager','tenant','vendor'],
    children: [
      { label: 'Create', route: '/work-orders/new' },
      { label: 'Track & Assign', route: '/work-orders/board' },
      { label: 'Preventive', route: '/work-orders/pm' },
      { label: 'Service History', route: '/work-orders/history' },
    ],
    quickActions: [
      { id: 'qa-wo-new', label: 'New Work Order', path: '/work-orders/new' },
      { id: 'qa-wo-assign', label: 'Assign', path: '/work-orders/board' },
      { id: 'qa-wo-approval', label: 'Request Approval', path: '/work-orders/approvals' },
    ],
  },
  {
    id: 'properties', label: 'Properties', route: '/properties', icon: Building2,
    roles: ['super-admin','admin','corp-owner','property-manager','tenant'],
    children: [
      { label: 'Property List', route: '/properties' },
      { label: 'Units & Tenants', route: '/properties/units' },
      { label: 'Lease Management', route: '/properties/leases' },
      { label: 'Inspections', route: '/properties/inspections' },
      { label: 'Documents', route: '/properties/documents' },
    ],
    quickActions: [
      { id: 'qa-prop-new', label: 'Add Property', path: '/properties/new' },
      { id: 'qa-unit-new', label: 'Add Unit', path: '/properties/units/new' },
      { id: 'qa-inspection', label: 'Create Inspection', path: '/properties/inspections/new' },
    ],
  },
  {
    id: 'finance', label: 'Finance', route: '/finance', icon: DollarSign,
    roles: ['super-admin','admin','corp-owner'],
    children: [
      { label: 'Invoices', route: '/finance/invoices' },
      { label: 'Payments', route: '/finance/payments' },
      { label: 'Expenses', route: '/finance/expenses' },
      { label: 'Budgets', route: '/finance/budgets' },
      { label: 'Reports', route: '/finance/reports' },
    ],
    quickActions: [
      { id: 'qa-inv-new', label: 'New Invoice', path: '/finance/invoices/new' },
      { id: 'qa-pay-new', label: 'Record Payment', path: '/finance/payments/new' },
      { id: 'qa-exp-new', label: 'New Expense', path: '/finance/expenses/new' },
      { id: 'qa-bud-new', label: 'New Budget', path: '/finance/budgets/new' },
    ],
  },
  {
    id: 'hr', label: 'Human Resources', route: '/hr', icon: Users,
    roles: ['super-admin','admin','corp-owner'],
    children: [
      { label: 'Directory', route: '/hr/directory' },
      { label: 'Attendance & Leave', route: '/hr/leave' },
      { label: 'Payroll', route: '/hr/payroll' },
      { label: 'Recruitment', route: '/hr/recruitment' },
    ],
    quickActions: [
      { id: 'qa-hr-emp', label: 'Add Employee', path: '/hr/directory/new' },
      { id: 'qa-hr-leave', label: 'Approve Leave', path: '/hr/leave/approvals' },
      { id: 'qa-hr-payroll', label: 'Run Payroll', path: '/hr/payroll/run' },
    ],
  },
  {
    id: 'administration', label: 'Administration', route: '/administration', icon: Settings,
    roles: ['super-admin','admin','corp-owner'],
    quickActions: [
      { id: 'qa-admin-policy', label: 'Add Policy', path: '/administration/policies/new' },
      { id: 'qa-admin-asset', label: 'Add Asset', path: '/administration/assets/new' },
    ],
  },
  {
    id: 'crm', label: 'CRM', route: '/crm', icon: UserCheck,
    roles: ['super-admin','admin','corp-owner','team'],
    quickActions: [
      { id: 'qa-crm-lead', label: 'Add Lead', path: '/crm/leads/new' },
      { id: 'qa-crm-account', label: 'Add Account', path: '/crm/accounts/new' },
    ],
  },
  {
    id: 'marketplace', label: 'Marketplace', route: '/marketplace', icon: ShoppingBag,
    roles: ['super-admin','admin','corp-owner','tenant','vendor'],
    quickActions: [
      { id: 'qa-mkt-vendor', label: 'Add Vendor', path: '/marketplace/vendors/new' },
      { id: 'qa-mkt-listing', label: 'New Listing', path: '/marketplace/listings/new' },
      { id: 'qa-mkt-po', label: 'Raise PO/RFQ', path: '/marketplace/orders/new' },
    ],
  },
  {
    id: 'support', label: 'Support & Helpdesk', route: '/support', icon: Headphones,
    roles: ['super-admin','admin','corp-owner','team','technician','property-manager','tenant','vendor'],
    quickActions: [
      { id: 'qa-sup-ticket', label: 'New Ticket', path: '/support/tickets/new' },
      { id: 'qa-sup-escalate', label: 'Escalate', path: '/support/escalations/new' },
    ],
  },
  {
    id: 'compliance', label: 'Compliance & Legal', route: '/compliance', icon: ShieldCheck,
    roles: ['super-admin','admin','corp-owner'],
    quickActions: [
      { id: 'qa-legal-contract', label: 'Upload Contract', path: '/compliance/contracts/new' },
      { id: 'qa-legal-audit', label: 'Start Audit', path: '/compliance/audits/new' },
    ],
  },
  {
    id: 'reports', label: 'Reports & Analytics', route: '/reports', icon: BarChart3,
    roles: ['super-admin','admin','corp-owner','team','technician','property-manager','tenant','vendor'],
    quickActions: [
      { id: 'qa-rpt-gen', label: 'Generate Report', path: '/reports/new' },
      { id: 'qa-rpt-sched', label: 'Schedule', path: '/reports/schedules/new' },
    ],
  },
  {
    id: 'system', label: 'System Management', route: '/system', icon: Cog,
    roles: ['super-admin','admin','corp-owner'],
    quickActions: [
      { id: 'qa-sys-invite', label: 'Invite User', path: '/system/users/invite' },
      { id: 'qa-sys-role', label: 'Create Role', path: '/system/roles/new' },
      { id: 'qa-sys-int', label: 'Configure Integration', path: '/system/integrations' },
    ],
  },
];