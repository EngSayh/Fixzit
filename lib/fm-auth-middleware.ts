/**
 * FM RBAC Middleware
 * Enforces role-based access control for Facility Management endpoints
 */

import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { can, Role, SubmoduleKey, Action, Plan } from '@/domain/fm/fm.behavior';
import { Organization } from '@/server/models/Organization';
import { connectDb } from '@/lib/mongo';

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

  // ✅ Get actual subscription plan from organization and verify membership
  let plan = Plan.STARTER;
  let isOrgMember = false;
  
  try {
    await connectDb();
    // Always use ctx.orgId - don't allow callers to query other orgs
    const org = await Organization.findOne({ orgId: ctx.orgId });
    
    if (org) {
      // Map organization plan to FM Plan enum (with fallback chain)
      const subscriptionPlan = org.subscription?.plan;
      const orgPlan = subscriptionPlan || (org as { plan?: string }).plan || 'BASIC';
      const planMap: Record<string, Plan> = {
        'BASIC': Plan.STARTER,
        'STARTER': Plan.STARTER,
        'STANDARD': Plan.STANDARD,
        'PREMIUM': Plan.PRO,
        'PRO': Plan.PRO,
        'ENTERPRISE': Plan.ENTERPRISE,
      };
      plan = planMap[orgPlan.toUpperCase()] || Plan.STARTER;
      
      // Verify org membership: org exists for ctx.orgId and user is in member list
      isOrgMember = true; // Org found for ctx.orgId
      
      // Additional check: verify user is in org's member list (if available)
      if (org.members && Array.isArray(org.members)) {
        isOrgMember = org.members.some((m: { userId: string }) => m.userId === ctx.userId);
      }
      
      logger.debug('[FM Auth] Org lookup successful', { 
        orgId: ctx.orgId, 
        plan, 
        isOrgMember,
        userId: ctx.userId 
      });
      } else {
      logger.warn('[FM Auth] Organization not found', { orgId: ctx.orgId });
    }
  } catch (error) {
    logger.error('[FM Auth] Subscription lookup failed:', { error });
    // Fall back to STARTER plan and no org membership on error
  }

  // Check RBAC permission
  const allowed = can(submodule, action, {
    role: ctx.role,
    orgId: options?.orgId || ctx.orgId,
    propertyId: options?.propertyId,
    userId: ctx.userId,
    plan,
    isOrgMember
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
 * Note: This is synchronous for UI use. For API routes, use requireFMAuth which does async DB lookups.
 */
export function userCan(
  ctx: FMAuthContext | null,
  submodule: SubmoduleKey,
  action: Action,
  options?: {
    orgId?: string;
    propertyId?: string;
    plan?: Plan;
    isOrgMember?: boolean;
  }
): boolean {
  if (!ctx) return false;
  
  // Use restrictive defaults: STARTER plan and no org membership unless explicitly provided
  // Callers MUST provide plan and isOrgMember from DB for accurate permission checks
  return can(submodule, action, {
    role: ctx.role,
    orgId: options?.orgId || ctx.orgId,
    propertyId: options?.propertyId,
    userId: ctx.userId,
    plan: options?.plan ?? Plan.STARTER,
    isOrgMember: options?.isOrgMember ?? false
  });
}

/**
 * Extract property ownership context for ABAC checks
 * 
 * NOTE: FMProperty model not yet implemented. When created, it should have:
 * - ownerId: string (User ID of property owner)
 * - orgId: string (Organization ID managing the property)
 * - propertyId: string (Unique property identifier)
 * 
 * Example implementation when model exists:
 * ```typescript
 * import { FMProperty } from '@/server/models/FMProperty';
 * const property = await FMProperty.findOne({ propertyId });
 * if (property) {
 *   return { ownerId: property.ownerId, orgId: property.orgId };
 * }
 * ```
 */
export async function getPropertyOwnership(_propertyId: string): Promise<{
  ownerId: string;
  orgId: string;
} | null> {
  try {
    await connectDb();
    
    // Try to import FMProperty model (may not exist yet)
    const FMPropertyModule = await import('@/server/models/FMProperty').catch(() => null);
    
    if (FMPropertyModule && FMPropertyModule.FMProperty) {
      const property = await FMPropertyModule.FMProperty.findOne({ 
        propertyId: _propertyId 
      }).select('ownerId orgId').lean();
      
      if (property) {
        logger.debug('[FM Auth] Property ownership found', { 
          propertyId: _propertyId, 
          ownerId: property.ownerId, 
          orgId: property.orgId 
        });
        return { 
          ownerId: property.ownerId?.toString() || '', 
          orgId: property.orgId?.toString() || '' 
        };
      }
    } else {
      // Fallback: Try WorkOrder model which may have propertyId reference
      logger.debug('[FM Auth] FMProperty model not found, checking WorkOrders');
      const { FMWorkOrder } = await import('@/server/models/FMWorkOrder');
      const workOrder = await FMWorkOrder.findOne({ propertyId: _propertyId })
        .select('propertyOwnerId orgId')
        .lean();
      
      if (workOrder && workOrder.propertyOwnerId) {
        return {
          ownerId: workOrder.propertyOwnerId.toString(),
          orgId: workOrder.orgId?.toString() || ''
        };
      }
    }
    
    logger.warn('[FM Auth] Property ownership not found', { propertyId: _propertyId });
    return null;
  } catch (error) {
    logger.error('[FM Auth] Property ownership query failed:', { error, propertyId: _propertyId });
    return null;
  }
}
