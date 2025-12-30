/**
 * @fileoverview Superadmin Role by ID API
 * @description Update/delete individual role
 * @route PUT /api/superadmin/roles/[id]
 * @route DELETE /api/superadmin/roles/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/roles/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import Role from "@/server/models/Role";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { isValidObjectId } from "mongoose";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/superadmin/roles/[id]
 * Update a role
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-roles:put",
    requests: 20,
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

    const { id } = await context.params;
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid role ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      name?: string;
      description?: string;
      permissions?: string[];
    }>(request, { logPrefix: "[superadmin:roles:id]" });

    if (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const updateData: Record<string, unknown> = {};
    if (body?.name) updateData.name = body.name;
    if (body?.description !== undefined) updateData.description = body.description;
    if (body?.permissions) updateData.permissions = body.permissions;

    const role = await Role.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Roles] Role updated", {
      roleId: id,
      by: session.username,
    });

    return NextResponse.json({ role }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:Roles] Failed to update role", { error });
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/roles/[id]
 * Delete a role
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-roles:delete",
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

    const { id } = await context.params;
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid role ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const role = await Role.findByIdAndDelete(id).lean();

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Roles] Role deleted", {
      roleId: id,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Role deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Roles] Failed to delete role", { error });
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
