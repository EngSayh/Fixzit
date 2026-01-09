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
import { AuditLogModel } from "@/server/models/AuditLog";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Config, DEFAULT_PLATFORM_ORG_ID } from "@/lib/config/constants";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/roles
 * List all roles with populated permissions
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
    const roles = await Role.find({})
      .populate("permissions", "key description module")
      .sort({ name: 1 })
      .lean();

    // Transform permissions from ObjectIds to string keys for UI consumption
    const transformedRoles = roles.map((role) => ({
      ...role,
      // Convert populated permissions to string keys, or keep as-is if already strings
      permissions: Array.isArray(role.permissions)
        ? role.permissions.map((p: unknown) => {
            if (typeof p === "string") return p;
            if (p && typeof p === "object" && "key" in p) return (p as { key: string }).key;
            // ObjectId case - convert to string
            return String(p);
          })
        : [],
      // Add permission count for UI
      permissionCount: Array.isArray(role.permissions) ? role.permissions.length : 0,
    }));

    return NextResponse.json(
      {
        roles: transformedRoles,
        total: transformedRoles.length,
        fetchedAt: new Date().toISOString(),
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

    // Generate slug from name (lowercase, replace non-alphanumeric with underscore)
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    // Get platform org ID from config (required for Role model)
    const platformOrgId = Config.features.platformOrgId || DEFAULT_PLATFORM_ORG_ID;

    const role = await Role.create({
      orgId: platformOrgId,
      name: body.name,
      slug,
      description: body.description || "",
      permissions: body.permissions || [],
    });

    // Audit log for role creation
    // Schema requires: orgId, action (enum), entityType (enum), userId
    // Using SETTING for role-related changes, CREATE action
    await AuditLogModel.create({
      orgId: "PLATFORM", // Platform-wide operation
      entityType: "SETTING",
      entityId: String(role._id),
      entityName: `Role: ${body.name}`,
      action: "CREATE",
      userId: session.username,
      userName: session.username,
      timestamp: new Date(),
      metadata: {
        reason: `Created role: ${body.name}`,
        tags: ["role", "superadmin"],
      },
      result: { 
        success: true,
        affectedRecords: 1,
      },
    }).catch((err: Error) => {
      logger.warn("[Superadmin:Roles] Failed to create audit log", { error: err.message });
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
