import { NextRequest } from "next/server";
import { verifyToken } from "./auth";

export interface AuthContext {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export async function requireSuperAdmin(
  req: NextRequest,
): Promise<AuthContext> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = header.slice(7);
  const payload = await verifyToken(token);

  if (!payload || payload.role !== "SUPER_ADMIN") {
    throw new Response(JSON.stringify({ error: "FORBIDDEN" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    ...payload,
    tenantId: payload.tenantId || "",
  } as AuthContext;
}
