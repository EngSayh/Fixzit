/**
 * @fileoverview Superadmin Footer Link by ID API
 * @description Update/Delete individual footer links
 * @route GET/PUT/DELETE /api/superadmin/content/footer-links/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/footer-links/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { FooterLink } from "@/server/models/FooterLink";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";
import { isValidObjectId } from "@/lib/utils/objectid";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UpdateFooterLinkSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  labelAr: z.string().trim().max(100).optional(),
  url: z.string().trim().min(1).refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: "URL must be a valid relative path or absolute URL" }
  ).optional(),
  section: z.enum(["company", "support", "legal", "social"]).optional(),
  icon: z.string().trim().optional(),
  isExternal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
}).strict();

/**
 * GET /api/superadmin/content/footer-links/[id]
 * Get a single footer link by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-link:get",
    requests: 60,
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

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid link ID format" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Platform-wide footer links (no tenant scope required - singleton content)
    const link = await FooterLink.findById(id).lean();

    if (!link) {
      return NextResponse.json(
        { error: "Footer link not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { link },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLink] Error fetching link", { error });
    return NextResponse.json(
      { error: "Failed to fetch footer link" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/content/footer-links/[id]
 * Update a footer link
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-link:put",
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

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid link ID format" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe(request, {
      logPrefix: "[Superadmin:FooterLink]",
    });
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = UpdateFooterLinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Platform-wide footer links (no tenant scope required - singleton content)
    const link = await FooterLink.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean();

    if (!link) {
      return NextResponse.json(
        { error: "Footer link not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:FooterLink] Link updated", {
      linkId: id,
      updates: Object.keys(validation.data),
      by: session.username,
    });

    return NextResponse.json(
      { link, message: "Footer link updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLink] Error updating link", { error });
    return NextResponse.json(
      { error: "Failed to update footer link" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/content/footer-links/[id]
 * Delete a footer link (hard delete)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-link:delete",
    requests: 10,
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

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid link ID format" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Platform-wide footer links (no tenant scope required - singleton content)
    const link = await FooterLink.findByIdAndDelete(id).lean();

    if (!link) {
      return NextResponse.json(
        { error: "Footer link not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:FooterLink] Link deleted", {
      linkId: id,
      label: link.label,
      section: link.section,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Footer link deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLink] Error deleting link", { error });
    return NextResponse.json(
      { error: "Failed to delete footer link" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
