import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

/**
 * GET /api/settings/logo
 * Public endpoint to fetch platform logo URL
 * Returns the current logo URL or null if not set
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request).catch(() => null);
    await connectToDatabase();

    // Prefer authenticated org; fall back to configured default
    const orgId = sessionUser?.orgId || process.env.NEXT_PUBLIC_ORG_ID || "fixzit-platform";

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
