import { UserRole } from '@/types/user';

/**
 * ATS RBAC Roles (6 roles)
 */
export type ATSRole =
  | 'Super Admin'
  | 'Corporate Admin'
  | 'HR Manager'
  | 'Recruiter'
  | 'Hiring Manager'
  | 'Candidate';

/**
 * ATS Permissions Matrix
 */
export type ATSPermission =
  | 'jobs:create'
  | 'jobs:read'
  | 'jobs:update'
  | 'jobs:delete'
  | 'jobs:publish'
  | 'applications:create'
  | 'applications:read'
  | 'applications:update'
  | 'applications:delete'
  | 'applications:score'
  | 'applications:stage-transition'
  | 'interviews:create'
  | 'interviews:read'
  | 'interviews:update'
  | 'interviews:delete'
  | 'interviews:feedback'
  | 'candidates:read'
  | 'candidates:update'
  | 'candidates:delete'
  | 'candidates:export'
  | 'settings:read'
  | 'settings:update'
  | 'tenant:impersonate';

export const ROLE_PERMISSIONS: Record<ATSRole, ATSPermission[]> = {
  'Super Admin': [
    'jobs:create',
    'jobs:read',
    'jobs:update',
    'jobs:delete',
    'jobs:publish',
    'applications:create',
    'applications:read',
    'applications:update',
    'applications:delete',
    'applications:score',
    'applications:stage-transition',
    'interviews:create',
    'interviews:read',
    'interviews:update',
    'interviews:delete',
    'interviews:feedback',
    'candidates:read',
    'candidates:update',
    'candidates:delete',
    'candidates:export',
    'settings:read',
    'settings:update',
    'tenant:impersonate',
  ],
  'Corporate Admin': [
    'jobs:create',
    'jobs:read',
    'jobs:update',
    'jobs:delete',
    'jobs:publish',
    'applications:read',
    'applications:update',
    'applications:delete',
    'applications:score',
    'applications:stage-transition',
    'interviews:create',
    'interviews:read',
    'interviews:update',
    'interviews:delete',
    'interviews:feedback',
    'candidates:read',
    'candidates:update',
    'candidates:delete',
    'candidates:export',
    'settings:read',
    'settings:update',
  ],
  'HR Manager': [
    'jobs:create',
    'jobs:read',
    'jobs:update',
    'jobs:publish',
    'applications:read',
    'applications:update',
    'applications:score',
    'applications:stage-transition',
    'interviews:create',
    'interviews:read',
    'interviews:update',
    'interviews:feedback',
    'candidates:read',
    'candidates:update',
    'candidates:export',
    'settings:read',
  ],
  Recruiter: [
    'jobs:read',
    'applications:read',
    'applications:update',
    'applications:score',
    'applications:stage-transition',
    'interviews:create',
    'interviews:read',
    'interviews:update',
    'candidates:read',
    'candidates:update',
  ],
  'Hiring Manager': [
    'jobs:read',
    'applications:read',
    'applications:update',
    'interviews:read',
    'interviews:feedback',
    'candidates:read',
  ],
  Candidate: ['applications:create', 'applications:read', 'jobs:read'],
};

export function mapUserRoleToATSRole(userRole: string): ATSRole {
  const roleMap: Record<string, ATSRole> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.CORPORATE_ADMIN]: 'Corporate Admin',
    [UserRole.HR]: 'HR Manager',
    [UserRole.ADMIN]: 'HR Manager',
    [UserRole.FM_MANAGER]: 'Hiring Manager',
    [UserRole.PROPERTY_MANAGER]: 'Hiring Manager',
  };

  return roleMap[userRole] || 'Candidate';
}

export function hasPermission(role: ATSRole, permission: ATSPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: ATSRole, permissions: ATSPermission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: ATSRole, permissions: ATSPermission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
