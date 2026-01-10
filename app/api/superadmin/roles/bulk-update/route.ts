/**
 * @fileoverview Superadmin Roles Bulk Update API
 * @description Bulk update role permissions
 * @route POST /api/superadmin/roles/bulk-update
 * @route PUT /api/superadmin/roles/bulk-update
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/roles/bulk-update
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import Role from "@/server/models/Role";
import { AuditLogModel } from "@/server/models/AuditLog";
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

// UI sends roles with permissions as Record<string, string[]>
interface UIRole {
  _id: string;
  name?: string;
  permissions: Record<string, string[]> | string[];
}

/**
 * Convert UI permissions format to API format
 * UI: { "users.view": ["read"], "users.edit": ["update"] }
 * API: ["users.view", "users.edit"]
 */
function normalizePermissions(
  permissions: Record<string, string[]> | string[]
): string[] {
  if (Array.isArray(permissions)) {
    return permissions;
  }
  // Convert record to array of permission keys
  return Object.keys(permissions).filter(
    (key) => permissions[key] && permissions[key].length > 0
  );
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
          // Audit log for each role update
          await AuditLogModel.create({
            orgId: "PLATFORM",
            entityType: "SETTING",
            entityId: update.id,
            entityName: `Role permissions: ${result.name || update.id}`,
            action: "UPDATE",
            userId: session.username,
            userName: session.username,
            timestamp: new Date(),
            metadata: {
              reason: `Bulk update role permissions`,
              tags: ["role", "permissions", "bulk-update"],
              permissionCount: update.permissions.length,
            },
            result: { success: true },
          }).catch((err: Error) => {
            logger.warn("[Superadmin:Roles] Failed to create audit log", { error: err.message });
          });
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

/**
 * PUT /api/superadmin/roles/bulk-update
 * Bulk update roles from UI (accepts { roles: [...] } format)
 * This handler supports the UI's format where roles have permissions as Record<string, string[]>
 */
export async function PUT(request: NextRequest) {
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
      roles?: UIRole[];
    }>(request, { logPrefix: "[superadmin:roles:bulk-update:put]" });

    if (parseError || !body?.roles || !Array.isArray(body.roles)) {
      return NextResponse.json(
        { error: "Invalid request body - roles array required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const results = {
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const role of body.roles) {
      try {
        if (!role._id) {
          results.skipped++;
          continue;
        }

        // Check if role is system-reserved (skip modification)
        const existingRole = await Role.findById(role._id).lean();
        if (existingRole?.systemReserved) {
          results.skipped++;
          logger.info("[Superadmin:Roles] Skipped system-reserved role", { roleId: role._id });
          continue;
        }

        // Normalize permissions from UI format to API format
        const normalizedPermissions = normalizePermissions(role.permissions);

        const result = await Role.findByIdAndUpdate(
          role._id,
          { permissions: normalizedPermissions },
          { new: true }
        );

        if (result) {
          results.updated++;
          // Audit log
          await AuditLogModel.create({
            orgId: "PLATFORM",
            entityType: "SETTING",
            entityId: role._id,
            entityName: `Role permissions: ${result.name || role._id}`,
            action: "UPDATE",
            userId: session.username,
            userName: session.username,
            timestamp: new Date(),
            metadata: {
              reason: `Updated role permissions via bulk save`,
              tags: ["role", "permissions", "bulk-update"],
              permissionCount: normalizedPermissions.length,
            },
            result: { success: true },
          }).catch((err: Error) => {
            logger.warn("[Superadmin:Roles] Failed to create audit log", { error: err.message });
          });
        } else {
          results.failed++;
          results.errors.push(`Role ${role._id} not found`);
        }
      } catch (_err) {
        results.failed++;
        results.errors.push(`Failed to update role ${role._id}`);
      }
    }

    logger.info("[Superadmin:Roles] PUT bulk update completed", {
      updated: results.updated,
      failed: results.failed,
      skipped: results.skipped,
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
    logger.error("[Superadmin:Roles] PUT bulk update failed", { error });
    return NextResponse.json(
      { error: "Failed to bulk update roles" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
