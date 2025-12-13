/**
 * @description Manages individual user accounts by ID.
 * GET retrieves user details, PUT updates user profile, DELETE removes user.
 * Supports role updates, status changes, and organization reassignment.
 * @route GET /api/admin/users/[id]
 * @route PUT /api/admin/users/[id]
 * @route DELETE /api/admin/users/[id]
 * @access Private - SUPER_ADMIN only
 * @param {string} id - User ID (MongoDB ObjectId)
 * @returns {Object} user: { id, email, name, role, status, orgId }
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {404} If user not found
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDb } from "@/lib/mongo";
import { Schema, model, models, Types } from "mongoose";
import { logger } from "@/lib/logger";
import type { Session } from "next-auth";
import {
  buildOrgAwareRateLimitKey,
  smartRateLimit,
} from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { parseBodySafe } from "@/lib/api/parse-body";

const ADMIN_USER_DETAIL_LIMIT = 20;

const enforceAdminUserDetailRateLimit = async (
  req: NextRequest,
  session: Session | null,
  action: "delete" | "update",
) => {
  const sessionUser = session?.user as { id?: string; orgId?: string } | undefined;
  const key = buildOrgAwareRateLimitKey(
    req,
    sessionUser?.orgId ?? null,
    sessionUser?.id ?? null,
  );
  const rl = await smartRateLimit(
    `${key}:admin-users:${action}`,
    ADMIN_USER_DETAIL_LIMIT,
    60_000,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }
  return null;
};
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = (await auth()) as Session | null;
    const rateLimited = await enforceAdminUserDetailRateLimit(
      request,
      session,
      "delete",
    );
    if (rateLimited) return rateLimited;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const UserSchema =
      (models.User && models.User.schema) ||
      new Schema(
        {
          orgId: String,
          code: String,
          username: String,
          email: String,
        },
        { collection: "users" },
      );
    const UserModel =
      models.User ||
      model("User", UserSchema); // lightweight schema to avoid full model import overhead

    // SEC-001: Validate orgId exists for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
      return NextResponse.json(
        { error: "Unauthorized: Invalid organization context" },
        { status: 403 }
      );
    }

    const user = await UserModel.findOne({
      _id: new Types.ObjectId(id),
      orgId, // ✅ Validated orgId
    }).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // DEFENSE-IN-DEPTH: Include orgId in delete filter (per CodeRabbit review)
    await UserModel.deleteOne({ _id: new Types.ObjectId(id), orgId });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 *
 * Update a user by ID (Super Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = (await auth()) as Session | null;
    const rateLimited = await enforceAdminUserDetailRateLimit(
      request,
      session,
      "update",
    );
    if (rateLimited) return rateLimited;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }

    const UserSchema = new Schema(
      {
        orgId: String,
        code: String,
        username: String,
        email: String,
        phone: String,
        personal: {
          firstName: String,
          lastName: String,
        },
        professional: {
          role: String,
          title: String,
          department: String,
        },
        security: {
          accessLevel: String,
          permissions: [String],
          locked: Boolean,
        },
        status: String,
        updatedAt: Date,
      },
      { collection: "users" },
    );

    const UserModel =
      models.User ||
      model("User", UserSchema); // lightweight schema to avoid full model import overhead

    // SEC-001: Validate orgId exists for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
      return NextResponse.json(
        { error: "Unauthorized: Invalid organization context" },
        { status: 403 }
      );
    }

    const user = await UserModel.findOne({
      _id: new Types.ObjectId(id),
      orgId, // ✅ Validated orgId
    }).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update allowed fields
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.email) updates.email = body.email;
    if (body.username) updates.username = body.username;
    if (body.phone) updates.phone = body.phone;
    if (body.firstName || body.lastName) {
      updates["personal.firstName"] = body.firstName;
      updates["personal.lastName"] = body.lastName;
    }
    if (body.role) updates["professional.role"] = body.role;
    if (body.title) updates["professional.title"] = body.title;
    if (body.department) updates["professional.department"] = body.department;
    if (body.accessLevel) updates["security.accessLevel"] = body.accessLevel;
    if (body.status) updates.status = body.status;

    // SECURITY: Include orgId in update filter to prevent cross-tenant updates (TOCTOU protection)
    await UserModel.updateOne(
      { _id: new Types.ObjectId(id), orgId },
      { $set: updates },
    );

    // SECURITY: Use org-scoped query for returning updated user
    const updatedUser = await UserModel.findOne(
      { _id: new Types.ObjectId(id), orgId },
    ).lean();

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    logger.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
