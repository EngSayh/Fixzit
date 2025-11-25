import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
/**
 * @openapi
 * /api/organization/settings:
 *   get:
 *     summary: Get organization settings (public)
 *     description: Retrieves public organization settings including logo, name, and branding
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
export async function GET() {
  try {
    await connectDb();

    // Get the first active organization (or you can get by orgId from session)
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
    const org = (await Organization.findOne({
      /* isActive: true */
    })
      .select("name logo branding")
      .lean()) as unknown as OrgDoc | null;

    if (!org) {
      // Return default settings if no organization found
      return NextResponse.json({
        name: "FIXZIT ENTERPRISE",
        logo: "/img/fixzit-logo.png",
        primaryColor: "#B46B2F",
        secondaryColor: "#D68B4A",
      });
    }

    const orgDoc = org as {
      name?: string;
      logo?: string;
      branding?: { primaryColor?: string; secondaryColor?: string };
    };

    return NextResponse.json({
      name: orgDoc?.name || "FIXZIT ENTERPRISE",
      logo: orgDoc?.logo || "/img/fixzit-logo.png",
      primaryColor: orgDoc?.branding?.primaryColor || "#B46B2F",
      secondaryColor: orgDoc?.branding?.secondaryColor || "#D68B4A",
    });
  } catch (error) {
    logger.error("Error fetching organization settings:", error);
    // Return default settings on error
    return NextResponse.json({
      name: "FIXZIT ENTERPRISE",
      logo: "/img/fixzit-logo.png",
      primaryColor: "#B46B2F",
      secondaryColor: "#D68B4A",
    });
  }
}
