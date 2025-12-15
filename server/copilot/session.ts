import { NextRequest } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { decode as decodeAuthJwt } from "next-auth/jwt";

export type CopilotRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CORPORATE_ADMIN"
  | "CORPORATE_OWNER"
  | "TEAM_MEMBER"
  | "FM_MANAGER"
  | "FINANCE"
  | "HR"
  | "PROCUREMENT"
  | "PROPERTY_MANAGER"
  | "EMPLOYEE"
  | "TECHNICIAN"
  | "VENDOR"
  | "CUSTOMER"
  | "OWNER"
  | "AUDITOR"
  | "TENANT"
  | "GUEST";

export interface CopilotSession {
  userId: string;
  tenantId: string;
  role: CopilotRole;
  email?: string;
  name?: string;
  locale: "en" | "ar";
  timezone?: string;
  permissions?: string[];
}

export async function resolveCopilotSession(
  req: NextRequest,
): Promise<CopilotSession> {
  const acceptLanguage = req.headers.get("accept-language") || "en";
  const locale = acceptLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const cookieToken = req.cookies.get("fixzit_auth")?.value;

  // Support Auth.js / NextAuth session cookies used in Playwright (authjs.session-token, next-auth.session-token)
  const authCookieCandidates = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];
  const authCookie =
    authCookieCandidates
      .map((name) => req.cookies.get(name)?.value)
      .find(Boolean) || undefined;

  const token = bearer || cookieToken || authCookie;

  const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (authSecret && token) {
    try {
      const decoded = await decodeAuthJwt({ 
        token, 
        secret: authSecret,
        salt: "authjs.session-token" // Default salt for next-auth session tokens
      });
      if (decoded) {
        const userId = (decoded.id || decoded.sub || "guest") as string;
        const tenantId = (decoded as { orgId?: string }).orgId || "public";
        const role = ((decoded as { role?: string }).role || "GUEST") as CopilotRole;
        const permissions = Array.isArray((decoded as { permissions?: unknown }).permissions)
          ? ((decoded as { permissions: string[] }).permissions)
          : undefined;
        return {
          userId,
          tenantId,
          role,
          email: (decoded as { email?: string }).email,
          name: (decoded as { name?: string }).name,
          locale,
          permissions,
        };
      }
    } catch (_err) {
      // Session decryption failed (e.g., AUTH_SECRET changed, expired session, wrong salt)
      // Fall through to guest session - user will need to re-authenticate
      // This is safe: copilot falls back to guest role with minimal permissions
    }
  }

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

  // SEC-001: If user has no orgId, they're effectively a guest with public tenant
  // This is valid for copilot context - authenticated users without org belong to public tenant
  return {
    userId: user.id,
    tenantId: user.orgId || "public",
    role: (user.role || "GUEST") as CopilotRole,
    email: user.email,
    name: user.name,
    locale,
  };
}
