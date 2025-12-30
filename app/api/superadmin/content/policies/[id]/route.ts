/**
 * @fileoverview Superadmin Content Policy by ID API
 * @description Update/delete individual policy
 * @route PUT /api/superadmin/content/policies/[id]
 * @route DELETE /api/superadmin/content/policies/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/policies/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { FooterContent } from "@/server/models/FooterContent";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { isValidObjectId } from "mongoose";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/superadmin/content/policies/[id]
 * Update a policy
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-policies:put",
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
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid policy ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      content?: string;
      contentAr?: string;
    }>(request, { logPrefix: "[superadmin:content:policies:id]" });

    if (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const updateData: Record<string, unknown> = {};
    if (body?.content) updateData.contentEn = body.content;
    if (body?.contentAr) updateData.contentAr = body.contentAr;

    const policy = await FooterContent.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Content:Policies] Policy updated", {
      policyId: id,
      by: session.username,
    });

    return NextResponse.json({ policy }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:Content:Policies] Failed to update policy", { error });
    return NextResponse.json(
      { error: "Failed to update policy" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/content/policies/[id]
 * Delete a policy
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-policies:delete",
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
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid policy ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const policy = await FooterContent.findByIdAndDelete(id).lean();

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Content:Policies] Policy deleted", {
      policyId: id,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Policy deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Content:Policies] Failed to delete policy", { error });
    return NextResponse.json(
      { error: "Failed to delete policy" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
