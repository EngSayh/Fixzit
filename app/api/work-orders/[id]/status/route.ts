/**
 * @fileoverview Work Order Status Transition API Route
 * @description FSM-based status transitions for work orders. Validates transitions
 * against state machine rules, enforces media requirements, and triggers financial posting.
 * @route POST /api/work-orders/[id]/status - Transition work order to new status
 * @access Protected - Requires authenticated session with appropriate role
 * @module work-orders
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import {
  getSessionUser,
  requireAbility,
} from "@/server/middleware/withAuthRbac";
import { WORK_ORDER_FSM } from "@/domain/fm/fm.behavior";
import { postFromWorkOrder } from "@/server/finance/fmFinance.service";
import { logger } from "@/lib/logger";
import { Types } from "mongoose";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

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
    "CLOSED",
  ]),
  note: z.string().optional(),
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
export async function POST(
  req: NextRequest,
  props: { params: { id: string } },
): Promise<NextResponse> {
  const user = await getSessionUser(req);
  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await connectToDatabase();
  const { id } = props.params;
  if (!id || !Types.ObjectId.isValid(id)) {
    return createSecureResponse({ error: "Invalid work order id" }, 400, req);
  }

  const body = schema.parse(await req.json());
  const orgCandidates =
    Types.ObjectId.isValid(user.orgId) ? [user.orgId, new Types.ObjectId(user.orgId)] : [user.orgId];
  // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for status updates and .save()
  const wo = await WorkOrder.findOne({ _id: id, orgId: { $in: orgCandidates } });
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);

  // Get current status and target status
  const currentStatus = wo.status as string;
  const targetStatus = body.to;

  // Validate FSM transition using FM behavior spec
  const transition = WORK_ORDER_FSM.transitions.find(
    (t) => t.from === currentStatus && t.to === targetStatus,
  );

  if (transition) {
    // Validate required media
    if (transition.requireMedia) {
      const attachments = (wo as { attachments?: unknown[] }).attachments || [];
      if (attachments.length === 0) {
        return createSecureResponse(
          {
            error: "Media required",
            message: `${transition.requireMedia.join(", ")} photos are required for this transition`,
            required: `Upload ${transition.requireMedia.join(" and ")} photos before proceeding`,
          },
          400,
          req,
        );
      }
    }

    // Validate technician assignment guard
    if (transition.guard === "technicianAssigned") {
      const assignedTo = (
        wo as unknown as {
          assignment?: { assignedTo?: { userId?: string; vendorId?: string } };
        }
      ).assignment?.assignedTo;
      if (!assignedTo?.userId && !assignedTo?.vendorId) {
        return createSecureResponse(
          {
            error: "Assignment required",
            message:
              "Work order must be assigned to a technician before proceeding",
            required: "Assign a technician or vendor before transitioning",
          },
          400,
          req,
        );
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
    CLOSED: "CLOSE",
  };
  const guard = statusGates[body.to] || "STATUS";
  const gate = await (await requireAbility(guard))(req);
  if (gate instanceof NextResponse) return gate;

  // Technician/Vendor can only move their own assignments
  if (user.role === "TECHNICIAN" || user.role === "VENDOR") {
    const assignedTo = (
      wo as unknown as {
        assignment?: { assignedTo?: { userId?: string; vendorId?: string } };
      }
    ).assignment?.assignedTo;
    const matches =
      (user.role === "TECHNICIAN" &&
        assignedTo?.userId &&
        String(assignedTo.userId) === user.id) ||
      (user.role === "VENDOR" &&
        assignedTo?.vendorId &&
        String(assignedTo.vendorId) === user.id);
    if (!matches) {
      return createSecureResponse({ error: "Not your assignment" }, 403, req);
    }
  }

  type StatusHistoryEntry = {
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changedAt: Date;
    notes?: string;
  };

  const doc = wo as { statusHistory?: StatusHistoryEntry[] };
  doc.statusHistory ??= [];
  doc.statusHistory.push({
    fromStatus: currentStatus,
    toStatus: body.to as unknown as typeof wo.status,
    changedBy: user.id,
    changedAt: new Date(),
    notes: body.note,
  });
  const shouldPostToFinance =
    body.to === "FINANCIAL_POSTING" && currentStatus !== body.to;

  wo.set("status", body.to as unknown as typeof wo.status);
  await wo.save();

  if (shouldPostToFinance) {
    const financial =
      (
        wo as {
          financial?: {
            actualCost?: number;
            estimatedCost?: number;
            isBillable?: boolean;
            costBreakdown?: { total?: number };
          };
        }
      ).financial || {};
    const expense =
      typeof financial.actualCost === "number"
        ? financial.actualCost
        : typeof financial.estimatedCost === "number"
          ? financial.estimatedCost
          : 0;
    const billable = financial.isBillable
      ? typeof financial.costBreakdown?.total === "number"
        ? financial.costBreakdown.total
        : expense
      : 0;

    if (expense > 0 || billable > 0) {
      try {
        await postFromWorkOrder(
          {
            userId: user.id,
            orgId: user.orgId,
            role: user.role ?? "STAFF",
            timestamp: new Date(),
          },
          wo._id.toString(),
          { expense, billable },
        );
      } catch (financeError) {
        logger.error("Failed to post work order to finance", {
          financeError,
          workOrderId: wo._id.toString(),
        });
        return createSecureResponse(
          {
            error: "Failed to post finance journal",
            details:
              financeError instanceof Error
                ? financeError.message
                : String(financeError),
          },
          500,
          req,
        );
      }
    }
  }

  return createSecureResponse(wo, 200, req);
}
