/**
 * @fileoverview Superadmin Footer Link by ID API
 * @description Update and delete individual footer links
 * @route PUT, DELETE /api/superadmin/content/footer-links/[id]
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
import { isValidObjectId } from "mongoose";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const UpdateFooterLinkSchema = z.object({
  label: z.string().min(1).optional(),
  labelAr: z.string().optional(),
  url: z
    .string()
    .min(1)
    .refine(
      (url) => {
        // Allow relative paths or safe absolute URLs
        if (url.startsWith("/")) return true;
        try {
          const parsed = new URL(url);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "URL must be a relative path (/) or absolute URL (http/https)" }
    )
    .optional(),
  section: z.enum(["company", "support", "legal", "social"]).optional(),
  icon: z.string().optional(),
  isExternal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

/**
 * PUT /api/superadmin/content/footer-links/[id]
 * Update an existing footer link
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-links:put",
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

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid link ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe(request);
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

    logger.info("[Superadmin:FooterLinks] Link updated", {
      linkId: id,
      updates: Object.keys(validation.data),
      by: session.username,
    });

    return NextResponse.json(
      { link, message: "Footer link updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLinks] Failed to update link", { error });
    return NextResponse.json(
      { error: "Failed to update footer link" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/content/footer-links/[id]
 * Delete a footer link
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-links:delete",
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

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid link ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const link = await FooterLink.findByIdAndDelete(id).lean();

    if (!link) {
      return NextResponse.json(
        { error: "Footer link not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:FooterLinks] Link deleted", {
      linkId: id,
      label: link.label,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Footer link deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLinks] Failed to delete link", { error });
    return NextResponse.json(
      { error: "Failed to delete footer link" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
