/**
 * @fileoverview User Permissions Override API
 * @description Manage per-user permission overrides (beyond role defaults)
 * @route GET/PUT/DELETE /api/superadmin/users/[id]/permissions
 * @access Superadmin only
 * @module api/superadmin/users/[id]/permissions
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { User } from "@/server/models/User";
import { z } from "zod";
import mongoose from "mongoose";
import { RBAC_MODULES, RBAC_ROLE_PERMISSIONS, type ModulePermissions } from "@/config/rbac.matrix";
import { RBAC_SUBMODULES, getSubModulePermissions, type SubModulePermissions } from "@/config/rbac.submodules";
import { type UserRoleType } from "@/types/user";

// Permission override schema
const permissionOverrideSchema = z.object({
  moduleId: z.string(),
  subModuleId: z.string().optional(),
  permissions: z.object({
    view: z.boolean().optional(),
    create: z.boolean().optional(),
    edit: z.boolean().optional(),
    delete: z.boolean().optional(),
    export: z.boolean().optional(),
    approve: z.boolean().optional(),
    admin: z.boolean().optional(),
  }),
});

const updatePermissionsSchema = z.object({
  overrides: z.array(permissionOverrideSchema),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/superadmin/users/[id]/permissions
 * Get user's effective permissions (role-based + overrides)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    await connectDb();

    const user = await User.findById(id)
      .select("email professional.role")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userRole = (user.professional?.role || "STAFF") as UserRoleType;
    const rolePermissions = RBAC_ROLE_PERMISSIONS[userRole] || {};
    // Permission overrides stored in user document (if schema supports it)
    const userDoc = user as typeof user & { permissionOverrides?: Array<{ moduleId: string; subModuleId?: string; permissions: SubModulePermissions }> };
    const overrides = (userDoc.permissionOverrides || []) as Array<{
      moduleId: string;
      subModuleId?: string;
      permissions: SubModulePermissions;
    }>;

    // Build complete permissions matrix
    const modules = RBAC_MODULES.map((module) => {
      const basePerms: ModulePermissions = rolePermissions[module.id] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };

      // Check for module-level override
      const moduleOverride = overrides.find(
        (o) => o.moduleId === module.id && !o.subModuleId
      );

      const effectiveModulePerms: SubModulePermissions = moduleOverride
        ? { ...basePerms, ...moduleOverride.permissions }
        : { ...basePerms, export: false, approve: false, admin: false };

      // Get sub-modules for this module
      const subModules = RBAC_SUBMODULES.filter(
        (sub) => sub.parentId === module.id
      ).map((subModule) => {
        const subBasePerms = getSubModulePermissions(
          userRole,
          subModule.id,
          basePerms
        );

        // Check for sub-module override
        const subOverride = overrides.find(
          (o) => o.moduleId === module.id && o.subModuleId === subModule.id
        );

        const effectiveSubPerms: SubModulePermissions = subOverride
          ? { ...subBasePerms, ...subOverride.permissions }
          : subBasePerms;

        return {
          id: subModule.id,
          label: subModule.label,
          description: subModule.description,
          permissions: effectiveSubPerms,
          hasOverride: !!subOverride,
        };
      });

      return {
        id: module.id,
        label: module.label,
        description: module.description,
        permissions: effectiveModulePerms,
        hasOverride: !!moduleOverride,
        subModules,
      };
    });

    return NextResponse.json({
      userId: id,
      email: user.email,
      role: userRole,
      modules,
      overrideCount: overrides.length,
    });
  } catch (error) {
    logger.error("[UserPermissions] GET error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/superadmin/users/[id]/permissions
 * Update user's permission overrides
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    await connectDb();

    // Check if user exists
    const user = await User.findById(id).select("email").lean();
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = updatePermissionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { overrides, reason } = parsed.data;

    // Validate all module/submodule IDs
    for (const override of overrides) {
      const moduleExists = RBAC_MODULES.some((m) => m.id === override.moduleId);
      if (!moduleExists) {
        return NextResponse.json(
          { error: `Invalid module ID: ${override.moduleId}` },
          { status: 400 }
        );
      }

      if (override.subModuleId) {
        const subModuleExists = RBAC_SUBMODULES.some(
          (s) => s.id === override.subModuleId && s.parentId === override.moduleId
        );
        if (!subModuleExists) {
          return NextResponse.json(
            { error: `Invalid sub-module ID: ${override.subModuleId} for module ${override.moduleId}` },
            { status: 400 }
          );
        }
      }
    }

    // Update user with new permission overrides
    await User.findByIdAndUpdate(id, {
      $set: {
        permissionOverrides: overrides,
        permissionOverridesUpdatedAt: new Date(),
        permissionOverridesUpdatedBy: session.username,
        permissionOverridesReason: reason,
      },
    });

    logger.info("[UserPermissions] Permissions updated", {
      userId: id,
      overrideCount: overrides.length,
      updatedBy: session.username,
      reason,
    });

    return NextResponse.json({
      success: true,
      overrideCount: overrides.length,
    });
  } catch (error) {
    logger.error("[UserPermissions] PUT error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/users/[id]/permissions
 * Clear all permission overrides (revert to role defaults)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    await connectDb();

    // Check if user exists
    // eslint-disable-next-line local/require-lean -- SUPER_ADMIN: checking user existence before permission clear (DELETE)
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Clear permission overrides
    await User.findByIdAndUpdate(id, {
      $set: {
        permissionOverrides: [],
        permissionOverridesUpdatedAt: new Date(),
        permissionOverridesUpdatedBy: session.username,
        permissionOverridesReason: "Cleared - reverted to role defaults",
      },
    });

    logger.info("[UserPermissions] Permissions cleared", {
      userId: id,
      clearedBy: session.username,
    });

    return NextResponse.json({
      success: true,
      message: "Permission overrides cleared",
    });
  } catch (error) {
    logger.error("[UserPermissions] DELETE error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
