/**
 * @description Manages testing/demo user accounts for QA and staging.
 * GET lists testing users with filtering by status, org, and search.
 * POST creates new testing user with specified role and credentials.
 * @route GET /api/admin/testing-users
 * @route POST /api/admin/testing-users
 * @access Private - SUPER_ADMIN only
 * @param {string} status - Filter by status
 * @param {string} orgId - Filter by organization
 * @param {string} search - Search by email or username
 * @param {number} limit - Items per page (default: 50, max: 200)
 * @param {number} skip - Skip for pagination
 * @returns {Object} users: array, total: number
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { TestingUser, TestingUserStatus, TestingUserRole, TTestingUserRole, TTestingUserStatus } from "@/server/models/TestingUser";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute for admin reads
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

    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as TTestingUserStatus | null;
    const orgId = searchParams.get("orgId");
    const search = searchParams.get("search");

    let limit = parseInt(searchParams.get("limit") || "50", 10);
    let skip = parseInt(searchParams.get("skip") || "0", 10);

    limit = Math.min(Math.max(1, limit), 200);
    skip = Math.max(0, skip);

    // Build query
    const query: Record<string, unknown> = {};

    if (status && TestingUserStatus.includes(status)) {
      query.status = status;
    }
    if (orgId) {
      query.orgId = orgId;
    }
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch users (exclude password hash)
    const [users, total] = await Promise.all([
      TestingUser.find(query)
        .select("-passwordHash -loginHistory")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TestingUser.countDocuments(query),
    ]);

    // Get counts by status (AUDIT-2025-12-19: Added maxTimeMS)
    const statusCounts = await TestingUser.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ], { maxTimeMS: 10_000 });

    const counts: Record<string, number> = {};
    for (const s of TestingUserStatus) {
      counts[s] = 0;
    }
    for (const item of statusCounts) {
      counts[item._id] = item.count;
    }

    return NextResponse.json({
      users,
      total,
      limit,
      skip,
      hasMore: skip + users.length < total,
      statusCounts: counts,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin Testing Users] GET failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/testing-users
 *
 * Create a new testing user (Super Admin only)
 */
const CreateTestingUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/i),
  displayName: z.string().min(1).max(100),
  role: z.enum(TestingUserRole as unknown as [string, ...string[]]) as z.ZodType<TTestingUserRole>,
  password: z.string().min(12).optional(), // Auto-generate if not provided
  purpose: z.string().min(10).max(500),
  orgId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  allowedIPs: z.array(z.string()).optional(),
  allowedEnvironments: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
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

    await connectToDatabase();

    const { data: body, error: parseError } = await parseBodySafe<z.infer<typeof CreateTestingUserSchema>>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }
    const parsed = CreateTestingUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if email or username already exists
    // PLATFORM-WIDE: Testing users are managed at platform level, not tenant-scoped
    // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE
    const existing = await TestingUser.findOne({
      $or: [
        { email: data.email.toLowerCase() },
        { username: data.username.toLowerCase() },
      ],
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "Email or username already exists" },
        { status: 409 }
      );
    }

    // Generate password if not provided
    const password = data.password || TestingUser.generateSecurePassword();

    const testingUser = await TestingUser.createTestingUser({
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      role: data.role,
      password,
      purpose: data.purpose,
      createdBy: session.user.email || session.user.id,
      orgId: data.orgId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      allowedIPs: data.allowedIPs,
      allowedEnvironments: data.allowedEnvironments,
      notes: data.notes,
    });

    logger.info("[Admin Testing Users] Created", {
      userId: testingUser._id.toString(),
      email: testingUser.email,
      role: testingUser.role,
      by: session.user.email,
    });

    // Return user with temporary password (only shown once)
    return NextResponse.json({
      success: true,
      user: {
        _id: testingUser._id.toString(),
        email: testingUser.email,
        username: testingUser.username,
        displayName: testingUser.displayName,
        role: testingUser.role,
        status: testingUser.status,
        purpose: testingUser.purpose,
        createdAt: testingUser.createdAt,
      },
      // Only return password if it was auto-generated
      temporaryPassword: !data.password ? password : undefined,
      message: !data.password
        ? "Save this password - it will not be shown again"
        : "User created with provided password",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin Testing Users] POST failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
