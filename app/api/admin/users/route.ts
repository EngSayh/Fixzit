/**
 * @description Manages platform users with pagination and filtering.
 * GET lists users with role, status, and organization filters.
 * POST creates new users with password hashing and role assignment.
 * @route GET /api/admin/users
 * @route POST /api/admin/users
 * @access Private - SUPER_ADMIN only
 * @param {string} role - Filter by user role
 * @param {string} status - Filter by user status (active, suspended, pending)
 * @param {string} orgId - Filter by organization
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @returns {Object} users: array, total: number, page: number, pages: number
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDb } from "@/lib/mongo";
import { Schema, model, models } from "mongoose";
import bcrypt from "bcryptjs";

import { logger } from "@/lib/logger";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is Super Admin
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 },
      );
    }

    await connectDb();

    // Get query parameters
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");

    // Parse and validate pagination
    let limit = parseInt(searchParams.get("limit") || "50", 10);
    let skip = parseInt(searchParams.get("skip") || "0", 10);

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 50;
    }
    if (!Number.isInteger(skip) || skip < 0) {
      skip = 0;
    }
    limit = Math.min(limit, 1000);
    skip = Math.min(skip, 100000);

    // Simple User schema (reuse existing or define minimal inline)
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
          locked: Boolean,
        },
        status: String,
        createdAt: Date,
        updatedAt: Date,
      },
      { collection: "users" },
    );

    const UserModel = models.User || model("User", UserSchema);

    // SEC-001: Validate orgId exists for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
      return NextResponse.json(
        { error: "Unauthorized: Invalid organization context" },
        { status: 403 }
      );
    }

    // Build query
    // 🔒 TYPE SAFETY: Using Record<string, unknown> for MongoDB query
    const query: Record<string, unknown> = {
      orgId,  // ✅ Validated above
    };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { email: { $regex: escapedSearch, $options: "i" } },
        { username: { $regex: escapedSearch, $options: "i" } },
        { "personal.firstName": { $regex: escapedSearch, $options: "i" } },
        { "personal.lastName": { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (role) {
      query["professional.role"] = role;
    }

    const users = await UserModel.find(query)
      .select(
        "code username email phone personal professional security status createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await UserModel.countDocuments(query);

    return NextResponse.json({ users, total });
  } catch (error) {
    logger.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/users
 *
 * Create a new user (Super Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

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

    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.username) {
      return NextResponse.json(
        { error: "Email and username are required" },
        { status: 400 },
      );
    }

    const UserSchema = new Schema(
      {
        orgId: String,
        code: String,
        username: String,
        email: String,
        password: String,
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
        createdAt: Date,
        updatedAt: Date,
      },
      { collection: "users" },
    );

    const UserModel = models.User || model("User", UserSchema);

    // SEC-001: Validate orgId exists for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
      return NextResponse.json(
        { error: "Unauthorized: Invalid organization context" },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existing = await UserModel.findOne({
      orgId,  // ✅ Validated above
      $or: [{ email: body.email }, { username: body.username }],
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 409 },
      );
    }

    // SECURITY: Hash passwords before storing; password is required and no defaults are allowed
    if (!body.password) {
      return NextResponse.json(
        {
          error: "Password required",
          detail:
            "Password must be provided in request body for security. No default passwords allowed.",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 12); // 12 rounds = industry standard

    const newUser = await UserModel.create({
      orgId,  // ✅ Already validated above
      code: body.code || `USER-${crypto.randomUUID()}`, // SECURITY: Use crypto instead of Date.now()
      username: body.username,
      email: body.email,
      password: hashedPassword, // FIXED: Now properly hashed
      phone: body.phone,
      personal: {
        firstName: body.firstName,
        lastName: body.lastName,
      },
      professional: {
        role: body.role || "user",
        title: body.title,
        department: body.department,
      },
      security: {
        accessLevel: body.accessLevel || "READ",
        permissions: body.permissions || [],
        locked: false,
      },
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
