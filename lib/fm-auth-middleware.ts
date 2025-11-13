/**
 * FM RBAC Middleware
 * Enforces role-based access control for Facility Management endpoints
 */

import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { can, Role, SubmoduleKey, Action, Plan } from '@/domain/fm/fm.behavior';

export interface FMAuthContext {
  userId: string;
  role: Role;
  orgId: string;
  propertyIds?: string[];
  user: {
    id: string;
    email: string;
    role?: string;
    orgId?: string;
    propertyIds?: string[];
  };
}

/**
 * Extract FM auth context from JWT token
 */
export async function getFMAuthContext(_req: NextRequest): Promise<FMAuthContext | null> {
  try {
    // Get token from cookie or header
    const cookieToken = _req.cookies.get('fixzit_auth')?.value;
    const headerToken = _req.headers.get('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return null;
    }

    const user = await getUserFromToken(token);
    
    if (!user) {
      return null;
    }

    // Map user role to FM Role enum
    const roleMapping: Record<string, Role> = {
      'SUPER_ADMIN': Role.SUPER_ADMIN,
      'CORPORATE_ADMIN': Role.CORPORATE_ADMIN,
      'MANAGEMENT': Role.MANAGEMENT,
      'FINANCE': Role.FINANCE,
      'HR': Role.HR,
      'EMPLOYEE': Role.EMPLOYEE,
      'PROPERTY_OWNER': Role.PROPERTY_OWNER,
      'OWNER_DEPUTY': Role.OWNER_DEPUTY,
      'TECHNICIAN': Role.TECHNICIAN,
      'TENANT': Role.TENANT,
      'VENDOR': Role.VENDOR,
      'GUEST': Role.GUEST,
    };

    const userRole = user.role || 'GUEST';
    const role = roleMapping[userRole] || Role.GUEST;

    return {
      userId: user.id || user.email || '',
      role,
      orgId: (user as { orgId?: string }).orgId || '',
      propertyIds: (user as { propertyIds?: string[] }).propertyIds || [],
      user: {
        id: user.id || '',
        email: user.email || '',
        role: user.role,
        orgId: (user as { orgId?: string }).orgId,
        propertyIds: (user as { propertyIds?: string[] }).propertyIds
      }
    };
  } catch (error) {
    logger.error('[FM Auth] Context extraction failed:', { error });
    return null;
  }
}

/**
 * Middleware to enforce RBAC on FM endpoints
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const authCheck = await requireFMAuth(req, SubmoduleKey.WO_CREATE, 'view');
 *     if (authCheck.error) return authCheck.error;
 *     const { ctx } = authCheck;
 *     // ... proceed with authenticated request
 *   }
 */
export async function requireFMAuth(
  req: NextRequest,
  submodule: SubmoduleKey,
  action: Action,
  options?: {
    orgId?: string;
    propertyId?: string;
    ownerId?: string;
  }
): Promise<
  | { ctx: FMAuthContext; error: null }
  | { ctx: null; error: NextResponse }
> {
  // Extract auth context
  const ctx = await getFMAuthContext(req);

  if (!ctx) {
    return {
      ctx: null,
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  // Check RBAC permission
  const allowed = can(submodule, action, {
    role: ctx.role,
    orgId: options?.orgId || ctx.orgId,
    propertyId: options?.propertyId,
    userId: ctx.userId,
    plan: Plan.PRO, // TODO: Get from user/org subscription
    isOrgMember: true // TODO: Verify org membership
  });

  if (!allowed) {
    return {
      ctx: null,
      error: NextResponse.json(
        {
          error: 'Forbidden',
          message: `Role ${ctx.role} lacks permission for ${action} on ${submodule}`,
          required: { submodule, action, role: ctx.role }
        },
        { status: 403 }
      )
    };
  }

  return { ctx, error: null };
}

/**
 * Check if user has permission (for UI conditional rendering)
 */
export function userCan(
  ctx: FMAuthContext | null,
  submodule: SubmoduleKey,
  action: Action,
  options?: {
    orgId?: string;
    propertyId?: string;
  }
): boolean {
  if (!ctx) return false;
  
  return can(submodule, action, {
    role: ctx.role,
    orgId: options?.orgId || ctx.orgId,
    propertyId: options?.propertyId,
    userId: ctx.userId,
    plan: Plan.PRO, // TODO: Get from user/org subscription
    isOrgMember: true // TODO: Verify org membership
  });
}

/**
 * Extract property ownership context for ABAC checks
 */
 
export async function getPropertyOwnership(_propertyId: string): Promise<{
  ownerId: string;
  orgId: string;
} | null> {
  try {
    // TODO: Query FMProperty model for ownership
    // For now, return placeholder
    return {
      ownerId: '',
      orgId: ''
    };
  // eslint-disable-next-line no-unreachable
  } catch (error) {
    logger.error('[FM Auth] Property ownership query failed:', { error });
    return null;
  }
}
