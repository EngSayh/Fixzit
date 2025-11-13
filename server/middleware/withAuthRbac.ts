import { NextRequest, NextResponse } from "next/server";
import { can, Role } from "../rbac/workOrdersPolicy";
import { verifyToken } from "@/lib/auth";
import { logger } from '@/lib/logger';

export type SessionUser = {
  id: string;
  role: Role;
  orgId: string;
  tenantId: string;
};

export async function getSessionUser(req: NextRequest): Promise<SessionUser> {
  // Get token from cookie or header
  const cookieToken = req.cookies.get('fixzit_auth')?.value;
  const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  const xUserHeader = req.headers.get("x-user"); // Fallback for development
  
  console.log('[DEBUG getSessionUser] Headers check:', {
    hasXUser: !!xUserHeader,
    hasCookieToken: !!cookieToken,
    hasHeaderToken: !!headerToken,
    xUserFull: xUserHeader
  });
  
  // Development fallback - prioritize for testing
  if (xUserHeader) {
    try {
      const parsed = JSON.parse(xUserHeader);
      // Ensure both orgId and tenantId are set (they should be the same)
      const tenantValue = parsed.orgId || parsed.tenantId;
      console.log('[DEBUG getSessionUser] Parsed x-user:', { id: parsed.id, role: parsed.role, orgId: tenantValue });
      return {
        id: parsed.id,
        role: parsed.role as Role,
        orgId: tenantValue,
        tenantId: tenantValue,
      };
    } catch (e) {
      logger.error('Failed to parse x-user header', { error: e });
      throw new Error("Invalid x-user header");
    }
  }
  
  const token = cookieToken || headerToken;
  
  if (!token) {
    throw new Error("Unauthenticated");
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    throw new Error("Invalid or expired token");
  }
  
  // Support JWTs with either orgId or tenantId field (they represent the same concept)
  const tenantValue = payload.orgId || payload.tenantId;
  if (!tenantValue) {
    throw new Error("Missing tenant context in token");
  }

  return {
    id: payload.id,
    role: payload.role as Role,
    orgId: tenantValue,
    tenantId: tenantValue, // Keep both fields in sync for backward compatibility
  };
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
