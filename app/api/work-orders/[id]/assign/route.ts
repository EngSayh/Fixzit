import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const schema = z.object({
  assigneeUserId: z.string().optional(),
  assigneeVendorId: z.string().optional()
}).refine(d => d.assigneeUserId || d.assigneeVendorId, "Provide an assignee");

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
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }>}): Promise<NextResponse> {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  const user = await requireAbility("ASSIGN")(req);
  if (user instanceof NextResponse) return user;
  await connectToDatabase();

  const body = schema.parse(await req.json());

  // MongoDB-only implementation
  // TODO(schema-migration): Update to use assignment.assignedTo.{userId,vendorId}
  let wo = (await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId })) as any;
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);

  wo.assigneeUserId = body.assigneeUserId;
  wo.assigneeVendorId = body.assigneeVendorId;
  if (wo.status === "SUBMITTED") {
    wo.statusHistory.push({ from: wo.status, to: "DISPATCHED", byUserId: user.id, at: new Date() });
    wo.status = "DISPATCHED";
  }
  await wo.save();

  return createSecureResponse(wo, 200, req);
}
