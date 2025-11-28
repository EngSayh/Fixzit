import { NextRequest } from "next/server";
import { getUserFromToken } from "@/lib/auth";

/**
 * CopilotRole type - 🔒 STRICT v4.1 COMPLIANT
 * 
 * Canonical Roles (9):
 * - SUPER_ADMIN, ADMIN, CORPORATE_OWNER, TEAM_MEMBER
 * - TECHNICIAN, PROPERTY_MANAGER, TENANT, VENDOR, GUEST
 * 
 * Legacy aliases kept for backward compatibility:
 * - CORPORATE_ADMIN → ADMIN
 * - FM_MANAGER → PROPERTY_MANAGER
 * - OWNER → CORPORATE_OWNER
 * - CUSTOMER → TENANT
 * - EMPLOYEE → TEAM_MEMBER
 */
export type CopilotRole =
  // Canonical STRICT v4.1 roles
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CORPORATE_OWNER"
  | "TEAM_MEMBER"
  | "TECHNICIAN"
  | "PROPERTY_MANAGER"
  | "TENANT"
  | "VENDOR"
  | "GUEST"
  // Legacy aliases (kept for backward compatibility)
  | "CORPORATE_ADMIN" // → ADMIN
  | "FM_MANAGER" // → PROPERTY_MANAGER
  | "FINANCE" // → TEAM_MEMBER + SubRole.FINANCE_OFFICER
  | "HR" // → TEAM_MEMBER + SubRole.HR_OFFICER
  | "PROCUREMENT" // → TEAM_MEMBER
  | "EMPLOYEE" // → TEAM_MEMBER
  | "CUSTOMER" // → TENANT
  | "OWNER" // → CORPORATE_OWNER
  | "AUDITOR"; // → GUEST

export interface CopilotSession {
  userId: string;
  tenantId: string;
  role: CopilotRole;
  email?: string;
  name?: string;
  locale: "en" | "ar";
  timezone?: string;
}

export async function resolveCopilotSession(
  req: NextRequest,
): Promise<CopilotSession> {
  const cookieToken = req.cookies.get("fixzit_auth")?.value;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const token = cookieToken || bearer;

  const acceptLanguage = req.headers.get("accept-language") || "en";
  const locale = acceptLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";

  if (!token) {
    return {
      userId: "guest",
      tenantId: "public",
      role: "GUEST",
      locale,
    };
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return {
      userId: "guest",
      tenantId: "public",
      role: "GUEST",
      locale,
    };
  }

  // ORGID-FIX: Use undefined (not "default") for missing orgId
  // Copilot should handle missing tenant context explicitly
  return {
    userId: user.id,
    tenantId: user.orgId ?? "",
    role: (user.role || "GUEST") as CopilotRole,
    email: user.email,
    name: user.name,
    locale,
  };
}
