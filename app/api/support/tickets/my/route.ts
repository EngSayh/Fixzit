import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { Types } from "mongoose";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/support/tickets/my:
 *   get:
 *     summary: support/tickets/my operations
 *     tags: [support]
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
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(req);
      const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
      if (!rl.allowed) {
        return rateLimitError();
      }
    } catch (authError) {
      logger.error(
        "Authentication failed:",
        authError instanceof Error ? authError.message : "Unknown error",
      );
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }

    const creatorId = Types.ObjectId.isValid(user.id)
      ? new Types.ObjectId(user.id)
      : user.id;
    const items = await SupportTicket.find({
      orgId: user.orgId,
      createdBy: creatorId,
    })
      .sort({ createdAt: -1 })
      .limit(200);
    return createSecureResponse({ items }, 200, req);
  } catch (error) {
    logger.error(
      "My tickets query failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to fetch your tickets" },
      500,
      req,
    );
  }
}
