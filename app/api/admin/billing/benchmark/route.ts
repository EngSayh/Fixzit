import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Benchmark from "@/server/models/Benchmark";
import { requireSuperAdmin } from "@/lib/authz";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

/**
 * @openapi
 * /api/admin/billing/benchmark:
 *   get:
 *     summary: admin/billing/benchmark operations
 *     tags: [admin]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 100, 60000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await connectToDatabase();
  // SEC-001: requireSuperAdmin returns void on success, throws/returns Response on failure
  // Super Admin can view all benchmarks for platform-wide pricing analysis
  // NOTE: Benchmark data is platform configuration, not tenant-specific business data
  await requireSuperAdmin(req);
  const docs = await Benchmark.find({}).lean();
  return createSecureResponse(docs, 200, req);
}
