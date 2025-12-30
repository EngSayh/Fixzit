/**
 * @fileoverview Superadmin Roles API
 * @description Role management for superadmin portal
 * @route GET /api/superadmin/roles
 * @route POST /api/superadmin/roles
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/roles
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

/**
 * GET /api/superadmin/roles
 * List all roles
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-roles:get",
    requests: 30,
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

    await connectDb();

    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide role management
    const roles = await Role.find({}).sort({ name: 1 }).lean();

    return NextResponse.json(
      {
        roles,
        total: roles.length,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Roles] Failed to load roles", { error });
    return NextResponse.json(
      { error: "Failed to load roles" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-roles:post",
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

    const { data: body, error: parseError } = await parseBodySafe<{
      name?: string;
      description?: string;
      permissions?: string[];
    }>(request, { logPrefix: "[superadmin:roles]" });

    if (parseError || !body?.name) {
      return NextResponse.json(
        { error: "Invalid request body - name required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide role creation
    const role = await Role.create({
      name: body.name,
      description: body.description || "",
      permissions: body.permissions || [],
    });

    logger.info("[Superadmin:Roles] Role created", {
      roleId: role._id,
      name: body.name,
      by: session.username,
    });

    return NextResponse.json(
      { role, message: "Role created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Roles] Failed to create role", { error });
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
