import { NextRequest } from "next/server";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { ObjectId, type ModifyResult } from "mongodb";
import { z } from "zod";
import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";
import type { NotificationDoc } from "@/lib/models";

const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
  archived: z.boolean().optional(),
});

/**
 * @openapi
 * /api/notifications/[id]:
 *   get:
 *     summary: notifications/[id] operations
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
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let orgId: string;
  try {
    const user = await getSessionUser(req);
    orgId = user.orgId;
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }
  const { notifications } = await getCollections();
  const _id = (() => {
    try {
      return new ObjectId(params.id);
    } catch {
      return null;
    }
  })();
  if (!_id) return createSecureResponse({ error: "Invalid id" }, 400, req);
  const doc = await notifications.findOne({ _id, orgId });
  if (!doc)
    return createSecureResponse({ error: "Notification not found" }, 404, req);
  const { _id: rawId, ...rest } = doc;
  return createSecureResponse({ id: String(rawId), ...rest });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let orgId: string;
  try {
    const user = await getSessionUser(req);
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }
  const body = updateNotificationSchema.parse(await req.json());
  const { read, archived } = body;
  const { notifications } = await getCollections();
  const _id = (() => {
    try {
      return new ObjectId(params.id);
    } catch {
      return null;
    }
  })();
  if (!_id) return createSecureResponse({ error: "Invalid id" }, 400, req);

  const update: {
    $set: { updatedAt: Date; read?: boolean; archived?: boolean };
  } = { $set: { updatedAt: new Date() } };
  if (typeof read === "boolean") update.$set.read = read;
  if (typeof archived === "boolean") update.$set.archived = archived;

  const updated = (await notifications.findOneAndUpdate(
    { _id, orgId },
    update,
    { returnDocument: "after" },
  )) as ModifyResult<NotificationDoc> | null;
  const value = updated?.value;
  if (!value)
    return createSecureResponse({ error: "Notification not found" }, 404, req);
  const { _id: rawId, ...rest } = value;
  return createSecureResponse({ id: String(rawId), ...rest });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let orgId: string;
  try {
    const user = await getSessionUser(req);
    orgId = user.orgId;
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }
  const { notifications } = await getCollections();
  const _id = (() => {
    try {
      return new ObjectId(params.id);
    } catch {
      return null;
    }
  })();
  if (!_id) return createSecureResponse({ error: "Invalid id" }, 400, req);
  const res = await notifications.deleteOne({ _id, orgId });
  if (!res.deletedCount)
    return createSecureResponse({ error: "Notification not found" }, 404, req);
  return createSecureResponse({ success: true });
}
