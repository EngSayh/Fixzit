import { NextRequest } from "next/server";

type ContextOptions = {
  orgId?: string;
  tenantId?: string;
  userId?: string;
  role?: string;
  allowUnauth?: boolean;
};

/**
 * Helper to construct a NextRequest with marketplace auth/tenant headers.
 * Keeps tests consistent and avoids duplicating x-user/x-org headers.
 */
export function makeMarketplaceRequest(
  url: string,
  opts: ContextOptions = {},
): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.orgId) headers["x-org-id"] = opts.orgId;
  if (opts.tenantId) headers["x-tenant-id"] = opts.tenantId;
  if (opts.userId) headers["x-user-id"] = opts.userId;
  if (opts.role) headers["x-user-role"] = opts.role;
  if (opts.allowUnauth) headers["x-allow-unauth"] = "true";
  return new NextRequest(url, { headers });
}
