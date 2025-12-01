import { NextRequest } from "next/server";
import { z } from "zod";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { ObjectId } from "mongodb";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";

const bulkActionSchema = z.object({
  action: z.enum(["mark-read", "mark-unread", "archive", "delete"]),
  notificationIds: z.array(z.string()),
});

/**
 * @openapi
 * /api/notifications/bulk:
 *   get:
 *     summary: notifications/bulk operations
 *     tags: [notifications]
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
export async function POST(req: NextRequest) {
  let orgId: string;
  try {
    const user = await getSessionUser(req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  const body = await req.json();
  const { action, notificationIds } = bulkActionSchema.parse(body);
  const { notifications } = await getCollections();

  const toObjectId = (id: string) => {
    try {
      return new ObjectId(id);
    } catch {
      return null;
    }
  };
  const ids = notificationIds.map(toObjectId).filter(Boolean) as ObjectId[];
  const filter = { _id: { $in: ids }, orgId };

  interface BulkUpdateResult {
    deletedCount?: number;
    modifiedCount?: number;
  }

  let res: BulkUpdateResult;
  if (action === "delete") {
    res = await notifications.deleteMany(filter);
    if (!res.deletedCount)
      return createSecureResponse(
        { error: "No notifications found to delete" },
        404,
        req,
      );
  } else if (action === "archive") {
    res = await notifications.updateMany(filter, {
      $set: { archived: true, updatedAt: new Date() },
    });
    if (!res.modifiedCount)
      return createSecureResponse(
        { error: "No notifications found to archive" },
        404,
        req,
      );
  } else if (action === "mark-read") {
    res = await notifications.updateMany(filter, {
      $set: { read: true, updatedAt: new Date() },
    });
    if (!res.modifiedCount)
      return createSecureResponse(
        { error: "No notifications found to mark as read" },
        404,
        req,
      );
  } else if (action === "mark-unread") {
    res = await notifications.updateMany(filter, {
      $set: { read: false, updatedAt: new Date() },
    });
    if (!res.modifiedCount)
      return createSecureResponse(
        { error: "No notifications found to mark as unread" },
        404,
        req,
      );
  }

  return createSecureResponse({ ok: true }, 200, req);
}
