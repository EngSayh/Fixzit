import { NextRequest, NextResponse } from "next/server";
import { can } from "../rbac/workOrdersPolicy";
import type { Role as WorkOrderRole } from "../rbac/workOrdersPolicy";
import { auth } from "@/auth";
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { ALL_ROLES, type UserRoleType } from '@/types/user';

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthenticated') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export type SessionUser = {
  id: string;
  role: UserRoleType;
  orgId: string;
  tenantId: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
  realOrgId?: string;
  impersonatedOrgId?: string | null;
};

const WORK_ORDER_ROLES: WorkOrderRole[] = [
  "SUPER_ADMIN",
  "CORPORATE_ADMIN",
  "FM_MANAGER",
  "DISPATCHER",
  "TECHNICIAN",
  "VENDOR",
  "TENANT",
  "OWNER",
  "FINANCE",
  "SUPPORT",
  "AUDITOR",
];

const normalizeWorkOrderRole = (role?: UserRoleType): WorkOrderRole | null => {
  if (!role) return null;
  const upper = role.toUpperCase() as WorkOrderRole;
  return WORK_ORDER_ROLES.includes(upper) ? upper : null;
};

/**
 * Load RBAC data (roles and permissions) from database for a user
 * This runs in Node.js runtime (API routes) where Mongoose is available
 */
