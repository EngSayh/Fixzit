// Comprehensive RBAC System for Fixzit
// Based on KSA compliance requirements and industry benchmarks

export type Role =
  | 'SUPER_ADMIN' | 'CORPORATE_ADMIN' | 'ADMIN' | 'PROPERTY_MANAGER'
  | 'LEASING_CRM_MANAGER' | 'FINANCE_MANAGER' | 'HR_MANAGER'
  | 'TECHNICIAN' | 'TEAM_MEMBER' | 'TENANT' | 'VENDOR'
  | 'BROKER_AGENT' | 'FINANCE_CONTROLLER' | 'COMPLIANCE_AUDITOR'
  | 'GUEST';

export type Module =
  | 'DASHBOARD' | 'WORK_ORDERS' | 'PROPERTIES' | 'FINANCE' | 'HR'
  | 'ADMINISTRATION' | 'CRM' | 'MARKETPLACE' | 'SUPPORT'
  | 'COMPLIANCE' | 'REPORTS' | 'SYSTEM_MGMT';

export type Capability =
  | 'READ' | 'WRITE' | 'DELETE' | 'APPROVE' | 'ASSIGN' | 'MANAGE' | 'EXPORT' | 'TRANSACT';

export interface AccessRule {
  module: Module;
  capabilities: Capability[];
  scope: 'GLOBAL' | 'TENANT' | 'OWN' | 'PUBLIC';
  conditions?: string[]; // Additional conditions for access
}

// Comprehensive role definitions with KSA compliance
export const ROLE_DEFINITIONS: Record<Role, {
  name: string;
  description: string;
  responsibilities: string[];
  privacyLevel: 'FULL' | 'MASKED' | 'PUBLIC';
  requiresKYC: boolean;
  requiresFAL: boolean;
}> = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Fixzit platform owner with full system control',
    responsibilities: ['Cross-tenant control', 'Billing management', 'Security oversight', 'Audit management'],
    privacyLevel: 'FULL',
    requiresKYC: true,
    requiresFAL: false
  },
  CORPORATE_ADMIN: {
    name: 'Corporate Admin',
    description: 'Tenant administrator with full tenant scope control',
    responsibilities: ['User management', 'Module configuration', 'DoA management', 'Integration oversight'],
    privacyLevel: 'FULL',
    requiresKYC: true,
    requiresFAL: false
  },
  ADMIN: {
    name: 'Admin',
    description: 'System administrator with limited scope',
    responsibilities: ['User management', 'System configuration', 'Support oversight'],
    privacyLevel: 'FULL',
    requiresKYC: true,
    requiresFAL: false
  },
  PROPERTY_MANAGER: {
    name: 'Property Manager',
    description: 'Manages properties, units, leases, and inspections',
    responsibilities: ['Property oversight', 'Work order management', 'Tenant relations', 'Maintenance coordination'],
    privacyLevel: 'MASKED',
    requiresKYC: true,
    requiresFAL: false
  },
  LEASING_CRM_MANAGER: {
    name: 'Leasing & CRM Manager',
    description: 'Manages leads, accounts, and contracts',
    responsibilities: ['Lead management', 'Account relations', 'Contract oversight', 'CRM operations'],
    privacyLevel: 'MASKED',
    requiresKYC: true,
    requiresFAL: false
  },
  FINANCE_MANAGER: {
    name: 'Finance Manager',
    description: 'Manages financial operations and reporting',
    responsibilities: ['Invoice management', 'Payment processing', 'Budget oversight', 'Financial reporting'],
    privacyLevel: 'FULL',
    requiresKYC: true,
    requiresFAL: false
  },
  HR_MANAGER: {
    name: 'HR Manager',
    description: 'Manages human resources and employee data',
    responsibilities: ['Employee management', 'Payroll processing', 'Recruitment', 'Policy enforcement'],
    privacyLevel: 'FULL',
    requiresKYC: true,
    requiresFAL: false
  },
  TECHNICIAN: {
    name: 'Technician',
    description: 'Executes work orders and maintenance tasks',
    responsibilities: ['Work order execution', 'Maintenance tasks', 'Time tracking', 'Photo documentation'],
    privacyLevel: 'MASKED',
    requiresKYC: true,
    requiresFAL: false
  },
  TEAM_MEMBER: {
    name: 'Team Member',
    description: 'General employee with assigned tasks',
    responsibilities: ['Task execution', 'Self-service HR', 'Support requests', 'Reporting'],
    privacyLevel: 'MASKED',
    requiresKYC: true,
    requiresFAL: false
  },
  TENANT: {
    name: 'Tenant/Customer',
    description: 'Property tenant or customer',
    responsibilities: ['Property access', 'Work order requests', 'Payment management', 'Support requests'],
    privacyLevel: 'MASKED',
    requiresKYC: true,
    requiresFAL: false
  },
  VENDOR: {
    name: 'Vendor/Supplier',
    description: 'Marketplace vendor or supplier',
    responsibilities: ['Product management', 'Order fulfillment', 'Bid submission', 'Support requests'],
    privacyLevel: 'MASKED',
    requiresKYC: true,
    requiresFAL: false
  },
  BROKER_AGENT: {
    name: 'Broker/Agent',
    description: 'Real estate broker or agent (requires FAL)',
    responsibilities: ['Property listing', 'Client management', 'Transaction oversight', 'Compliance adherence'],
    privacyLevel: 'MASKED',
    requiresKYC: true,
    requiresFAL: true
  },
  FINANCE_CONTROLLER: {
    name: 'Finance Controller',
    description: 'Financial controller with approval authority',
    responsibilities: ['Financial oversight', 'Approval authority', 'Compliance monitoring', 'Audit support'],
    privacyLevel: 'FULL',
    requiresKYC: true,
    requiresFAL: false
  },
  COMPLIANCE_AUDITOR: {
    name: 'Compliance Auditor',
    description: 'Compliance and audit specialist',
    responsibilities: ['Compliance monitoring', 'Audit execution', 'Risk assessment', 'Regulatory reporting'],
    privacyLevel: 'FULL',
    requiresKYC: true,
    requiresFAL: false
  },
  GUEST: {
    name: 'Guest Visitor',
    description: 'Anonymous visitor with limited access',
    responsibilities: ['Browse marketplace', 'View public content', 'Access help center'],
    privacyLevel: 'PUBLIC',
    requiresKYC: false,
    requiresFAL: false
  }
};

