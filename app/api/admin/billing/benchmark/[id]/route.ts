/**
 * @description Updates a billing benchmark configuration by ID.
 * Benchmarks are used for pricing validation and market comparison.
 * @route PATCH /api/admin/billing/benchmark/[id]
 * @access Private - SUPER_ADMIN only
 * @param {string} id - Benchmark ID (MongoDB ObjectId)
 * @param {Object} body - Benchmark update fields
 * @returns {Object} benchmark: updated benchmark object
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {404} If benchmark not found
 */
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/db/mongoose";
import Benchmark from "@/server/models/Benchmark";
import { requireSuperAdmin } from "@/lib/authz";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

import { createSecureResponse } from "@/server/security/headers";
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "admin-billing-benchmark:patch",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // [FIXZIT-API-BENCH-001] Validate ObjectId before database operation
  if (!params.id || !mongoose.isValidObjectId(params.id)) {
    return createSecureResponse(
      { error: "INVALID_ID", message: "Invalid benchmark ID format" },
      400,
      req
    );
  }

  try {
    await dbConnect();
    await requireSuperAdmin(req);
    const { data: body, error: parseError } = await parseBodySafe(req, {
      logPrefix: "[admin:billing:benchmark:id]",
    });
    if (parseError || !body) {
      return createSecureResponse({ error: "Invalid JSON payload" }, 400, req);
    }

    // AUDIT-2025-12-08: Whitelist allowed fields to prevent mass assignment
    const allowedFields = ['name', 'description', 'category', 'value', 'unit', 'metadata', 'isActive'];
    const sanitizedBody: Record<string, unknown> = {};
    const bodyRecord = body as Record<string, unknown>;
    for (const key of allowedFields) {
      if (bodyRecord[key] !== undefined) {
        sanitizedBody[key] = bodyRecord[key];
      }
    }

    const doc = await Benchmark.findByIdAndUpdate(params.id, sanitizedBody, { new: true });
    if (!doc) {
      return createSecureResponse({ error: "NOT_FOUND" }, 404, req);
    }

    return createSecureResponse(doc, 200, req);
  } catch (error) {
    logger.error("[admin/billing/benchmark/[id]] PATCH error", { error });
    return createSecureResponse({ error: "Failed to update benchmark" }, 500, req);
  }
}
