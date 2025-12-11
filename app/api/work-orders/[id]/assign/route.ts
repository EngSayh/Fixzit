/**
 * @fileoverview Work Order Assignment API Route
 * @description Assigns work orders to technicians or vendors. Updates assignment
 * fields and automatically transitions SUBMITTED orders to ASSIGNED status.
 * @route POST /api/work-orders/[id]/assign - Assign work order to user/vendor
 * @access Protected - Requires ASSIGN ability on work orders
 * @module work-orders
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import { WOAbility } from "@/types/work-orders/abilities";
import { Types } from "mongoose";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

const schema = z
  .object({
    assigneeUserId: z.string().optional(),
    assigneeVendorId: z.string().optional(),
  })
  .refine((d) => d.assigneeUserId || d.assigneeVendorId, "Provide an assignee");

/**
 * Assigns a work order to a user and/or vendor and returns the updated work order.
 *
 * Validates request body, enforces the caller has the "ASSIGN" ability, looks up the work order
 * by route `params.id` and the caller's tenant, updates assignee fields, and if the work order
 * was in "SUBMITTED" state records a status transition to "DISPATCHED". Changes are persisted to MongoDB.
 *
 * @param req - Incoming Next.js request (must include JSON body matching the handler schema).
 * @param params - Route params object; `params.id` is the work order `_id` to update.
 * @returns A NextResponse containing the JSON-serialized updated work order, or a 404 JSON response if not found.
 */
/**
 * @openapi
 * /api/work-orders/[id]/assign:
 *   get:
 *     summary: work-orders/[id]/assign operations
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
export async function POST(
  req: NextRequest,
  props: { params: { id: string } },
): Promise<NextResponse> {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const { id } = props.params;
  if (!id || !Types.ObjectId.isValid(id)) {
    return createSecureResponse({ error: "Invalid work order id" }, 400, req);
  }
  const user = await requireAbility(WOAbility.ASSIGN)(req);
  if (user instanceof NextResponse) return user;
  await connectToDatabase();

  const body = schema.parse(await req.json());

  const orgCandidates =
    Types.ObjectId.isValid(user.orgId) ? [user.orgId, new Types.ObjectId(user.orgId)] : [user.orgId];
  const wo = await WorkOrder.findOne({ _id: id, orgId: { $in: orgCandidates } });
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);

  const now = new Date();
  const nextStatus = wo.status === "SUBMITTED" ? "ASSIGNED" : wo.status;
  const updated = await WorkOrder.findOneAndUpdate(
    { _id: id, orgId: { $in: orgCandidates } },
    {
      $set: {
        "assignment.assignedTo.userId": body.assigneeUserId ?? null,
        "assignment.assignedTo.vendorId": body.assigneeVendorId ?? null,
        "assignment.assignedBy": user.id,
        "assignment.assignedAt": now,
        status: nextStatus,
      },
      $push: {
        statusHistory: {
          fromStatus: wo.status,
          toStatus: nextStatus,
          changedBy: user.id,
          changedAt: now,
          notes: "Assignment updated via API",
        },
      },
    },
    { new: true },
  );

  return createSecureResponse(updated ?? wo, 200, req);
}
