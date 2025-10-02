import { NextRequest, NextResponse } from "next/server";
import { can, Role } from "../rbac/workOrdersPolicy";
import { verifyToken } from "@/lib/auth";

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
  
  const token = cookieToken || headerToken;
  
  // Development fallback
  if (!token && xUserHeader) {
    return JSON.parse(xUserHeader) as SessionUser;
  }
  
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
    } catch (error: any) {
      if (error.message === "Unauthenticated" || error.message === "Invalid or expired token") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ error: "Authentication error" }, { status: 500 });
    }
  };
}

