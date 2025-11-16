import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * ATS RBAC Roles (6 roles)
 */
export type ATSRole = 
  | 'Super Admin'        // Global: all tenants + impersonation
  | 'Corporate Admin'    // Org-wide: full ATS access
  | 'HR Manager'         // Dept: create jobs, manage applications, interviews
  | 'Recruiter'          // Dept: view jobs, manage applications, schedule interviews
  | 'Hiring Manager'     // Dept: view jobs/apps, add feedback, approve offers
  | 'Candidate';         // Public: apply to jobs, view own applications

/**
 * ATS Permissions Matrix
 */
export type ATSPermission = 
  // Jobs
  | 'jobs:create'
  | 'jobs:read'
  | 'jobs:update'
  | 'jobs:delete'
  | 'jobs:publish'
  
  // Applications
  | 'applications:create'  // Candidates can apply
  | 'applications:read'
  | 'applications:update'
  | 'applications:delete'
  | 'applications:score'
  | 'applications:stage-transition'
  
  // Interviews
  | 'interviews:create'
  | 'interviews:read'
  | 'interviews:update'
  | 'interviews:delete'
  | 'interviews:feedback'
  
  // Candidates
  | 'candidates:read'
  | 'candidates:update'
  | 'candidates:delete'
  | 'candidates:export'
  
  // Settings
  | 'settings:read'
  | 'settings:update'
  
  // Impersonation
  | 'tenant:impersonate';

/**
 * Role → Permissions Mapping
 */
const ROLE_PERMISSIONS: Record<ATSRole, ATSPermission[]> = {
  'Super Admin': [
    'jobs:create', 'jobs:read', 'jobs:update', 'jobs:delete', 'jobs:publish',
    'applications:create', 'applications:read', 'applications:update', 'applications:delete', 'applications:score', 'applications:stage-transition',
    'interviews:create', 'interviews:read', 'interviews:update', 'interviews:delete', 'interviews:feedback',
    'candidates:read', 'candidates:update', 'candidates:delete', 'candidates:export',
    'settings:read', 'settings:update',
    'tenant:impersonate'
  ],
  'Corporate Admin': [
    'jobs:create', 'jobs:read', 'jobs:update', 'jobs:delete', 'jobs:publish',
    'applications:read', 'applications:update', 'applications:delete', 'applications:score', 'applications:stage-transition',
    'interviews:create', 'interviews:read', 'interviews:update', 'interviews:delete', 'interviews:feedback',
    'candidates:read', 'candidates:update', 'candidates:delete', 'candidates:export',
    'settings:read', 'settings:update'
  ],
  'HR Manager': [
    'jobs:create', 'jobs:read', 'jobs:update', 'jobs:publish',
    'applications:read', 'applications:update', 'applications:score', 'applications:stage-transition',
    'interviews:create', 'interviews:read', 'interviews:update', 'interviews:feedback',
    'candidates:read', 'candidates:update', 'candidates:export',
    'settings:read'
  ],
  'Recruiter': [
    'jobs:read',
    'applications:read', 'applications:update', 'applications:score', 'applications:stage-transition',
    'interviews:create', 'interviews:read', 'interviews:update',
    'candidates:read', 'candidates:update'
  ],
  'Hiring Manager': [
    'jobs:read',
    'applications:read', 'applications:update',
    'interviews:read', 'interviews:feedback',
    'candidates:read'
  ],
  'Candidate': [
    'applications:create',  // Apply to jobs
    'applications:read',    // View own applications only
    'jobs:read'             // View public job postings
  ]
};

/**
 * Check if role has permission
 */
export function hasPermission(role: ATSRole, permission: ATSPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(role: ATSRole, permissions: ATSPermission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(role: ATSRole, permissions: ATSPermission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * ATS RBAC Middleware
 * 
 * Usage in API routes:
 * ```typescript
 * const authResult = await atsRBAC(req, ['applications:read']);
 * if (!authResult.authorized) {
 *   return authResult.response;
 * }
 * const { userId, orgId, role } = authResult;
 * ```
 */
export async function atsRBAC(
  req: NextRequest,
  requiredPermissions: ATSPermission[]
): Promise<
  | { authorized: true; userId: string; orgId: string; role: ATSRole; isSuperAdmin: boolean }
  | { authorized: false; response: NextResponse }
> {
  // Get session
  const session = await auth();
  
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  const userId = session.user.id;
  const role = session.user.role as ATSRole;
  const isSuperAdmin = role === 'Super Admin';

  // Get orgId from session (with impersonation support for Super Admin)
  let orgId = session.user.orgId;
  
  // Super Admin can impersonate tenants via X-Tenant-ID header
  if (isSuperAdmin && hasPermission(role, 'tenant:impersonate')) {
    const impersonateOrgId = req.headers.get('X-Tenant-ID');
    if (impersonateOrgId) {
      orgId = impersonateOrgId;
    }
  }

  // Fallback to platform default
  if (!orgId) {
    orgId = process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
  }

  // Check if user has any of the required permissions
  const authorized = hasAnyPermission(role, requiredPermissions);

  if (!authorized) {
    return {
      authorized: false,
      response: NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden: Insufficient permissions',
          required: requiredPermissions,
          userRole: role
        },
        { status: 403 }
      )
    };
  }

  return { 
    authorized: true, 
    userId, 
    orgId, 
    role,
    isSuperAdmin
  };
}

/**
 * Resource ownership check
 * 
 * Usage:
 * ```typescript
 * const application = await Application.findById(id);
 * if (!canAccessResource(orgId, application.orgId, isSuperAdmin)) {
 *   return NextResponse.json({ error: 'Not found' }, { status: 404 });
 * }
 * ```
 */
export function canAccessResource(
  userOrgId: string,
  resourceOrgId: string,
  isSuperAdmin: boolean
): boolean {
  // Super Admin can access all resources
  if (isSuperAdmin) return true;
  
  // Regular users can only access resources in their org
  return userOrgId === resourceOrgId;
}

/**
 * Stage transition guard (state machine)
 * 
 * Prevents illegal stage transitions like "applied" → "hired"
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<string, string[]> = {
  'applied': ['screening', 'rejected', 'withdrawn'],
  'screening': ['interview', 'rejected', 'withdrawn'],
  'interview': ['offer', 'rejected', 'withdrawn'],
  'offer': ['hired', 'rejected', 'withdrawn'],
  'hired': ['archived'],
  'rejected': ['archived'],
  'withdrawn': ['archived'],
  'archived': []
};

export function isValidStageTransition(
  currentStage: string,
  newStage: string
): boolean {
  const allowedNext = ALLOWED_STAGE_TRANSITIONS[currentStage] || [];
  return allowedNext.includes(newStage);
}
