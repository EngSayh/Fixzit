/**
 * @description Manages product categories in Souq marketplace.
 * GET lists all active categories with hierarchy (platform-wide catalog).
 * POST creates new category (admin only).
 * Categories support multi-level parent-child relationships.
 * @route GET /api/souq/categories - List categories with hierarchy
 * @route POST /api/souq/categories - Create new category (admin)
 * @access GET: Public | POST: Admin only
 * @param {Object} body.name - Category name (English)
 * @param {Object} body.name_ar - Category name (Arabic)
 * @param {Object} body.parentId - Optional parent category ID
 * @returns {Object} GET: categories array | POST: created category
 * @throws {401} If not authenticated (POST)
 * @throws {403} If not admin (POST)
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@/auth";
import Category from "@/server/models/souq/Category";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/souq/categories - List all categories with hierarchy
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 120 requests per minute per IP for category listing
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-categories:list",
    requests: 120,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectToDatabase();

    // PLATFORM-WIDE DATA: Categories are shared across all tenants by design.
    // This is a read-only catalog that all sellers can access.
    const categories = await Category.find({ isActive: true })
      .select("name name_ar slug parentId level imageUrl")
      .sort({ level: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    logger.error("GET /api/souq/categories error:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/souq/categories - Create new category (Admin only)
 */
export async function POST(request: Request) {
  // Rate limiting: 20 requests per minute per IP for category creation
  const rateLimitResponse = enforceRateLimit(request as NextRequest, {
    keyPrefix: "souq-categories:create",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    // 🔒 SECURITY FIX: Include CORPORATE_ADMIN per 14-role matrix
    if (!["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { name, name_ar, slug, parentId, level } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 },
      );
    }

    const existingSlug = await Category.findOne({ slug });
    if (existingSlug) {
      return NextResponse.json(
        { error: "Category slug already exists" },
        { status: 409 },
      );
    }

    const category = await Category.create({
      name,
      name_ar,
      slug,
      parentId: parentId || null,
      level: level ?? 1,
      isActive: true,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: category,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/souq/categories error:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 },
    );
  }
}