// Module access matrix with comprehensive permissions
export const ROLE_ACCESS_MATRIX: Record<Role, AccessRule[]> = {
  SUPER_ADMIN: [
    { module: 'DASHBOARD', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'GLOBAL' },
    { module: 'WORK_ORDERS', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ASSIGN', 'MANAGE'], scope: 'GLOBAL' },
    { module: 'PROPERTIES', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE'], scope: 'GLOBAL' },
    { module: 'FINANCE', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'GLOBAL' },
    { module: 'HR', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'GLOBAL' },
    { module: 'ADMINISTRATION', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE'], scope: 'GLOBAL' },
    { module: 'CRM', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE'], scope: 'GLOBAL' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE', 'TRANSACT'], scope: 'GLOBAL' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE'], scope: 'GLOBAL' },
    { module: 'COMPLIANCE', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'GLOBAL' },
    { module: 'REPORTS', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE', 'EXPORT'], scope: 'GLOBAL' },
    { module: 'SYSTEM_MGMT', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE'], scope: 'GLOBAL' }
  ],
  CORPORATE_ADMIN: [
    { module: 'DASHBOARD', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ASSIGN', 'MANAGE'], scope: 'TENANT' },
    { module: 'PROPERTIES', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE'], scope: 'TENANT' },
    { module: 'FINANCE', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'HR', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'ADMINISTRATION', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE'], scope: 'TENANT' },
    { module: 'CRM', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE'], scope: 'TENANT' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE', 'TRANSACT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE'], scope: 'TENANT' },
    { module: 'COMPLIANCE', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'WRITE', 'DELETE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'SYSTEM_MGMT', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' }
  ],
  ADMIN: [
    { module: 'DASHBOARD', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ', 'WRITE', 'ASSIGN'], scope: 'TENANT' },
    { module: 'PROPERTIES', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'FINANCE', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'HR', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'ADMINISTRATION', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' },
    { module: 'CRM', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' },
    { module: 'COMPLIANCE', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'WRITE', 'EXPORT'], scope: 'TENANT' },
    { module: 'SYSTEM_MGMT', capabilities: ['READ'], scope: 'TENANT' }
  ],
  PROPERTY_MANAGER: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ', 'WRITE', 'ASSIGN'], scope: 'TENANT' },
    { module: 'PROPERTIES', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'TRANSACT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'EXPORT'], scope: 'TENANT' }
  ],
  LEASING_CRM_MANAGER: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'PROPERTIES', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'CRM', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'TRANSACT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'EXPORT'], scope: 'TENANT' }
  ],
  FINANCE_MANAGER: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'PROPERTIES', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'FINANCE', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'EXPORT'], scope: 'TENANT' }
  ],
  HR_MANAGER: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'HR', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'EXPORT'], scope: 'TENANT' }
  ],
  TECHNICIAN: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ', 'WRITE'], scope: 'OWN' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ'], scope: 'TENANT' }
  ],
  TEAM_MEMBER: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ', 'WRITE'], scope: 'OWN' },
    { module: 'CRM', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'MARKETPLACE', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ'], scope: 'TENANT' }
  ],
  TENANT: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ', 'WRITE'], scope: 'OWN' },
    { module: 'PROPERTIES', capabilities: ['READ'], scope: 'OWN' },
    { module: 'FINANCE', capabilities: ['READ', 'TRANSACT'], scope: 'OWN' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'TRANSACT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ'], scope: 'OWN' }
  ],
  VENDOR: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'WRITE', 'MANAGE', 'TRANSACT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ'], scope: 'TENANT' }
  ],
  BROKER_AGENT: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'PROPERTIES', capabilities: ['READ', 'WRITE', 'MANAGE'], scope: 'TENANT' },
    { module: 'MARKETPLACE', capabilities: ['READ', 'WRITE', 'MANAGE', 'TRANSACT'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'COMPLIANCE', capabilities: ['READ', 'WRITE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'EXPORT'], scope: 'TENANT' }
  ],
  FINANCE_CONTROLLER: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'FINANCE', capabilities: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'COMPLIANCE', capabilities: ['READ', 'WRITE', 'APPROVE'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'EXPORT'], scope: 'TENANT' }
  ],
  COMPLIANCE_AUDITOR: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'WORK_ORDERS', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'PROPERTIES', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'FINANCE', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'SUPPORT', capabilities: ['READ'], scope: 'TENANT' },
    { module: 'COMPLIANCE', capabilities: ['READ', 'WRITE', 'APPROVE', 'MANAGE', 'EXPORT'], scope: 'TENANT' },
    { module: 'REPORTS', capabilities: ['READ', 'EXPORT'], scope: 'TENANT' }
  ],
  GUEST: [
    { module: 'DASHBOARD', capabilities: ['READ'], scope: 'PUBLIC' },
    { module: 'MARKETPLACE', capabilities: ['READ'], scope: 'PUBLIC' },
    { module: 'SUPPORT', capabilities: ['READ'], scope: 'PUBLIC' }
  ]
};

