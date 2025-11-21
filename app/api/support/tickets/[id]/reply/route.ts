import { NextRequest} from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { Types } from 'mongoose';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

const schema = z.object({ text: z.string().min(1) });

/**
 * @openapi
 * /api/support/tickets/[id]/reply:
 *   get:
 *     summary: support/tickets/[id]/reply operations
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
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  
  // Authenticate user first
  const user = await getSessionUser(req).catch(() => null);
  if (!user) {
    return createSecureResponse({ error: 'Authentication required' }, 401, req);
  }

  // Apply rate limiting with authenticated user ID
  const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await connectToDatabase();
  const body = schema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return createSecureResponse({ error: "Invalid id" }, 400, req);
  }
  const creatorMatch = user?.id ? [{ createdBy: Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : user.id }] : [];
  const adminMatch = user && ["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role) ? [{}] : [];
  const t = await SupportTicket.findOne({ 
    _id: params.id, 
    $or: [
      { orgId: user?.orgId },
      ...creatorMatch,
      ...adminMatch,
    ]
  });
  if (!t) return createSecureResponse({ error: "Not found" }, 404, req);

  // End user may reply only to own ticket; admins can reply to any
  const isAdmin = !!user && ["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role);
  const ticketTyped = t as unknown as TicketDocument;
  const isOwner = !!user && ticketTyped.createdBy?.toString?.() === user.id;
  if (!isAdmin && !isOwner) return createSecureResponse({ error: "Forbidden"}, 403, req);

  const ticketDoc = t as unknown as {
    messages: Array<{ byUserId?: string; byRole: string; text: string; at: Date }>;
    status?: string;
  };
  ticketDoc.messages ??= [];
  ticketDoc.messages.push({
    byUserId: user?.id,
    byRole: isAdmin ? "ADMIN" : "USER",
    text: body.text,
    at: new Date()
  });
  if (ticketDoc.status === "Waiting") {
    ticketDoc.status = "Open";
  }
  await t.save();
  return createSecureResponse({ ok: true }, 200, req);
}
