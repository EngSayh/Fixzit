/**
 * @fileoverview Platform Logo Settings API
 * @description Retrieves the platform logo URL and branding information for the current organization.
 * @route GET /api/settings/logo - Get platform logo and brand details
 * @access Public (returns defaults for unauthenticated requests)
 * @module settings
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { BRAND_COLORS } from "@/lib/config/brand-colors";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/settings/logo
 * Public endpoint to fetch platform logo URL
 * Returns the current logo URL or null if not set
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "settings:logo" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const sessionResult = await getSessionOrNull(request, { route: "settings:logo" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const sessionUser = sessionResult.session;
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
        brandColor: BRAND_COLORS.primary,
      });
    }

    return NextResponse.json({
      logoUrl: settings.logoUrl,
      brandName: settings.brandName || "Fixzit Enterprise",
      brandColor: settings.brandColor || BRAND_COLORS.primary,
    });
  } catch (error) {
    logger.error("[GET /api/settings/logo] Error", error as Error);
    // Return defaults on error (don't break the UI)
    return NextResponse.json({
      logoUrl: null,
      brandName: "Fixzit Enterprise",
      brandColor: BRAND_COLORS.primary,
    });
  }
}