async function loadRBACData(userId: string, orgId: string): Promise<{
  isSuperAdmin: boolean;
  permissions: string[];
  roles: string[];
}> {
  try {
    // Dynamic imports to avoid issues in Edge Runtime
    const { User } = await import('@/server/models/User');
    const RoleModel = (await import('@/models/Role')).default;
    const PermissionModel = (await import('@/models/Permission')).default;
    const { default: mongoose } = await import('mongoose');
    
    // Query user with populated roles
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      orgId: orgId,
    })
      .select('isSuperAdmin roles')
      .populate({
        path: 'roles',
        model: RoleModel,
        select: 'slug wildcard permissions',
        populate: {
          path: 'permissions',
          model: PermissionModel,
          select: 'key',
        },
      })
      .lean();
    
    if (!user) {
      logger.warn('[RBAC] User not found for RBAC loading', { userId, orgId });
      return {
        isSuperAdmin: false,
        permissions: [],
        roles: [],
      };
    }
    
    // Super admin check
    const isSuperAdmin = user.isSuperAdmin || false;
    
    // If super admin, grant all permissions
    if (isSuperAdmin) {
      return {
        isSuperAdmin: true,
        permissions: ['*'], // Wildcard permission
        roles: ['super_admin'],
      };
    }
    
    // Extract role slugs and permissions
    const roles: string[] = [];
    const permissionsSet = new Set<string>();
    
    // Type for populated role object
    type PopulatedRole = {
      slug?: string;
      wildcard?: boolean;
      permissions?: Array<{ key?: string }>;
    };
    
    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role && typeof role === 'object') {
          const populatedRole = role as unknown as PopulatedRole;
          
          // Add role slug
          if (populatedRole.slug) {
            roles.push(populatedRole.slug);
          }
          
          // Check if role has wildcard
          if (populatedRole.wildcard) {
            permissionsSet.add('*');
            continue; // Wildcard role grants all permissions
          }
          
          // Add permissions from role
          if (populatedRole.permissions && Array.isArray(populatedRole.permissions)) {
            for (const perm of populatedRole.permissions) {
              if (perm && typeof perm === 'object' && perm.key) {
                permissionsSet.add(perm.key);
              }
            }
          }
        }
      }
    }
    
    return {
      isSuperAdmin,
      permissions: Array.from(permissionsSet),
      roles,
    };
  } catch (error) {
    logger.error('[RBAC] Failed to load RBAC data', { error, userId, orgId });
    // Return empty RBAC data on error (safe fallback)
    return {
      isSuperAdmin: false,
      permissions: [],
      roles: [],
    };
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser> {
  let userId: string | undefined;
  let orgId: string | undefined;
  let role: UserRoleType | undefined;
  let realOrgId: string | undefined;
  let impersonatedOrgId: string | null = null;
  let sessionIsSuperAdmin = false;
  
  // Try NextAuth session first (proper way)
  try {
    const session = await auth();
    
    if (session?.user?.id) {
      userId = session.user.id;
      const sessionOrgId = session.user.orgId || '';
      realOrgId = sessionOrgId || undefined;
      sessionIsSuperAdmin = Boolean((session.user as { isSuperAdmin?: boolean }).isSuperAdmin);
      const supportOrgOverride =
        sessionIsSuperAdmin ? req.cookies.get('support_org_id')?.value ?? undefined : undefined;
      if (supportOrgOverride) {
        orgId = supportOrgOverride;
        impersonatedOrgId = supportOrgOverride;
      } else {
        orgId = sessionOrgId || '';
      }
      
      // Validate role before casting
      const roleValue = session.user.role;
      
      if (!roleValue || !ALL_ROLES.includes(roleValue as UserRoleType)) {
        logger.error('Invalid role in NextAuth session', { role: roleValue, userId: session.user.id });
        throw new UnauthorizedError('Unauthenticated');
      }
      
      role = roleValue as UserRoleType;
    }
  } catch (e) {
    logger.error('Failed to get NextAuth session', { error: e });
  }
  
  // Inspect middleware-provided x-user header to capture impersonation context
  const xUserHeader = req.headers.get("x-user");
  if (xUserHeader) {
    try {
      const parsed = JSON.parse(xUserHeader);
      const tenantValue = parsed.orgId || parsed.tenantId;
      const roleValue = parsed.role;
      if (tenantValue && !orgId) {
        orgId = tenantValue;
      }
      if (parsed.id && !userId) {
        userId = parsed.id;
      }
      if (roleValue && ALL_ROLES.includes(roleValue as UserRoleType) && !role) {
        role = roleValue as UserRoleType;
      } else if (roleValue && !ALL_ROLES.includes(roleValue as UserRoleType)) {
        logger.warn('Invalid role in x-user header', { role: roleValue });
      }
      if (!realOrgId && (parsed.realOrgId || tenantValue)) {
        realOrgId = parsed.realOrgId || tenantValue;
      }
      if (!impersonatedOrgId && parsed.impersonatedOrgId) {
        impersonatedOrgId = parsed.impersonatedOrgId;
      }
      if (parsed.isSuperAdmin) {
        sessionIsSuperAdmin = true;
      }
    } catch (e) {
      logger.error('Failed to parse x-user header', { error: e });
    }
  }
  
  // Legacy: Check for old fixzit_auth cookie or Authorization header
  if (!userId) {
    const cookieToken = req.cookies.get('fixzit_auth')?.value;
    const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;
    
    if (token) {
      try {
        const payload = await verifyToken(token);
        
        if (payload?.id) {
          const tenantValue = payload.orgId || payload.tenantId;
          
          // Validate role before casting
          const roleValue = payload.role;
          
          if (!roleValue || !ALL_ROLES.includes(String(roleValue) as UserRoleType)) {
            logger.warn('Invalid role in legacy token', { role: roleValue, userId: payload.id });
            throw new Error('Invalid role in token');
          }
          
          if (tenantValue) {
            userId = payload.id;
            orgId = tenantValue;
            role = roleValue as UserRoleType;
          }
        }
      } catch (error) {
        logger.error('Legacy token verification failed', { error });
        // Continue to unauthenticated response
      }
    }
  }
  
  // If no auth found, throw error
  if (!userId || !orgId || !role) {
    throw new UnauthorizedError('Unauthenticated');
  }
  
  const rbacOrgId = realOrgId || orgId;
  const effectiveRealOrgId = realOrgId ?? orgId;
  
  // Load RBAC data from database
  const rbacData = await loadRBACData(userId, rbacOrgId);
  const isSuperAdmin = rbacData.isSuperAdmin || sessionIsSuperAdmin;
  const permissions = isSuperAdmin ? ['*'] : rbacData.permissions;
  const roles = isSuperAdmin
    ? Array.from(new Set([...(rbacData.roles || []), 'super_admin']))
    : rbacData.roles;
  
  return {
    id: userId,
    role: role,
    orgId: orgId,
    tenantId: orgId,
    isSuperAdmin,
    permissions,
    roles,
    realOrgId: effectiveRealOrgId,
    impersonatedOrgId,
  };
}

export function requireAbility(ability: Parameters<typeof can>[1]) {
  return async (req: NextRequest) => {
    try {
      const user = await getSessionUser(req);
      const normalizedRole = normalizeWorkOrderRole(user.role);
      if (!normalizedRole || !can(normalizedRole, ability)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return user;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === "Invalid or expired token") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ error: "Authentication error" }, { status: 500 });
    }
  };
}
