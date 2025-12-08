import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

// Default branding for unauthenticated or fallback scenarios
const DEFAULT_BRANDING = {
  name: "FIXZIT ENTERPRISE",
  logo: "/img/fixzit-logo.png",
  primaryColor: "#0061A8", // Business.sa primary blue
  secondaryColor: "#1a365d", // Business.sa dark blue
};

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
export async function GET(req: NextRequest) {
  try {
    await connectDb();

    // SECURITY FIX: Get org from authenticated session, not arbitrary first org
    let orgId: string | undefined;
    try {
      const user = await getSessionUser(req);
      orgId = user.orgId;
    } catch {
      // Unauthenticated - return default branding
      return NextResponse.json(DEFAULT_BRANDING);
    }

    if (!orgId) {
      // No org context - return default branding
      return NextResponse.json(DEFAULT_BRANDING);
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
      return NextResponse.json(DEFAULT_BRANDING);
    }

    const orgDoc = org as {
      name?: string;
      logo?: string;
      branding?: { primaryColor?: string; secondaryColor?: string };
    };

    return NextResponse.json({
      name: orgDoc?.name || DEFAULT_BRANDING.name,
      logo: orgDoc?.logo || DEFAULT_BRANDING.logo,
      primaryColor: orgDoc?.branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: orgDoc?.branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    });
  } catch (error) {
    logger.error("Error fetching organization settings:", error);
    // Return default settings on error
    return NextResponse.json(DEFAULT_BRANDING);
  }
}
