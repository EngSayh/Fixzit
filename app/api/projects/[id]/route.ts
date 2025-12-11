/**
 * @fileoverview Single Project Operations
 * @description Handles retrieval, update, and deletion of individual construction/renovation projects
 * @route GET /api/projects/[id] - Get project details
 * @route PATCH /api/projects/[id] - Update project
 * @route DELETE /api/projects/[id] - Delete project
 * @access Private - Requires authentication and org membership
 * @module projects
 */
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Project } from "@/server/models/Project";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError, handleApiError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z
    .enum([
      "NEW_CONSTRUCTION",
      "RENOVATION",
      "MAINTENANCE",
      "FIT_OUT",
      "DEMOLITION",
    ])
    .optional(),
  status: z
    .enum([
      "PLANNING",
      "APPROVED",
      "IN_PROGRESS",
      "ON_HOLD",
      "COMPLETED",
      "CANCELLED",
      "CLOSED",
    ])
    .optional(),
  timeline: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  budget: z
    .object({
      total: z.number().optional(),
      allocated: z.number().optional(),
      spent: z.number().optional(),
      remaining: z.number().optional(),
    })
    .optional(),
  progress: z
    .object({
      overall: z.number().min(0).max(100).optional(),
      schedule: z.number().min(0).max(100).optional(),
      quality: z.number().min(0).max(100).optional(),
      cost: z.number().min(0).max(100).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * @openapi
 * /api/projects/[id]:
 *   get:
 *     summary: projects/[id] operations
 *     tags: [projects]
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
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const user = await getSessionUser(req);
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const project = await Project.findOne({
      _id: id,
      tenantId: user.tenantId,
    });

    if (!project) {
      return createSecureResponse({ error: "Project not found" }, 404, req);
    }

    return createSecureResponse(project, 200, req);
  } catch (error: unknown) {
    logger.error(
      "GET /api/projects/[id] error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const user = await getSessionUser(req);
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 30, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const data = updateProjectSchema.parse(await req.json());

    const project = await Project.findOneAndUpdate(
      { _id: id, tenantId: user.tenantId },
      {
        $set: {
          ...data,
          updatedBy: user.id,
          "progress.lastUpdated": new Date(),
        },
      },
      { new: true },
    );

    if (!project) {
      return createSecureResponse({ error: "Project not found" }, 404, req);
    }

    return createSecureResponse(project, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const user = await getSessionUser(req);
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const project = await Project.findOneAndUpdate(
      { _id: id, tenantId: user.tenantId },
      { $set: { status: "CANCELLED", updatedBy: user.id } },
      { new: true },
    );

    if (!project) {
      return createSecureResponse({ error: "Project not found" }, 404, req);
    }

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
