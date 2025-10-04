export type Role =
  | 'super_admin' | 'corporate_admin' | 'property_manager' | 'operations_dispatcher'
  | 'supervisor' | 'technician_internal' | 'vendor_admin' | 'vendor_technician'
  | 'tenant_resident' | 'owner_landlord' | 'finance_manager' | 'hr_manager'
  | 'helpdesk_agent' | 'auditor_compliance';

type ModuleId =
  | 'dashboard' | 'work-orders' | 'properties' | 'finance' | 'hr'
  | 'crm' | 'marketplace' | 'support' | 'compliance' | 'reports' | 'system';

export const ACCESS: Record<Role, ModuleId[]> = {
  super_admin:           ['dashboard','work-orders','properties','finance','hr','crm','marketplace','support','compliance','reports','system'],
  corporate_admin:       ['dashboard','work-orders','properties','finance','hr','crm','marketplace','support','compliance','reports','system'],
  property_manager:      ['dashboard','properties','work-orders','support','reports'],
  operations_dispatcher: ['dashboard','work-orders','properties','finance','reports'],
  supervisor:            ['dashboard','work-orders','properties','support','reports'],
  technician_internal:   ['dashboard','work-orders','support'],
  vendor_admin:          ['dashboard','marketplace','support','reports'],
  vendor_technician:     ['dashboard','work-orders','support'],
  tenant_resident:       ['dashboard','properties','support'],
  owner_landlord:        ['dashboard','properties','work-orders','finance','reports'],
  finance_manager:       ['dashboard','finance','reports'],
  hr_manager:            ['dashboard','hr','reports'],
  helpdesk_agent:        ['dashboard','support','crm','reports'],
  auditor_compliance:    ['dashboard','compliance','reports']
};
