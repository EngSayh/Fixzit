import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser, requireAbility } from "@/server/middleware/withAuthRbac";
import { WORK_ORDER_FSM } from "@/domain/fm/fm.behavior";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const schema = z.object({
  to: z.enum([
    "NEW",
    "ASSESSMENT",
    "ESTIMATE_PENDING",
    "QUOTATION_REVIEW",
    "PENDING_APPROVAL",
    "APPROVED",
    "IN_PROGRESS",
    "WORK_COMPLETE",
    "QUALITY_CHECK",
    "FINANCIAL_POSTING",
    "CLOSED"
  ]),
  note: z.string().optional()
});

/**
 * @openapi
 * /api/work-orders/[id]/status:
 *   get:
 *     summary: work-orders/[id]/status operations
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
  const user = await getSessionUser(req);
  await connectToDatabase();

  const body = schema.parse(await req.json());
  const wo = (await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId }));
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);

  // Get current status and target status
  const currentStatus = wo.status as string;
  const targetStatus = body.to;

  // Validate FSM transition using FM behavior spec
  const transition = WORK_ORDER_FSM.transitions.find(
    t => t.from === currentStatus && t.to === targetStatus
  );

  if (transition) {
    // Validate required media
    if (transition.requireMedia) {
      const attachments = (wo as { attachments?: unknown[] }).attachments || [];
      if (attachments.length === 0) {
        return createSecureResponse({
          error: "Media required",
          message: `${transition.requireMedia.join(', ')} photos are required for this transition`,
          required: `Upload ${transition.requireMedia.join(' and ')} photos before proceeding`
        }, 400, req);
      }
    }

    // Validate technician assignment guard
    // TODO(schema-migration): Use assignment.assignedTo fields
    if (transition.guard === 'technicianAssigned') {
      if (!(wo as any).assigneeUserId && !(wo as any).assigneeVendorId) {
        return createSecureResponse({
          error: "Assignment required",
          message: "Work order must be assigned to a technician before proceeding",
          required: "Assign a technician or vendor before transitioning"
        }, 400, req);
      }
    }
  }

  // Role gate by target state
  const statusGates: Record<string, "STATUS" | "VERIFY" | "CLOSE"> = {
    NEW: "STATUS",
    ASSESSMENT: "STATUS",
    ESTIMATE_PENDING: "STATUS",
    QUOTATION_REVIEW: "STATUS",
    PENDING_APPROVAL: "STATUS",
    APPROVED: "STATUS",
    IN_PROGRESS: "STATUS",
    WORK_COMPLETE: "STATUS",
    QUALITY_CHECK: "VERIFY",
    FINANCIAL_POSTING: "STATUS",
    CLOSED: "CLOSE"
  };
  const guard = statusGates[body.to] || "STATUS";
  const gate = await (await requireAbility(guard))(req);
  if (gate instanceof NextResponse) return gate;

  // Technician/Vendor can only move their own assignments
  // TODO(schema-migration): Use assignment.assignedTo fields
  if ((user.role === "TECHNICIAN" || user.role === "VENDOR") &&
      String((wo as any).assigneeUserId ?? (wo as any).assigneeVendorId ?? "") !== user.id) {
    return createSecureResponse({ error: "Not your assignment" }, 403, req);
  }

  // TODO(schema-migration): Verify statusHistory structure and status enum values
  (wo as any).statusHistory.push({ from: wo.status, to: body.to, byUserId: user.id, at: new Date(), note: body.note });
  (wo as any).status = body.to;
  await wo.save();
  return createSecureResponse(wo, 200, req);
}
