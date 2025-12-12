/**
 * @description Manages individual testing user accounts by ID.
 * GET retrieves testing user details, PUT updates credentials/role, DELETE removes user.
 * Used for QA and staging environment user management.
 * @route GET /api/admin/testing-users/[id]
 * @route PUT /api/admin/testing-users/[id]
 * @route DELETE /api/admin/testing-users/[id]
 * @access Private - SUPER_ADMIN only
 * @param {string} id - Testing user ID (MongoDB ObjectId)
 * @returns {Object} user: { id, email, username, role, status }
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {404} If testing user not found
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { TestingUser, TestingUserStatus, TestingUserRole, TTestingUserRole, TTestingUserStatus } from "@/server/models/TestingUser";
import { logger } from "@/lib/logger";
import { z } from "zod";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

interface RouteParams {
  params: Promise<{ id: string }>;
}
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-testing-users:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await TestingUser.findById(id)
      .select("-passwordHash")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin Testing Users] GET by ID failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/testing-users/[id]
 *
 * Update a testing user (Super Admin only)
 */
const UpdateTestingUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  role: z.enum(TestingUserRole as unknown as [string, ...string[]]).optional() as z.ZodOptional<z.ZodType<TTestingUserRole>>,
  status: z.enum(TestingUserStatus as unknown as [string, ...string[]]).optional() as z.ZodOptional<z.ZodType<TTestingUserStatus>>,
  statusReason: z.string().max(500).optional(),
  purpose: z.string().min(10).max(500).optional(),
  orgId: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  allowedIPs: z.array(z.string()).optional(),
  allowedEnvironments: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional().nullable(),
  requirePasswordChange: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();

    const body = await request.json();
    const parsed = UpdateTestingUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const user = await TestingUser.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build update
    const update: Record<string, unknown> = {};

    if (data.displayName !== undefined) update.displayName = data.displayName;
    if (data.role !== undefined) update.role = data.role;
    if (data.purpose !== undefined) update.purpose = data.purpose;
    if (data.orgId !== undefined) update.orgId = data.orgId || undefined;
    if (data.expiresAt !== undefined) update.expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;
    if (data.allowedIPs !== undefined) update.allowedIPs = data.allowedIPs;
    if (data.allowedEnvironments !== undefined) update.allowedEnvironments = data.allowedEnvironments;
    if (data.notes !== undefined) update.notes = data.notes || undefined;
    if (data.requirePasswordChange !== undefined) update.requirePasswordChange = data.requirePasswordChange;

    // Handle status change
    if (data.status !== undefined && data.status !== user.status) {
      update.status = data.status;
      update.statusReason = data.statusReason || `Changed by ${session.user.email}`;
      update.statusChangedAt = new Date();
      update.statusChangedBy = session.user.email;
    }

    const updatedUser = await TestingUser.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).select("-passwordHash");

    logger.info("[Admin Testing Users] Updated", {
      userId: id,
      updates: Object.keys(update),
      by: session.user.email,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin Testing Users] PUT failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/testing-users/[id]
 *
 * Delete a testing user (Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await TestingUser.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await TestingUser.findByIdAndDelete(id);

    logger.info("[Admin Testing Users] Deleted", {
      userId: id,
      email: user.email,
      by: session.user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Testing user deleted",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin Testing Users] DELETE failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/testing-users/[id]
 *
 * Special actions on a testing user (Super Admin only)
 * Body:
 * - action: "reset-password" | "regenerate-password" | "enable" | "disable"
 */
const PatchActionSchema = z.object({
  action: z.enum(["reset-password", "regenerate-password", "enable", "disable"]),
  password: z.string().min(12).optional(), // For reset-password
});

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();

    const body = await request.json();
    const parsed = PatchActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, password } = parsed.data;

    const user = await TestingUser.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    switch (action) {
      case "reset-password": {
        if (!password) {
          return NextResponse.json(
            { error: "Password required for reset-password action" },
            { status: 400 }
          );
        }
        const passwordHash = await bcrypt.hash(password, 12);
        await TestingUser.findByIdAndUpdate(id, {
          passwordHash,
          passwordLastChanged: new Date(),
          requirePasswordChange: false,
        });

        logger.info("[Admin Testing Users] Password reset", {
          userId: id,
          by: session.user.email,
        });

        return NextResponse.json({
          success: true,
          message: "Password has been reset",
        });
      }

      case "regenerate-password": {
        const newPassword = TestingUser.generateSecurePassword();
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await TestingUser.findByIdAndUpdate(id, {
          passwordHash,
          passwordLastChanged: new Date(),
          requirePasswordChange: false,
        });

        logger.info("[Admin Testing Users] Password regenerated", {
          userId: id,
          by: session.user.email,
        });

        return NextResponse.json({
          success: true,
          temporaryPassword: newPassword,
          message: "Save this password - it will not be shown again",
        });
      }

      case "enable": {
        if (user.status === "ACTIVE") {
          return NextResponse.json(
            { error: "User is already active" },
            { status: 400 }
          );
        }

        await TestingUser.findByIdAndUpdate(id, {
          status: "ACTIVE",
          statusReason: `Enabled by ${session.user.email}`,
          statusChangedAt: new Date(),
          statusChangedBy: session.user.email || undefined,
        });

        logger.info("[Admin Testing Users] Enabled", {
          userId: id,
          by: session.user.email,
        });

        return NextResponse.json({
          success: true,
          message: "User has been enabled",
        });
      }

      case "disable": {
        if (user.status === "DISABLED") {
          return NextResponse.json(
            { error: "User is already disabled" },
            { status: 400 }
          );
        }

        await TestingUser.findByIdAndUpdate(id, {
          status: "DISABLED",
          statusReason: `Disabled by ${session.user.email}`,
          statusChangedAt: new Date(),
          statusChangedBy: session.user.email || undefined,
        });

        logger.info("[Admin Testing Users] Disabled", {
          userId: id,
          by: session.user.email,
        });

        return NextResponse.json({
          success: true,
          message: "User has been disabled",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin Testing Users] PATCH failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
