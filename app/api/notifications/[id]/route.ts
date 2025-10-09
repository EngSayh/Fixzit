import { NextRequest} from "next/server";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
  archived: z.boolean().optional()
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
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  let orgId: string;
  try {
    const user = await getSessionUser(req);
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: 'Unauthorized' }, 401, req);
  }
  const { notifications } = await getCollections();
  const _id = (() => { try { return new ObjectId(params.id); } catch { return null; } })();
  if (!_id) return createSecureResponse({ error: 'Invalid id' }, 400, req);
  const doc = await notifications.findOne({ _id: _id as any, orgId });
  if (!doc) return createSecureResponse({ error: 'Notification not found' }, 404, req);
  const { _id: rawId, ...rest } = doc as any;
  return createSecureResponse({ id: String(rawId), ...rest });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let orgId: string;
  try {
    const user = await getSessionUser(req);
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: 'Unauthorized' }, 401, req);
  }
  const body = updateNotificationSchema.parse(await req.json());
  const { read, archived } = body;
  const { notifications } = await getCollections();
  const _id = (() => { try { return new ObjectId(params.id); } catch { return null; } })();
  if (!_id) return createSecureResponse({ error: 'Invalid id' }, 400, req);

  const update: any = { $set: { updatedAt: new Date() } };
  if (typeof read === 'boolean') update.$set.read = read;
  if (typeof archived === 'boolean') update.$set.archived = archived;

  const updated = await notifications.findOneAndUpdate({ _id: _id as any, orgId }, update, { returnDocument: 'after' });
  const value = updated as any;
  if (!value) return createSecureResponse({ error: 'Notification not found' }, 404, req);
  const normalized = { id: String(value._id), ...value, _id: undefined };
  return createSecureResponse(normalized);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  let orgId: string;
  try {
    const user = await getSessionUser(req);
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: 'Unauthorized' }, 401, req);
  }
  const { notifications } = await getCollections();
  const _id = (() => { try { return new ObjectId(params.id); } catch { return null; } })();
  if (!_id) return createSecureResponse({ error: 'Invalid id' }, 400, req);
  const res = await notifications.deleteOne({ _id: _id as any, orgId });
  if (!res.deletedCount) return createSecureResponse({ error: 'Notification not found' }, 404, req);
  return createSecureResponse({ success: true });
}
