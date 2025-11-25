import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";

/**
 * GET /api/settings/logo
 * Public endpoint to fetch platform logo URL
 * Returns the current logo URL or null if not set
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get orgId from header (set by middleware) or use default
    const orgId =
      request.headers.get("x-org-id") ||
      process.env.NEXT_PUBLIC_ORG_ID ||
      "fixzit-platform";

    const { PlatformSettings } = await import(
      "@/server/models/PlatformSettings"
    );
    const settings = (await PlatformSettings.findOne({ orgId })
      .lean()
      .exec()) as {
      logoUrl: string;
      brandName: string;
      brandColor: string;
    } | null;

    if (!settings || !settings.logoUrl) {
      return NextResponse.json({
        logoUrl: null,
        brandName: "Fixzit Enterprise",
        brandColor: "#3b82f6",
      });
    }

    return NextResponse.json({
      logoUrl: settings.logoUrl,
      brandName: settings.brandName || "Fixzit Enterprise",
      brandColor: settings.brandColor || "#3b82f6",
    });
  } catch (error) {
    logger.error("[GET /api/settings/logo] Error", { error });
    // Return defaults on error (don't break the UI)
    return NextResponse.json({
      logoUrl: null,
      brandName: "Fixzit Enterprise",
      brandColor: "#3b82f6",
    });
  }
}
