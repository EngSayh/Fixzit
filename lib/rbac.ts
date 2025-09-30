export type Role =
  | 'SUPER_ADMIN' | 'ADMIN' | 'CORPORATE_ADMIN' | 'FM_MANAGER'
  | 'FINANCE' | 'HR' | 'PROCUREMENT' | 'PROPERTY_MANAGER'
  | 'EMPLOYEE' | 'TECHNICIAN' | 'VENDOR' | 'CUSTOMER'
  | 'OWNER' | 'AUDITOR';

type ModuleId =
  | 'dashboard' | 'work-orders' | 'properties' | 'finance' | 'hr'
  | 'crm' | 'marketplace' | 'support' | 'compliance' | 'reports' | 'system';

export const ACCESS: Record<Role, ModuleId[]> = {
  SUPER_ADMIN:      ['dashboard','work-orders','properties','finance','hr','crm','marketplace','support','compliance','reports','system'],
  ADMIN:           ['dashboard','work-orders','properties','finance','hr','crm','marketplace','support','compliance','reports','system'],
  CORPORATE_ADMIN:  ['dashboard','work-orders','properties','finance','hr','crm','marketplace','support','compliance','reports','system'],
  FM_MANAGER:      ['dashboard','work-orders','properties','finance','reports'],
  FINANCE:         ['dashboard','finance','reports'],
  HR:              ['dashboard','hr','reports'],
  PROCUREMENT:     ['dashboard','marketplace','support','reports'],
  PROPERTY_MANAGER: ['dashboard','properties','work-orders','support','reports'],
  EMPLOYEE:        ['dashboard','work-orders','support','reports'],
  TECHNICIAN:      ['dashboard','work-orders','support','reports'],
  VENDOR:          ['dashboard','marketplace','support','reports'],
  CUSTOMER:        ['dashboard','properties','marketplace','support','reports'],
  OWNER:           ['dashboard','properties','work-orders','finance','reports'],
  AUDITOR:         ['dashboard','compliance','reports']
};