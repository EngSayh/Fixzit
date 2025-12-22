/**
 * @description Manages footer content for static pages (About, Privacy, Terms).
 * GET retrieves footer content for a specific page in both EN and AR.
 * POST updates footer content with bilingual support.
 * @route GET /api/admin/footer
 * @route POST /api/admin/footer
 * @access Private - SUPER_ADMIN only
 * @param {Object} body - page (about|privacy|terms), contentEn, contentAr
 * @returns {Object} footer: { page, contentEn, contentAr, updatedAt }
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {400} If page type is invalid
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { FooterContent } from "@/server/models/FooterContent";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

interface FooterDocument {
  page: string;
  contentEn: string;
  contentAr: string;
  updatedAt: Date | null;
  updatedBy?: string | null;
  [key: string]: unknown;
}
export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute for admin operations
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-footer:post",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authentication & Authorization
    const user = await getSessionUser(request);

    // SUPER_ADMIN only
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - SUPER_ADMIN access required" },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const { data: body, error: parseError } = await parseBodySafe<{
      page?: string;
      contentEn?: string;
      contentAr?: string;
    }>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }
    const { page, contentEn, contentAr } = body;

    // Validation
    if (!page || !["about", "privacy", "terms"].includes(page)) {
      return NextResponse.json(
        { error: "Invalid page. Must be one of: about, privacy, terms" },
        { status: 400 },
      );
    }

    if (typeof contentEn !== "string" || typeof contentAr !== "string") {
      return NextResponse.json(
        { error: "Both contentEn and contentAr must be strings" },
        { status: 400 },
      );
    }

    // Upsert footer content (create if not exists, update if exists)
    // eslint-disable-next-line local/require-tenant-scope -- Footer content is platform-wide (about, privacy, terms)
    const footerContent = await FooterContent.findOneAndUpdate(
      { page },
      {
        $set: {
          page,
          contentEn,
          contentAr,
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    const footerTyped = footerContent as unknown as FooterDocument;
    return NextResponse.json({
      success: true,
      data: {
        page: footerTyped.page,
        contentEn: footerTyped.contentEn,
        contentAr: footerTyped.contentAr,
        updatedAt: footerTyped.updatedAt,
        updatedBy: footerTyped.updatedBy ?? null,
      },
    });
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes("No valid token")) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 },
      );
    }

    logger.error("[POST /api/admin/footer] Error", error as Error);
    return NextResponse.json(
      { error: "Failed to update footer content" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/footer?page=about
 * Super Admin only endpoint to fetch footer content for editing
 * Query: page (optional, returns all if not specified)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const user = await getSessionUser(request);

    // SUPER_ADMIN only
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - SUPER_ADMIN access required" },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");

    if (page) {
      // Get specific page
      if (!["about", "privacy", "terms"].includes(page)) {
        return NextResponse.json(
          { error: "Invalid page. Must be one of: about, privacy, terms" },
          { status: 400 },
        );
      }

      // eslint-disable-next-line local/require-tenant-scope -- Footer content is platform-wide (about, privacy, terms)
      const footerContent = await FooterContent.findOne({ page }).lean();

      if (!footerContent) {
        // Return default empty content
        return NextResponse.json({
          page,
          contentEn: "",
          contentAr: "",
          updatedAt: null,
          updatedBy: null,
        });
      }

      return NextResponse.json(footerContent);
    }

    // Get all footer pages
    // eslint-disable-next-line local/require-tenant-scope -- Footer content is platform-wide (about, privacy, terms)
    const allContent = (await FooterContent.find(
      {},
    ).lean()) as unknown as FooterDocument[];

    // Ensure all three pages exist (return defaults if missing)
    const pages = ["about", "privacy", "terms"];
    const result = pages.map((p: string) => {
      const existing = allContent.find((c) => c.page === p);
      return (
        existing || {
          page: p,
          contentEn: "",
          contentAr: "",
          updatedAt: null,
          updatedBy: null,
        }
      );
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes("No valid token")) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 },
      );
    }

    logger.error("[GET /api/admin/footer] Error", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch footer content" },
      { status: 500 },
    );
  }
}
