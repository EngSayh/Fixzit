import { NextRequest } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export type CopilotRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CORPORATE_ADMIN"
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

  return {
    userId: user.id,
    tenantId: user.orgId || "default",
    role: (user.role || "GUEST") as CopilotRole,
    email: user.email,
    name: user.name,
    locale,
  };
}
