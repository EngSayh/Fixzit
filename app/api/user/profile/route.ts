import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";

import { logger } from "@/lib/logger";
/**
 * Type for user document returned from DB
 */
type UserProfileDocument = {
  id: string;
  name?: string;
  firstName?: string;
  email: string;
  phone?: string;
  role?: string;
  image?: string;
  avatar?: string;
  orgId?: string | null;
  preferences?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Normalize user profile data for API response
 */
function normalizeUserProfile(user: UserProfileDocument) {
  return {
    id: user.id,
    name: user.name || user.firstName || "User",
    email: user.email,
    phone: user.phone || "",
    role: user.role || "USER",
    avatar: user.image || user.avatar || "",
    orgId: user.orgId || null,
    preferences: user.preferences || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * GET /api/user/profile - Fetch current user's profile
 * @returns User profile data or 401 if not authenticated
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Fetch user by email from session, scoped by orgId if available
    // SECURITY FIX: Scope by orgId to ensure tenant isolation (SEC-001)
    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    const query = sessionOrgId
      ? { orgId: sessionOrgId, email: session.user.email }
      : { email: session.user.email }; // Fallback for sessions without orgId
    const user = (await User.findOne(query)
      .select("-password -__v") // Exclude sensitive fields
      .lean()) as unknown as UserProfileDocument | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: normalizeUserProfile(user),
    });
  } catch (error) {
    logger.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile data" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/profile - Update current user's profile
 * @param request - Contains profile updates in body
 * @returns Updated user profile or error
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Guard: preferences updates should use dedicated endpoint
    if (body.preferences !== undefined) {
      return NextResponse.json(
        {
          error: "Cannot update preferences through this endpoint",
          message: "Please use /api/user/preferences for preference updates",
        },
        { status: 400 },
      );
    }

    const allowedFields = ["name", "phone", "avatar"];

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Connect to database
    await connectToDatabase();

    // Update user, scoped by orgId if available
    // SECURITY FIX: Scope by orgId to ensure tenant isolation (SEC-001)
    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    const query = sessionOrgId
      ? { orgId: sessionOrgId, email: session.user.email }
      : { email: session.user.email }; // Fallback for sessions without orgId
    const user = (await User.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true, select: "-password -__v" },
    ).lean()) as unknown as UserProfileDocument | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: normalizeUserProfile(user),
    });
  } catch (error) {
    logger.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
