import { NextRequest} from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

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
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  await connectToDatabase();
  const user = await getSessionUser(req).catch(()=>null);
  const body = schema.parse(await req.json());
  // Validate MongoDB ObjectId format
  if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
    return createSecureResponse({ error: "Invalid id" }, 400, req);
  }
  const t = (await SupportTicket.findOne({ 
    _id: params.id, 
    $or: [
      { orgId: user?.orgId },
      { createdByUserId: user?.id },
      // Allow admins to reply to any ticket
      ...(user && ["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role) ? [{}] : [])
    ]
  }));
  if (!t) return createSecureResponse({ error: "Not found" }, 404, req);

  // End user may reply only to own ticket; admins can reply to any
  const isAdmin = !!user && ["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role);
  const isOwner = !!user && t.createdByUserId === user.id;
  if (!isAdmin && !isOwner) return createSecureResponse({ error: "Forbidden"}, 403, req);

  t.messages.push({ byUserId: user?.id, byRole: isAdmin ? "ADMIN" : "USER", text: body.text, at: new Date() });
  if (t.status === "Waiting") t.status = "Open";
  await t.save();
  return createSecureResponse({ ok: true }, 200, req);
}
