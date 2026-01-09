/**
 * @fileoverview Superadmin User Detail API
 * @description PATCH/DELETE endpoints for individual user management
 * @route GET/PATCH/DELETE /api/superadmin/users/[id]
 * @access Superadmin only
 * @module api/superadmin/users/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { User } from "@/server/models/User";
import { Organization } from "@/server/models/Organization";
import { z } from "zod";
import mongoose from "mongoose";
import { UserRole } from "@/types/user";

// All valid user roles
const VALID_ROLES = Object.values(UserRole);

// Update schema
const updateUserSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  role: z.string().refine((val) => VALID_ROLES.includes(val as (typeof UserRole)[keyof typeof UserRole]), {
    message: `Role must be one of: ${VALID_ROLES.join(", ")}`,
  }).optional(),
  orgId: z.string().optional(),
  isSuperAdmin: z.boolean().optional(),
  personal: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
  }).optional(),
  professional: z.object({
    role: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/superadmin/users/[id]
 * Get single user details
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
      .select("-password -__v")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get organization name if user has orgId
    // User model uses top-level orgId from tenantIsolationPlugin [AGENT-0018]
    let orgName: string | undefined;
    const userOrgId = (user as typeof user & { orgId?: mongoose.Types.ObjectId | string })?.orgId;
    if (userOrgId) {
      const org = await Organization.findById(userOrgId).select("name").lean();
      orgName = org?.name;
    }

    return NextResponse.json({
      user: {
        ...user,
        orgName,
      },
    });
  } catch (error) {
    logger.error("[SuperadminUserDetail] GET error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/users/[id]
 * Update user details (status, role, personal info, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    // eslint-disable-next-line local/require-lean -- SUPER_ADMIN: checking user existence before update
    const existingUser = await User.findById(id);
    if (!existingUser) {
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

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { status, role, orgId, isSuperAdmin, personal, professional } = parsed.data;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (isSuperAdmin !== undefined) {
      // Only allow setting isSuperAdmin if current user is also superadmin
      updateData.isSuperAdmin = isSuperAdmin;
    }

    if (role !== undefined) {
      // Store role in professional.role
      updateData["professional.role"] = role;
    }

    if (orgId !== undefined) {
      if (orgId === "") {
        // Clear organization - use top-level orgId to align with GET read path [AGENT-0025]
        updateData["orgId"] = null;
      } else if (mongoose.isValidObjectId(orgId)) {
        // Validate org exists
        const org = await Organization.findById(orgId).lean();
        if (!org) {
          return NextResponse.json(
            { error: "Organization not found" },
            { status: 404 }
          );
        }
        // Use top-level orgId to align with GET read path (tenantIsolationPlugin) [AGENT-0025]
        updateData["orgId"] = new mongoose.Types.ObjectId(orgId);
      } else {
        return NextResponse.json(
          { error: "Invalid organization ID" },
          { status: 400 }
        );
      }
    }

    if (personal) {
      if (personal.firstName !== undefined) {
        updateData["personal.firstName"] = personal.firstName;
      }
      if (personal.lastName !== undefined) {
        updateData["personal.lastName"] = personal.lastName;
      }
      if (personal.phone !== undefined) {
        updateData["personal.phone"] = personal.phone;
      }
    }

    if (professional) {
      if (professional.role !== undefined) {
        updateData["professional.role"] = professional.role;
      }
      if (professional.department !== undefined) {
        updateData["professional.department"] = professional.department;
      }
      if (professional.title !== undefined) {
        updateData["professional.title"] = professional.title;
      }
    }

    // Perform update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -__v");

    logger.info("[SuperadminUserDetail] User updated", {
      userId: id,
      updatedFields: Object.keys(updateData),
      updatedBy: session.username,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    logger.error("[SuperadminUserDetail] PATCH error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/users/[id]
 * Soft delete a user (marks as deleted, doesn't remove from DB)
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
    // eslint-disable-next-line local/require-lean -- SUPER_ADMIN: checking user existence before delete, need full doc for isSuperAdmin check
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting super admins (except by themselves - currently we can't verify identity by ID)
    // Since we only have username in session, we log a warning if attempting to delete a superadmin
    if (existingUser.isSuperAdmin) {
      logger.warn("[SuperadminUserDetail] Attempt to delete superadmin account", {
        targetUserId: id,
        requestedBy: session.username,
      });
      return NextResponse.json(
        { error: "Cannot delete super admin accounts via this endpoint" },
        { status: 403 }
      );
    }

    // Soft delete - mark as deleted
    await User.findByIdAndUpdate(id, {
      $set: {
        status: "DELETED",
        deletedAt: new Date(),
        deletedBy: session.username,
      },
    });

    logger.info("[SuperadminUserDetail] User deleted", {
      userId: id,
      deletedBy: session.username,
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("[SuperadminUserDetail] DELETE error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
