/**
 * @description Manages product brands in Souq marketplace.
 * GET lists all active brands (platform-wide catalog, not tenant-specific).
 * POST creates new brand (admin only). Brands control seller authorization.
 * @route GET /api/souq/brands - List all active brands
 * @route POST /api/souq/brands - Create new brand (admin)
 * @access GET: Public | POST: Admin only
 * @param {Object} body.name - Brand name (English)
 * @param {Object} body.name_ar - Brand name (Arabic)
 * @param {Object} body.slug - URL-friendly slug
 * @param {Object} body.logo - Brand logo URL
 * @returns {Object} GET: brands array | POST: created brand
 * @throws {401} If not authenticated (POST)
 * @throws {403} If not admin (POST)
 */
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { auth } from "@/auth";
import Brand from "@/server/models/souq/Brand";
import { connectToDatabase } from "@/lib/mongodb-unified";

/**
 * GET /api/souq/brands - List all brands
 * 
 * NOTE: Brands are PLATFORM-WIDE resources shared across all tenants.
 * This is intentional - brands (Nike, Samsung, etc.) are not tenant-specific.
 * The Brand model does NOT use tenantIsolationPlugin by design.
 * 
 * Authorization is handled via brand gating (authorizedSellers) for who can SELL,
 * but all users can VIEW the brand catalog.
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 120 requests per minute per IP for brand catalog reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-brands:list",
    requests: 120,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectToDatabase();

    const brands = await Brand.find({ isActive: true })
      .select("name name_ar slug logo isVerified")
      .sort({ name: 1 })
      .lean();

    // Cache for 5 minutes, stale-while-revalidate for 10 minutes
    const response = NextResponse.json({
      success: true,
      data: brands,
      total: brands.length,
    });
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return response;
  } catch (error) {
    logger.error("GET /api/souq/brands error:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch brands" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/souq/brands - Create new brand (Admin only)
 */
export async function POST(request: Request) {
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

    const { data: body, error: parseError } = await parseBodySafe<{ name?: string; name_ar?: string; slug?: string; logo?: string }>(request, { logPrefix: "[Souq Brands]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name, name_ar, slug, logo } = body ?? {};

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 },
      );
    }

    const existingSlug = await Brand.findOne({ slug }).lean();
    if (existingSlug) {
      return NextResponse.json(
        { error: "Brand slug already exists" },
        { status: 409 },
      );
    }

    const brand = await Brand.create({
      name,
      name_ar,
      slug,
      logo,
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: brand,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/souq/brands error:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to create brand" },
      { status: 500 },
    );
  }
}
