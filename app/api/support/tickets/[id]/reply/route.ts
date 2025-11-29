import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { Types } from "mongoose";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";

interface TicketDocument {
  createdBy?: { toString?: () => string } | string;
  messages?: Array<{
    byUserId?: string;
    byRole: string;
    text: string;
    at: Date;
  }>;
  status?: string;
  [key: string]: unknown;
}

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
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = props.params;

  // Authenticate user first
  const user = await getSessionUser(req).catch(() => null);
  if (!user) {
    return createSecureResponse({ error: "Authentication required" }, 401, req);
  }

  // Apply rate limiting with authenticated user ID
  const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // Validate payload early to avoid DB work on bad requests
  const parsedBody = schema.safeParse(await req.json());
  if (!parsedBody.success) {
    return createSecureResponse(
      { error: "Invalid body", details: parsedBody.error.format() },
      400,
      req,
    );
  }

  // Validate MongoDB ObjectId format
  if (!Types.ObjectId.isValid(params.id)) {
    return createSecureResponse({ error: "Invalid id" }, 400, req);
  }

  await connectToDatabase();

  const creatorMatch = user?.id
    ? [
        {
          createdBy: Types.ObjectId.isValid(user.id)
            ? new Types.ObjectId(user.id)
            : user.id,
        },
      ]
    : [];
  const adminMatch =
    user && ["SUPER_ADMIN", "ADMIN", "CORPORATE_ADMIN"].includes(user.role)
      ? [{}]
      : [];
  const t = await SupportTicket.findOne({
    _id: params.id,
    $or: [{ orgId: user?.orgId }, ...creatorMatch, ...adminMatch],
  });
  if (!t) return createSecureResponse({ error: "Not found" }, 404, req);

  // End user may reply only to own ticket; admins can reply to any
  const isAdmin =
    !!user && ["SUPER_ADMIN", "ADMIN", "CORPORATE_ADMIN"].includes(user.role);
  const ticketTyped = t as unknown as TicketDocument;
  const isOwner = !!user && ticketTyped.createdBy?.toString?.() === user.id;
  if (!isAdmin && !isOwner)
    return createSecureResponse({ error: "Forbidden" }, 403, req);

  // Use atomic $push to prevent race conditions when multiple users reply simultaneously
  const updateOps: Record<string, unknown> = {
    $push: {
      messages: {
        byUserId: user?.id,
        byRole: isAdmin ? "ADMIN" : "USER",
        text: parsedBody.data.text,
        at: new Date(),
      },
    },
  };

  // Conditionally update status if currently "Waiting"
  const ticketDoc = t as unknown as { status?: string };
  if (ticketDoc.status === "Waiting") {
    updateOps.$set = { status: "Open", updatedAt: new Date() };
  }

  await SupportTicket.updateOne({ _id: params.id }, updateOps);
  return createSecureResponse({ ok: true }, 200, req);
}