// Helper functions
export function canAccess(role: Role, module: Module, capability: Capability): boolean {
  const rules = ROLE_ACCESS_MATRIX[role] || [];
  const rule = rules.find(r => r.module === module);
  return rule ? rule.capabilities.includes(capability) : false;
}

export function getRoleDefinition(role: Role) {
  return ROLE_DEFINITIONS[role];
}

export function getAllowedModules(role: Role): Module[] {
  const rules = ROLE_ACCESS_MATRIX[role] || [];
  return rules.map(rule => rule.module);
}

export function getModuleCapabilities(role: Role, module: Module): Capability[] {
  const rules = ROLE_ACCESS_MATRIX[role] || [];
  const rule = rules.find(r => r.module === module);
  return rule ? rule.capabilities : [];
}

export function requiresKYC(role: Role): boolean {
  return ROLE_DEFINITIONS[role]?.requiresKYC || false;
}

export function requiresFAL(role: Role): boolean {
  return ROLE_DEFINITIONS[role]?.requiresFAL || false;
}

export function getPrivacyLevel(role: Role): 'FULL' | 'MASKED' | 'PUBLIC' {
  return ROLE_DEFINITIONS[role]?.privacyLevel || 'PUBLIC';
}

// Guest browsing permissions
export const GUEST_BROWSING_PERMISSIONS = {
  canBrowseProperties: true,
  canViewPropertyDetails: true,
  canSearchProperties: true,
  canFilterProperties: true,
  canViewMap: true,
  canBrowseMaterials: true,
  canViewMaterialDetails: true,
  canSearchMaterials: true,
  canFilterMaterials: true,
  canAddToCart: false, // Requires login
  canContactSeller: false, // Requires login
  canSubmitOffer: false, // Requires login
  canSaveFavorites: false, // Requires login
  canViewContactInfo: false, // Requires login
  canAccessSupport: true,
  canViewHelp: true
};

// Privacy and fraud prevention settings
export const PRIVACY_SETTINGS = {
  maskContactInfo: true,
  watermarkImages: true,
  generalizeCoordinates: true,
  requireOTPForContact: true,
  rateLimitContactReveals: true,
  auditAllActions: true,
  requireVerificationForListings: true
};