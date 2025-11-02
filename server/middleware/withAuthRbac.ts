import { NextRequest, NextResponse } from "next/server";
import { can, Role } from "../rbac/workOrdersPolicy";
import { verifyToken } from '@/lib/auth';

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
  
  // Development fallback - prioritize for testing
  if (xUserHeader) {
    try {
      return JSON.parse(xUserHeader) as SessionUser;
    } catch (e) {
      console.error('Failed to parse x-user header:', e);
    }
  }
  
  const token = cookieToken || headerToken;
  
  if (!token) {
    throw new Error("Unauthenticated");
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    throw new Error("Invalid or expired token");
  }
  
  return {
    id: payload.id,
    role: payload.role as Role,
    orgId: payload.orgId,
    tenantId: payload.tenantId || payload.orgId // Use tenantId or fallback to orgId
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
