/**
 * @fileoverview Superadmin Roles Bulk Update API
 * @description Bulk update role permissions
 * @route POST /api/superadmin/roles/bulk-update
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/roles/bulk-update
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import Role from "@/server/models/Role";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RoleUpdate {
  id: string;
  permissions: string[];
}

/**
 * POST /api/superadmin/roles/bulk-update
 * Bulk update role permissions
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-roles:bulk-update",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      updates?: RoleUpdate[];
    }>(request, { logPrefix: "[superadmin:roles:bulk-update]" });

    if (parseError || !body?.updates || !Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: "Invalid request body - updates array required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const update of body.updates) {
      try {
        const result = await Role.findByIdAndUpdate(
          update.id,
          { permissions: update.permissions },
          { new: true }
        );
        if (result) {
          results.updated++;
        } else {
          results.failed++;
          results.errors.push(`Role ${update.id} not found`);
        }
      } catch (_err) {
        results.failed++;
        results.errors.push(`Failed to update role ${update.id}`);
      }
    }

    logger.info("[Superadmin:Roles] Bulk update completed", {
      updated: results.updated,
      failed: results.failed,
      by: session.username,
    });

    return NextResponse.json(
      {
        message: `Updated ${results.updated} roles`,
        ...results,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Roles] Bulk update failed", { error });
    return NextResponse.json(
      { error: "Failed to bulk update roles" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
