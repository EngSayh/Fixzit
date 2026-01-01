/**
 * @fileoverview Superadmin Footer Links API
 * @description Manage footer navigation links by section
 * @route GET, POST /api/superadmin/content/footer-links
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/footer-links
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { FooterLink } from "@/server/models/FooterLink";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

// Safe URL schemes to prevent XSS via javascript:/data: URLs
const SAFE_URL_SCHEMES = ["http:", "https:"];

const FooterLinkSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  labelAr: z.string().trim().optional(),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .refine(
      (val) => {
        // Allow relative internal paths
        if (val.startsWith("/")) return true;
        // Validate external URLs have safe schemes only
        try {
          const url = new URL(val);
          return SAFE_URL_SCHEMES.includes(url.protocol);
        } catch {
          return false;
        }
      },
      { message: "URL must be a valid internal path or http/https URL" }
    ),
  section: z.enum(["company", "support", "legal", "social"]),
  icon: z.string().trim().optional(),
  isExternal: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

/**
 * GET /api/superadmin/content/footer-links
 * Retrieve all footer links, optionally filtered by section
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-links:get",
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

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    const filter: Record<string, unknown> = {};
    if (section && section !== "all") {
      filter.section = section;
    }

    const links = await FooterLink.find(filter)
      .sort({ section: 1, sortOrder: 1 })
      .lean();

    return NextResponse.json({ links }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:FooterLinks] Failed to fetch links", { error });
    return NextResponse.json(
      { error: "Failed to fetch footer links" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/content/footer-links
 * Create a new footer link
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-links:post",
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

    const { data: body, error: parseError } = await parseBodySafe(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = FooterLinkSchema.safeParse(body);
    if (!validation.success) {
      // Log details server-side, return generic message to client
      logger.warn("[Superadmin:FooterLinks] Validation failed", {
        issues: validation.error.issues,
      });
      return NextResponse.json(
        { error: "Invalid request data. Please check your inputs." },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const link = await FooterLink.create(validation.data);

    logger.info("[Superadmin:FooterLinks] Link created", {
      linkId: link._id,
      label: validation.data.label,
      section: validation.data.section,
      by: session.username,
    });

    return NextResponse.json(
      { link, message: "Footer link created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLinks] Failed to create link", { error });
    return NextResponse.json(
      { error: "Failed to create footer link" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
