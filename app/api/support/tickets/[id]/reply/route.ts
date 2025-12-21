import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { z } from "zod";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { Types } from "mongoose";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

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
  try {
    // Authenticate user first
    const sessionResult = await getSessionOrNull(req, { route: "support:tickets:reply" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user) {
      return createSecureResponse({ error: "Authentication required" }, 401, req);
    }

    // Apply rate limiting with authenticated user ID
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
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

    const { id } = await props.params;

    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(id)) {
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
      _id: id,
      $or: [{ orgId: user?.orgId }, ...creatorMatch, ...adminMatch],
    }).lean();
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

    const ticketOrgId = ticketTyped.orgId ?? user.orgId;
    if (!ticketOrgId) {
      return createSecureResponse(
        { error: "Ticket tenant scope missing" },
        500,
        req,
      );
    }
    await SupportTicket.updateOne({ _id: id, orgId: ticketOrgId }, updateOps);
    return createSecureResponse({ ok: true }, 200, req);
  } catch (_error) {
    return createSecureResponse({ error: "Internal server error" }, 500, req);
  }
}
