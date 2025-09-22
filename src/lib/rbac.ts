// RBAC: roles, module keys, and permission helpers
export type Role =
  | 'SUPER_ADMIN'
  | 'CORP_ADMIN'
  | 'MANAGEMENT'
  | 'FINANCE'
  | 'HR'
  | 'CORPORATE_EMPLOYEE'
  | 'PROPERTY_OWNER'
  | 'TECHNICIAN'
  | 'TENANT'
  | 'VENDOR'
  | 'BROKER_AGENT'
  | 'FINANCE_CONTROLLER'
  | 'COMPLIANCE_AUDITOR'
  | 'GUEST';

export type ModuleKey =
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
  | 'system'
  | 'preventive'
  | 'leases'
  | 'inspections'
  | 'documents'
  | 'budgets';

// Authoritative baseline modules from Governance V5
export const ALL_MODULES: ModuleKey[] = [
  'dashboard','work_orders','properties','finance','hr','administration','crm',
  'marketplace','support','compliance','reports','system','preventive','leases',
  'inspections','documents','budgets'
];

// Updated permission map with new roles and guest marketplace access
export const DEFAULT_PERMISSIONS: Record<Role, ModuleKey[]> = {
  SUPER_ADMIN: ALL_MODULES,
  CORP_ADMIN: [
    'dashboard','work_orders','properties','finance','hr','administration','crm',
    'marketplace','support','compliance','reports','preventive','leases','inspections',
    'documents','budgets' // tenant-scoped; no global 'system'
  ],
  MANAGEMENT: ['dashboard','work_orders','properties','reports','support'],
  FINANCE: ['dashboard','finance','reports','support'],
  HR: ['dashboard','hr','reports','support'],
  CORPORATE_EMPLOYEE: ['dashboard','work_orders','crm','support','reports'],
  PROPERTY_OWNER: ['dashboard','properties','work_orders','reports','support'],
  TECHNICIAN: ['dashboard','work_orders','reports','support'],
  TENANT: ['dashboard','work_orders','properties','marketplace','reports','support'],
  VENDOR: ['dashboard','work_orders','marketplace','reports','support'],
  BROKER_AGENT: ['dashboard','properties','marketplace','support','compliance','reports'], // Real estate focus
  FINANCE_CONTROLLER: ['dashboard','finance','reports','compliance'], // Financial oversight
  COMPLIANCE_AUDITOR: ['dashboard','properties','finance','support','compliance','reports'], // Audit focus
  GUEST: ['dashboard', 'marketplace'] // Public access to marketplace for browsing
};

export type OrgOverrides = Partial<Record<ModuleKey, boolean>>; // Corporate Admin toggles

export function allowedModules(role: Role, overrides?: OrgOverrides): Set<ModuleKey> {
  const base = new Set(DEFAULT_PERMISSIONS[role] ?? []);
  if (role === 'SUPER_ADMIN') return new Set(ALL_MODULES);
  if (!overrides) return base;
  // Apply tenant/org overrides: remove disabled, add enabled within lawful scope
  Object.entries(overrides).forEach(([key, on]) => {
    const k = key as ModuleKey;
    if (on) base.add(k); else base.delete(k);
  });
  return base;
}

// Helper function to check if role can access a specific module
export function canAccessModule(role: Role, module: ModuleKey): boolean {
  return DEFAULT_PERMISSIONS[role]?.includes(module) ?? false;
}

// Helper function to get user-friendly role name
export function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    SUPER_ADMIN: 'Super Admin',
    CORP_ADMIN: 'Corporate Admin',
    MANAGEMENT: 'Management',
    FINANCE: 'Finance',
    HR: 'Human Resources',
    CORPORATE_EMPLOYEE: 'Employee',
    PROPERTY_OWNER: 'Property Owner',
    TECHNICIAN: 'Technician',
    TENANT: 'Tenant',
    VENDOR: 'Vendor',
    BROKER_AGENT: 'Broker/Agent',
    FINANCE_CONTROLLER: 'Finance Controller',
    COMPLIANCE_AUDITOR: 'Compliance Auditor',
    GUEST: 'Guest'
  };
  return roleNames[role] || 'Unknown';
}

// Check if user can perform specific actions on a module
export function canPerformAction(role: Role, module: ModuleKey, action: 'read' | 'write' | 'manage'): boolean {
  const allowedModules = DEFAULT_PERMISSIONS[role] || [];
  if (!allowedModules.includes(module)) return false;

  // Define action permissions per module (simplified)
  const actionPermissions: Record<ModuleKey, ('read' | 'write' | 'manage')[]> = {
    dashboard: ['read', 'manage'],
    work_orders: ['read', 'write', 'manage'],
    properties: ['read', 'write', 'manage'],
    finance: ['read', 'write', 'manage'],
    hr: ['read', 'write', 'manage'],
    administration: ['read', 'manage'],
    crm: ['read', 'write', 'manage'],
    marketplace: ['read', 'write', 'manage'],
    support: ['read', 'write', 'manage'],
    compliance: ['read', 'write', 'manage'],
    reports: ['read', 'manage'],
    system: ['manage'],
    preventive: ['read', 'write', 'manage'],
    leases: ['read', 'write', 'manage'],
    inspections: ['read', 'write', 'manage'],
    documents: ['read', 'write', 'manage'],
    budgets: ['read', 'write', 'manage']
  };

  return actionPermissions[module]?.includes(action) ?? false;
}