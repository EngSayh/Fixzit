/**
 * @fileoverview Superadmin Translation by ID API
 * @description GET/PUT/DELETE individual translation
 * @route GET/PUT/DELETE /api/superadmin/translations/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/translations/[id]
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { Translation } from "@/server/models/Translation";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

const TRANSLATION_STATUSES = ["draft", "pending_review", "approved", "published"] as const;

const UpdateTranslationSchema = z.object({
  context: z.string().max(500).optional(),
  values: z.object({
    en: z.string().optional(),
    ar: z.string().optional(),
  }).passthrough().optional(),
  status: z.enum(TRANSLATION_STATUSES).optional(),
  category: z.string().max(50).optional(),
  isRTL: z.boolean().optional(),
  variables: z.array(z.string().max(50)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/**
 * GET /api/superadmin/translations/[id]
 * Get a specific translation
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-translation-id:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid translation ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const translation = await Translation.findById(id).lean();
    if (!translation) {
      return NextResponse.json(
        { error: "Translation not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { translation },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Translation] Error fetching translation", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/translations/[id]
 * Update a translation
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-translation-id:put",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid translation ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }
    const validation = UpdateTranslationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for values merge
    const existing = await Translation.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Translation not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Prepare update - merge values if partial update
    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.values) {
      updateData.values = {
        ...existing.values,
        ...validation.data.values,
      };
    }
    updateData.lastEditedBy = session.username;

    // If status changed to approved, track who approved
    if (validation.data.status === "approved" && existing.status !== "approved") {
      updateData.approvedBy = session.username;
      updateData.approvedAt = new Date();
    }

    const translation = await Translation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    logger.info("[Superadmin:Translation] Translation updated", {
      translationId: id,
      key: existing.key,
      updates: Object.keys(validation.data),
      by: session.username,
    });

    return NextResponse.json(
      { translation, message: "Translation updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Translation] Error updating translation", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/translations/[id]
 * Delete a translation
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-translation-id:delete",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid translation ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check if it's a system translation
    const existing = await Translation.findById(id).lean();
    if (existing?.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system translations" },
        { status: 403, headers: ROBOTS_HEADER }
      );
    }

    const translation = await Translation.findByIdAndDelete(id);
    if (!translation) {
      return NextResponse.json(
        { error: "Translation not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Translation] Translation deleted", {
      translationId: id,
      key: translation.key,
      namespace: translation.namespace,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Translation deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Translation] Error deleting translation", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
