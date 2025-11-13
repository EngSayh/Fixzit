import { NextRequest, NextResponse } from "next/server";
import { can, Role } from "../rbac/workOrdersPolicy";
import { auth } from "@/auth";
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';

export type SessionUser = {
  id: string;
  role: Role;
  orgId: string;
  tenantId: string;
};

export async function getSessionUser(req: NextRequest): Promise<SessionUser> {
  // Try NextAuth session first (proper way)
  try {
    const session = await auth();
    
    if (session?.user?.id) {
      const orgId = session.user.orgId || '';
      
      // Validate role before casting
      const roleValue = session.user.role;
      const validRoles = Object.values(Role) as string[];
      
      if (!roleValue || !validRoles.includes(roleValue)) {
        logger.error('Invalid role in NextAuth session', { role: roleValue, userId: session.user.id });
        throw new Error('Unauthenticated');
      }
      
      return {
        id: session.user.id,
        role: roleValue as Role,
        orgId: orgId,
        tenantId: orgId,
      };
    }
  } catch (e) {
    logger.error('Failed to get NextAuth session', { error: e });
  }
  
  // Fallback to x-user header (for middleware-set headers)
  const xUserHeader = req.headers.get("x-user");
  
  if (xUserHeader) {
    try {
      const parsed = JSON.parse(xUserHeader);
      const tenantValue = parsed.orgId || parsed.tenantId;
      
      // Validate role before casting
      const roleValue = parsed.role;
      const validRoles = Object.values(Role) as string[];
      
      if (!roleValue || !validRoles.includes(roleValue)) {
        logger.warn('Invalid role in x-user header', { role: roleValue });
        // Skip this header, continue to next auth method
      } else if (parsed.id && tenantValue) {
        return {
          id: parsed.id,
          role: roleValue as Role,
          orgId: tenantValue,
          tenantId: tenantValue,
        };
      }
    } catch (e) {
      logger.error('Failed to parse x-user header', { error: e });
    }
  }
  
  // Legacy: Check for old fixzit_auth cookie or Authorization header
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
        const validRoles = Object.values(Role) as string[];
        
        if (!roleValue || !validRoles.includes(roleValue)) {
          logger.warn('Invalid role in legacy token', { role: roleValue, userId: payload.id });
          throw new Error('Invalid role in token');
        }
        
        if (tenantValue) {
          return {
            id: payload.id,
            role: roleValue as Role,
            orgId: tenantValue,
            tenantId: tenantValue,
          };
        }
      }
    } catch (error) {
      logger.error('Legacy token verification failed', { error });
      // Continue to unauthenticated response
    }
  }
  
  throw new Error("Unauthenticated");
}

export function requireAbility(ability: Parameters<typeof can>[1]) {
  return async (req: NextRequest) => {
    try {
      const user = await getSessionUser(req);
      if (!can(user.role, ability)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return user;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === "Unauthenticated" || errorMessage === "Invalid or expired token") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ error: "Authentication error" }, { status: 500 });
    }
  };
}
