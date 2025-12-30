/**
 * @fileoverview Superadmin Content Policies API
 * @description Content policies (privacy, terms, about) management
 * @route GET /api/superadmin/content/policies
 * @route POST /api/superadmin/content/policies
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/policies
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { FooterContent } from "@/server/models/FooterContent";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

// Platform org ID for superadmin content
const PLATFORM_ORG_ID = "1";

/**
 * GET /api/superadmin/content/policies
 * List all content policies
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-policies:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Get all footer content (policies)
    const policies = await FooterContent.find({ orgId: PLATFORM_ORG_ID })
      .sort({ page: 1 })
      .lean();

    // Transform to expected format for the UI
    const formattedPolicies = policies.map((p) => ({
      _id: p._id,
      slug: `${p.page}-policy`,
      title: p.page === "privacy" ? "Privacy Policy" : 
             p.page === "terms" ? "Terms of Service" : "About Us",
      titleAr: p.page === "privacy" ? "سياسة الخصوصية" :
               p.page === "terms" ? "شروط الخدمة" : "من نحن",
      content: p.contentEn,
      contentAr: p.contentAr,
      type: p.page,
      isPublished: true,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json(
      { policies: formattedPolicies },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Content:Policies] Failed to load policies", { error });
    return NextResponse.json(
      { error: "Failed to load policies" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/content/policies
 * Create or update a policy
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-policies:post",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      type?: string;
      content?: string;
      contentAr?: string;
    }>(request, { logPrefix: "[superadmin:content:policies]" });

    if (parseError || !body?.type || !body?.content || !body?.contentAr) {
      return NextResponse.json(
        { error: "Invalid request body - type, content, contentAr required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validTypes = ["privacy", "terms", "about"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: "Invalid policy type. Must be: privacy, terms, or about" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Upsert the policy
    const policy = await FooterContent.findOneAndUpdate(
      { orgId: PLATFORM_ORG_ID, page: body.type },
      {
        orgId: PLATFORM_ORG_ID,
        page: body.type,
        contentEn: body.content,
        contentAr: body.contentAr,
      },
      { upsert: true, new: true }
    ).lean();

    logger.info("[Superadmin:Content:Policies] Policy updated", {
      type: body.type,
      by: session.username,
    });

    return NextResponse.json(
      { policy, message: "Policy saved successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Content:Policies] Failed to save policy", { error });
    return NextResponse.json(
      { error: "Failed to save policy" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
