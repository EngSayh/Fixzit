/**
 * @fileoverview Single Application Management
 * @description Retrieves, updates, or deletes a specific application by ID with stage transition validation.
 * @route GET, PUT, DELETE /api/ats/applications/[id] - Manage individual application
 * @access Protected - Requires applications:read, applications:update, or applications:delete permissions
 * @module ats
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from "@/server/models/Application";
import {
  atsRBAC,
  canAccessResource,
  isValidStageTransition,
  ALLOWED_STAGE_TRANSITIONS,
} from "@/lib/ats/rbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import { notFoundError, rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

/**
 * @openapi
 * /api/ats/applications/[id]:
 *   get:
 *     summary: ats/applications/[id] operations
 *     tags: [ats]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    // RBAC: Check permissions
    const authResult = await atsRBAC(req, ["applications:read"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId, isSuperAdmin } = authResult;

    const application = await Application.findById((await params).id)
      .populate("jobId")
      .populate("candidateId")
      .lean();

    if (!application) return notFoundError("Application");

    // Resource ownership check
    if (!canAccessResource(orgId, application.orgId, isSuperAdmin)) {
      return notFoundError("Application");
    }

    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    logger.error(
      "Application fetch error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to fetch application" },
      500,
      req,
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();

    // RBAC: Check permissions
    const authResult = await atsRBAC(req, [
      "applications:update",
      "applications:stage-transition",
    ]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { userId, orgId, isSuperAdmin } = authResult;

    const application = await Application.findById((await params).id);
    if (!application) return notFoundError("Application");

    // Resource ownership check
    if (!canAccessResource(orgId, application.orgId, isSuperAdmin)) {
      return notFoundError("Application");
    }

    // Stage transition guard (state machine)
    if (body.stage && body.stage !== application.stage) {
      const oldStage = application.stage;

      if (!isValidStageTransition(oldStage, body.stage)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid stage transition: ${oldStage} → ${body.stage}`,
            allowedTransitions: ALLOWED_STAGE_TRANSITIONS[oldStage] || [],
          },
          { status: 400 },
        );
      }

      application.stage = body.stage;
      application.history.push({
        action: `stage_change:${oldStage}->${body.stage}`,
        by: userId,
        at: new Date(),
        details: body.reason,
      });
    }
    if (typeof body.score === "number" && body.score !== application.score) {
      const oldScore = application.score;
      application.score = body.score;
      application.history.push({
        action: "score_updated",
        by: userId,
        at: new Date(),
        details: `Score changed from ${oldScore} to ${body.score}`,
      });
    }
    if (body.note) {
      application.notes.push({
        author: userId,
        text: body.note,
        createdAt: new Date(),
        isPrivate: !!body.isPrivate,
      });
    }
    if (Array.isArray(body.flags)) application.flags = body.flags;
    if (Array.isArray(body.reviewers)) application.reviewers = body.reviewers;

    await application.save();
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    logger.error(
      "Application update error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to update application" },
      500,
      req,
    );
  }
}
