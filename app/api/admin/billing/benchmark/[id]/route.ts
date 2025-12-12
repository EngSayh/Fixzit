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
import { dbConnect } from "@/db/mongoose";
import Benchmark from "@/server/models/Benchmark";
import { requireSuperAdmin } from "@/lib/authz";
import { logger } from "@/lib/logger";

import { createSecureResponse } from "@/server/security/headers";
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await dbConnect();
    await requireSuperAdmin(req);
    const body = await req.json();

    // AUDIT-2025-12-08: Whitelist allowed fields to prevent mass assignment
    const allowedFields = ['name', 'description', 'category', 'value', 'unit', 'metadata', 'isActive'];
    const sanitizedBody: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        sanitizedBody[key] = body[key];
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
