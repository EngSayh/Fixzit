export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  CORPORATE_ADMIN: 'Corporate Admin',
  MANAGEMENT: 'Management',
  FINANCE: 'Finance',
  HR: 'HR',
  EMPLOYEE: 'Corporate Employee',
  PROPERTY_OWNER: 'Property Owner',
  TECHNICIAN: 'Technician',
  TENANT: 'Tenant / End-User',
  VENDOR: 'Vendor/Supplier',
  GUEST: 'Guest'
} as const;

export const MODULES = [
  'dashboard','work-orders','properties','finance','hr','administration',
  'crm','marketplace','support','compliance','reports','system'
] as const;

const ALL = new Set<string>(MODULES as unknown as string[]);

export const ROLE_MODULES: Record<string, Set<string>> = {
  [ROLES.SUPER_ADMIN]: ALL,
  [ROLES.CORPORATE_ADMIN]: ALL,
  [ROLES.MANAGEMENT]: new Set(['dashboard','work-orders','properties','finance','reports']),
  [ROLES.FINANCE]:     new Set(['dashboard','finance','reports']),
  [ROLES.HR]:          new Set(['dashboard','hr','reports']),
  [ROLES.EMPLOYEE]:    new Set(['dashboard','work-orders','crm','support','reports']),
  [ROLES.PROPERTY_OWNER]: new Set(['dashboard','properties','work-orders','finance','reports','support']),
  [ROLES.TECHNICIAN]:  new Set(['dashboard','work-orders','support','reports']),
  [ROLES.TENANT]:      new Set(['dashboard','work-orders','properties','marketplace','support','reports']),
  [ROLES.VENDOR]:      new Set(['dashboard','marketplace','work-orders','support','reports']),
  [ROLES.GUEST]:       new Set(['dashboard'])
};

export function filterModulesByRole(role: string, available: string[] = MODULES as unknown as string[]) {
  const allow = ROLE_MODULES[role] ?? new Set<string>();
  return available.filter(m => allow.has(m));
}


