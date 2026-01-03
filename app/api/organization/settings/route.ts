/**
 * @fileoverview Organization Settings API
 * @description Retrieves and manages organization branding and configuration settings including logo, name, and color scheme.
 * @route GET /api/organization/settings - Get organization branding settings
 * @access Public (defaults) / Authenticated (org-specific)
 * @module organization
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { createHash } from "crypto";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { BRAND_COLORS } from "@/lib/config/brand-colors";

// Default branding for unauthenticated or fallback scenarios
// Colors aligned with centralized BRAND_COLORS
const DEFAULT_BRANDING = {
  name: "FIXZIT ENTERPRISE",
  logo: "/img/fixzit-logo.png",
  primaryColor: BRAND_COLORS.primary,
  secondaryColor: BRAND_COLORS.success,
  accentColor: BRAND_COLORS.success,
};

const CACHE_TTL_MS = 60_000;
type CachedBranding = { payload: Record<string, unknown>; etag: string; expires: number };
const brandingCache = new Map<string, CachedBranding>();

/**
 * @openapi
 * /api/organization/settings:
 *   get:
 *     summary: Get organization settings (public branding)
 *     description: Retrieves public organization settings including logo, name, and branding. Uses authenticated user's org when available, otherwise returns defaults.
 *     tags:
 *       - Organization
 *     responses:
 *       200:
 *         description: Organization settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 logo:
 *                   type: string
 *                 primaryColor:
 *                   type: string
 *                 secondaryColor:
 *                   type: string
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "org:settings" });

  try {
    await connectDb();

    // SECURITY FIX: Get org from authenticated session, not arbitrary first org
    let orgId: string | undefined;
    try {
      const user = await getSessionUser(request);
      orgId = user.orgId;
    } catch {
      // Unauthenticated - return default branding
      const res = NextResponse.json(DEFAULT_BRANDING);
      const etag = createHash("md5")
        .update(JSON.stringify(DEFAULT_BRANDING))
        .digest("hex");
      res.headers.set("ETag", etag);
      res.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=60",
      );
      return res;
    }

    if (!orgId) {
      // No org context - return default branding
      const res = NextResponse.json(DEFAULT_BRANDING);
      const etag = createHash("md5")
        .update(JSON.stringify(DEFAULT_BRANDING))
        .digest("hex");
      res.headers.set("ETag", etag);
      res.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=60",
      );
      return res;
    }

    const cached = brandingCache.get(orgId);
    if (cached && cached.expires > Date.now()) {
      const res = NextResponse.json(cached.payload);
      res.headers.set("ETag", cached.etag);
      res.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=60",
      );
      return res;
    }

    // Get the user's organization
    const { Organization } = await import("@/server/models/Organization");
    type OrgDoc = {
      name?: string;
      logo?: string;
      branding?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
      };
    };
    const org = (await Organization.findById(orgId)
      .select("name logo branding")
      .lean()) as unknown as OrgDoc | null;

    if (!org) {
      // No org found - return default branding
      const res = NextResponse.json(DEFAULT_BRANDING);
      const etag = createHash("md5")
        .update(JSON.stringify(DEFAULT_BRANDING))
        .digest("hex");
      res.headers.set("ETag", etag);
      res.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=60",
      );
      return res;
    }

    const orgDoc = org as {
      name?: string;
      logo?: string;
      branding?: { primaryColor?: string; secondaryColor?: string; accentColor?: string };
    };

    const payload = {
      name: orgDoc?.name || DEFAULT_BRANDING.name,
      logo: orgDoc?.logo || DEFAULT_BRANDING.logo,
      primaryColor: orgDoc?.branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: orgDoc?.branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      accentColor: orgDoc?.branding?.accentColor || DEFAULT_BRANDING.accentColor,
    };

    const res = NextResponse.json(payload);
    const etag = createHash("md5").update(JSON.stringify(payload)).digest("hex");
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    brandingCache.set(orgId, {
      payload,
      etag,
      expires: Date.now() + CACHE_TTL_MS,
    });
    return res;
  } catch (error) {
    logger.error("Error fetching organization settings:", error);
    return NextResponse.json(
      { error: "Failed to load organization settings" },
      { status: 500 },
    );
  }
}
