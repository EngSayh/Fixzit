/**
 * @fileoverview RFQ Publishing
 * @description Publishes a draft RFQ to make it visible to vendors for bidding
 * @route POST /api/rfqs/[id]/publish - Publish a draft RFQ
 * @access Private - Requires authentication and RFQ ownership
 * @module rfqs
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { isUnauthorizedError } from "@/server/utils/isUnauthorizedError";
import { Types } from "mongoose";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError, handleApiError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { logger } from "@/lib/logger";

interface RFQDocument {
  _id: unknown;
  code?: string;
  status?: string;
  workflow?: {
    publishedAt?: Date | null;
  };
  [key: string]: unknown;
}

/**
 * Publishes a draft RFQ by id for the current user's tenant.
 *
 * Finds a draft RFQ matching the provided `id` and the session user's tenant, atomically updates its
 * status to "PUBLISHED", records who published it and when, and returns a JSON response with the
 * updated RFQ metadata. If no matching draft is found, returns a 404 error response.
 *
 * @param params.id - RFQ identifier to publish
 * @returns JSON NextResponse with:
 *  - On success (200): { success: true, rfq: { id, code, status, publishedAt } }
 *  - If not found (404): { error: "RFQ not found or already published" }
 *  - On server error (500): { error: string }
 */
/**
 * @openapi
 * /api/rfqs/[id]/publish:
 *   post:
 *     summary: rfqs/[id]/publish operations
 *     tags: [rfqs]
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
export async function POST(
  req: NextRequest,
  props: { params: { id: string } },
) {
  try {
    const { id } = props.params;
    const user = await getSessionUser(req);
    const userRole = (user as { role?: string }).role;
    const allowedPublisherRoles = new Set([
      "SUPER_ADMIN",
      "CORPORATE_ADMIN",
      "ADMIN",
      "MANAGEMENT",
      "OPS",
      "PROCUREMENT",
    ]);
    if (userRole && !allowedPublisherRoles.has(userRole.toUpperCase())) {
      return createSecureResponse(
        { error: "Forbidden", message: "Insufficient role to publish RFQ" },
        403,
        req,
      );
    }
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    if (!Types.ObjectId.isValid(id)) {
      return createSecureResponse({ error: "Invalid RFQ id" }, 400, req);
    }

    await connectToDatabase();

    const { RFQ } = await import("@/server/models/RFQ");
    const rfq = await RFQ.findOneAndUpdate(
      { _id: id, orgId: user.orgId, status: "DRAFT" },
      {
        $set: {
          status: "PUBLISHED",
          "workflow.publishedBy": user.id,
          "workflow.publishedAt": new Date(),
          "timeline.publishDate": new Date(),
        },
      },
      { new: true },
    );

    if (!rfq) {
      return createSecureResponse(
        { error: "RFQ not found or already published" },
        404,
        req,
      );
    }

    // Vendor notifications sent via background job
    logger.info("[RFQ] Published", {
      rfqId: id,
      orgId: user.orgId,
      userId: user.id,
      role: userRole,
    });

    const rfqTyped = rfq as unknown as RFQDocument;
    return NextResponse.json({
      success: true,
      rfq: {
        id: rfqTyped._id,
        code: rfqTyped.code,
        status: rfqTyped.status,
        publishedAt: rfqTyped.workflow?.publishedAt || null,
      },
    });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }
    return handleApiError(error);
  }
}
