/**
 * @module lib/authz
 * @description Minimal authorization helpers for superadmin-only API routes.
 *
 * @features
 * - Extracts Bearer token from NextRequest
 * - Verifies token with `verifyToken` and enforces SUPER_ADMIN role
 * - Returns 404 for non-admins to avoid endpoint discovery (STRICT v4.1)
 *
 * @security
 * - Tenant-aware context preserved via payload.tenantId
 * - JSON error responses with correct status codes
 */

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
    // 🔐 STRICT v4.1: Return 404 (not 403) to hide admin-only endpoints from non-admins
    throw new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    ...payload,
    tenantId: payload.tenantId || "",
  } as AuthContext;
}
