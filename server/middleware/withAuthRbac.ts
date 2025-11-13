import { NextRequest, NextResponse } from "next/server";
import { can, Role } from "../rbac/workOrdersPolicy";
import { auth } from "@/auth";
import { logger } from '@/lib/logger';

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
      return {
        id: session.user.id,
        role: session.user.role as Role,
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
      if (parsed.id && tenantValue) {
        return {
          id: parsed.id,
          role: parsed.role as Role,
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
    // Import verifyToken dynamically to avoid issues
    const { verifyToken } = await import('@/lib/auth');
    const payload = await verifyToken(token);
    
    if (payload?.id) {
      const tenantValue = payload.orgId || payload.tenantId;
      if (tenantValue) {
        return {
          id: payload.id,
          role: payload.role as Role,
          orgId: tenantValue,
          tenantId: tenantValue,
        };
      }
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
