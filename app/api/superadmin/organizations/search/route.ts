/**
 * @fileoverview Superadmin Organization Search API
 * @description GET endpoint for searching organizations by name
 * @route GET /api/superadmin/organizations/search?q=query
 * @access Superadmin only
 * @module api/superadmin/organizations/search
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// Organization model stub (assumes Organization collection exists)
// Adjust schema based on actual Organization model
const OrganizationSchema = new mongoose.Schema({
  _id: String,
  name: String,
  slug: String,
  status: String,
  createdAt: Date,
});

const Organization = mongoose.models.Organization || mongoose.model("Organization", OrganizationSchema);

/**
 * GET /api/superadmin/organizations/search
 * Search organizations by name (case-insensitive, partial match)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required (use ?q=...)" },
        { status: 400 }
      );
    }

    // Search organizations by name (case-insensitive)
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-org search
    const organizations = await Organization.find(
      {
        name: { $regex: query, $options: "i" },
        status: { $ne: "deleted" }, // Exclude deleted orgs
      },
      { _id: 1, name: 1, slug: 1 }
    )
      .limit(20)
      .lean();

    logger.info("Superadmin organization search", {
      username: session.username,
      query,
      resultsCount: organizations.length,
    });

    return NextResponse.json({
      success: true,
      organizations: organizations.map((org) => ({
        id: org._id,
        name: org.name,
        slug: (org as { slug?: string }).slug || null,
      })),
    });
  } catch (error) {
    logger.error("Failed to search organizations", { error });
    return NextResponse.json(
      { error: "Failed to search organizations" },
      { status: 500 }
    );
  }
}
