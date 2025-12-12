import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { Types } from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import { createSecureResponse } from "@/server/security/headers";

const patchSchema = z.object({
  status: z.enum(["New", "Open", "Waiting", "Resolved", "Closed"]).optional(),
  assigneeUserId: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
});

/**
 * @openapi
 * /api/support/tickets/[id]:
 *   get:
 *     summary: support/tickets/[id] operations
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
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  enforceRateLimit(req, { requests: 60, windowMs: 60_000, keyPrefix: "support:tickets:get" });
  try {
    await connectToDatabase();
    const { id } = await props.params;

    // SECURITY: Add authorization check (was missing per CodeRabbit review)
    const user = await getSessionUser(req);
    
    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      return createSecureResponse({ error: "Invalid id" }, 400, req);
    }
    
    const isAdmin = ["SUPER_ADMIN", "ADMIN", "CORPORATE_ADMIN"].includes(user.role);
    const query: Record<string, unknown> = { _id: id };
    
    // Non-admins can only view their own tickets or tickets in their org
    if (!isAdmin) {
      query.$or = [
        { createdBy: Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : user.id },
        { orgId: user.orgId },
      ];
    }
    
    const t = await SupportTicket.findOne(query);
    if (!t) return createSecureResponse({ error: "Not found" }, 404, req);
    return createSecureResponse(t, 200, req);
  } catch (_error) {
    return createSecureResponse({ error: "Internal server error" }, 500, req);
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await props.params;
    const user = await getSessionUser(req);
    if (!["SUPER_ADMIN", "ADMIN", "CORPORATE_ADMIN"].includes(user.role)) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }
    const data = patchSchema.parse(await req.json());
    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      return createSecureResponse({ error: "Invalid id" }, 400, req);
    }
    const t = await SupportTicket.findOne({
      _id: id,
      $or: [
        { orgId: user.orgId },
        // Allow admins to modify any ticket
        ...(["SUPER_ADMIN", "ADMIN", "CORPORATE_ADMIN"].includes(user.role)
          ? [{}]
          : []),
      ],
    });
    if (!t) return createSecureResponse({ error: "Not found" }, 404, req);
    if (data.status && t.status === "New" && !t.firstResponseAt)
      t.firstResponseAt = new Date();
    if (data.assigneeUserId !== undefined) {
      t.assignment = t.assignment || {};
      t.assignment.assignedTo = t.assignment.assignedTo || {};
      t.assignment.assignedTo.userId = data.assigneeUserId
        ? new Types.ObjectId(data.assigneeUserId)
        : undefined;
      t.assignment.assignedBy = data.assigneeUserId
        ? new Types.ObjectId(user.id)
        : undefined;
      t.assignment.assignedAt = data.assigneeUserId ? new Date() : undefined;
      delete (data as Record<string, unknown>).assigneeUserId;
    }
    Object.assign(t, data);
    if (data.status === "Resolved") t.resolvedAt = new Date();
    await t.save();
    return createSecureResponse(t, 200, req);
  } catch (_error) {
    return createSecureResponse({ error: "Internal server error" }, 500, req);
  }
}
