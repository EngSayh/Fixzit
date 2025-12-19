/**
 * @fileoverview Work Order Comments API Route
 * @description Manage comments/notes on work orders for communication tracking.
 * Supports viewing comment history and adding new comments with user attribution.
 * @route GET /api/work-orders/[id]/comments - List all comments on a work order
 * @route POST /api/work-orders/[id]/comments - Add a comment to a work order
 * @access Protected - Requires authenticated session
 * @module work-orders
 */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { createSecureResponse } from "@/server/security/headers";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const schema = z.object({ text: z.string().min(1) });

/**
 * @openapi
 * /api/work-orders/[id]/comments:
 *   get:
 *     summary: work-orders/[id]/comments operations
 *     tags: [work-orders]
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
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "work-orders-comments:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getSessionUser(req);
    const { id } = await props.params;
    await connectToDatabase();
    const wo = await WorkOrder.findOne({ _id: id, orgId: user.orgId }).lean();
    const communication = (
      wo as { communication?: { comments?: unknown[] } } | null
    )?.communication;
    return createSecureResponse(communication?.comments ?? [], 200, req);
  } catch (error) {
    logger.error("[work-orders/comments] GET error", { error });
    return createSecureResponse({ error: "Failed to fetch comments" }, 500, req);
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser(req);
    const { id } = await props.params;
    await connectToDatabase();
    const { text } = schema.parse(await req.json());
    // NO_LEAN: document required for comment append and save()
    // eslint-disable-next-line local/require-lean
    const wo = await WorkOrder.findOne({ _id: id, orgId: user.orgId });
    if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);
    type Comment = {
      commentId?: string;
      userId: string;
      userName?: string;
      comment: string;
      timestamp: Date;
      isInternal?: boolean;
    };
    const doc = wo as { communication?: { comments?: Comment[] } };
    doc.communication ??= {};
    doc.communication.comments ??= [];
    doc.communication.comments.push({
      userId: user.id,
      comment: String(text).slice(0, 5000),
      timestamp: new Date(),
    });
    await wo.save();
    return createSecureResponse({ ok: true }, 200, req);
  } catch (error) {
    logger.error("[work-orders/comments] POST error", { error });
    return createSecureResponse({ error: "Failed to add comment" }, 500, req);
  }
}
