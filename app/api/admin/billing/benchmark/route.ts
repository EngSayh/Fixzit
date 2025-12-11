/**
 * @description Retrieves billing benchmarks for pricing comparison.
 * Returns market benchmarks used to validate and compare module pricing.
 * @route GET /api/admin/billing/benchmark
 * @access Private - SUPER_ADMIN only
 * @returns {Object} benchmarks: array of benchmark configs
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {429} If rate limit exceeded
 */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Benchmark from "@/server/models/Benchmark";
import { requireSuperAdmin } from "@/lib/authz";

import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
export async function GET(req: NextRequest) {
  // AuthZ + tenancy
  let authContext: { id: string; tenantId: string } | null = null;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    if (error instanceof Response) return error;
    return createSecureResponse({ error: "Authentication failed" }, 401, req);
  }

  const orgId = authContext?.tenantId?.trim();
  if (!orgId) {
    return createSecureResponse({ error: "Missing organization context" }, 400, req);
  }

  // Rate limiting (org + user aware)
  const key = buildOrgAwareRateLimitKey(req, orgId, authContext.id);
  const rl = await smartRateLimit(key, 100, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await connectToDatabase();
  // Scope benchmarks to tenant to avoid cross-tenant leakage
  const docs = await Benchmark.find({ tenantId: orgId }).lean();
  return createSecureResponse(docs, 200, req);
}
