import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

/**
 * GET /api/public/footer/:page
 * Public endpoint to fetch footer content by page (about, privacy, terms)
 * Returns content in both EN and AR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { page: string } },
) {
  try {
    // Rate limiting: 60 req/min per IP for public content
    const clientIp = getClientIP(request);
    const rl = await smartRateLimit(`/api/public/footer:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();

    const { page } = params;

    // Validate page parameter
    if (!["about", "privacy", "terms"].includes(page)) {
      return NextResponse.json(
        { error: "Invalid page. Must be one of: about, privacy, terms" },
        { status: 400 },
      );
    }

    // Find footer content for this page
    const { FooterContent } = await import("@/server/models/FooterContent");
    // PLATFORM-WIDE: Public content shared across all tenants
    const footerContent = (await FooterContent.findOne({ page })
      .lean()
      .exec()) as {
      page: string;
      contentEn: string;
      contentAr: string;
      updatedAt: Date;
    } | null;

    if (!footerContent) {
      // Return default empty content if not found
      return NextResponse.json({
        page,
        contentEn: "",
        contentAr: "",
        updatedAt: null,
      });
    }

    // Return public-safe data
    return NextResponse.json({
      page: footerContent.page,
      contentEn: footerContent.contentEn,
      contentAr: footerContent.contentAr,
      updatedAt: footerContent.updatedAt,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    logger.error(`[GET /api/public/footer/${params.page}] Error`, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch footer content" },
      { status: 500 },
    );
  }
}
