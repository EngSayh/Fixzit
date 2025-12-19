/**
 * @fileoverview Work Order Auto-Assignment API
 * @description Triggers automatic assignment of work orders to technicians/vendors
 * @route POST /api/work-orders/auto-assign - Auto-assign a single work order
 * @route POST /api/work-orders/auto-assign?bulk=true - Auto-assign multiple work orders
 * @access Protected - Requires FM_MANAGER, TECHNICIAN_LEAD, or SUPER_ADMIN role
 * @module work-orders
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { WorkOrder } from "@/server/models/WorkOrder";
import { Types } from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";
import { createSecureResponse } from "@/server/security/headers";
import { isValidObjectId } from "@/lib/utils/objectid";
import { z } from "zod";
import {
  autoAssignWorkOrder,
  type AssignmentCandidate,
} from "@/services/fm/auto-assignment-engine";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Allowed roles for auto-assignment operations
 */
const AUTO_ASSIGN_ROLES = new Set([
  "SUPER_ADMIN",
  "CORPORATE_OWNER",
  "FM_MANAGER",
  "TECHNICIAN_LEAD",
]);

/**
 * Request body schema for single auto-assign
 */
const singleAssignSchema = z.object({
  workOrderId: z.string(),
});

/**
 * Request body schema for bulk auto-assign
 */
const bulkAssignSchema = z.object({
  workOrderIds: z
    .array(z.string())
    .min(1)
    .max(20, "Maximum 20 work orders per bulk auto-assign"),
  skipIfAssigned: z.boolean().default(true),
});

/**
 * POST /api/work-orders/auto-assign
 *
 * Auto-assign work orders to best available technician/vendor
 *
 * Single: { workOrderId: string }
 * Bulk: { workOrderIds: string[], skipIfAssigned?: boolean } with ?bulk=true query
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "work-orders:auto-assign",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return createSecureResponse({ error: "Unauthorized" }, 401, request);
    }

    const user = session.user as { id: string; role: string; orgId: string };

    // Check role authorization
    if (!AUTO_ASSIGN_ROLES.has(user.role)) {
      return createSecureResponse(
        { error: "Forbidden: Insufficient permissions for auto-assignment" },
        403,
        request
      );
    }

    // Validate orgId
    if (!user.orgId) {
      return createSecureResponse(
        { error: "Missing tenant context" },
        401,
        request
      );
    }

    // Check feature flag
    const featureEnabled = isFeatureEnabled("fm.work_order_auto_assign", { orgId: user.orgId });
    if (!featureEnabled) {
      return createSecureResponse(
        { error: "Auto-assignment feature is not enabled for your organization" },
        403,
        request
      );
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const isBulk = url.searchParams.get("bulk") === "true";

    // Parse request body
    const { data: body, error: parseError } = await parseBodySafe(request);
    if (parseError || !body) {
      return createSecureResponse(
        { error: parseError || "Invalid request body" },
        400,
        request
      );
    }

    if (isBulk) {
      // Bulk auto-assign
      const parseResult = bulkAssignSchema.safeParse(body);
      if (!parseResult.success) {
        return createSecureResponse(
          { error: "Validation failed", details: parseResult.error.flatten() },
          400,
          request
        );
      }

      const { workOrderIds, skipIfAssigned } = parseResult.data;

      // Validate all IDs
      const invalidIds = workOrderIds.filter((id) => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        return createSecureResponse(
          { error: "Invalid work order IDs", invalidIds },
          400,
          request
        );
      }

      // Get work orders that need assignment
      const objectIds = workOrderIds.map((id) => new Types.ObjectId(id));
      const workOrders = await WorkOrder.find({
        _id: { $in: objectIds },
        orgId: user.orgId,
        isDeleted: { $ne: true },
        ...(skipIfAssigned && {
          $and: [
            { "assignment.assignedTo.userId": { $exists: false } },
            { "assignment.assignedTo.vendorId": { $exists: false } },
            { "assignment.assignedTo.teamId": { $exists: false } },
          ],
        }),
      }).lean();

      if (workOrders.length === 0) {
        return createSecureResponse(
          {
            success: true,
            message: "No work orders need assignment",
            results: { assigned: 0, skipped: workOrderIds.length, failed: 0 },
          },
          200,
          request
        );
      }

      // Process each work order
      const results: {
        assigned: Array<{ workOrderId: string; assignee: AssignmentCandidate }>;
        failed: Array<{ workOrderId: string; error: string }>;
        skipped: string[];
      } = {
        assigned: [],
        failed: [],
        skipped: workOrderIds.filter(
          (id) => !workOrders.find((wo) => wo._id.toString() === id)
        ),
      };

      for (const wo of workOrders) {
        const woId = wo._id.toString();
        const result = await autoAssignWorkOrder(user.orgId, woId, user.id);

        if (result.success && result.assignee) {
          results.assigned.push({
            workOrderId: woId,
            assignee: result.assignee,
          });
        } else {
          results.failed.push({
            workOrderId: woId,
            error: result.error || "Unknown error",
          });
        }
      }

      logger.info("[API] Bulk auto-assignment completed", {
        orgId: user.orgId,
        userId: user.id,
        requested: workOrderIds.length,
        assigned: results.assigned.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      });

      return createSecureResponse(
        {
          success: true,
          results: {
            assigned: results.assigned.length,
            failed: results.failed.length,
            skipped: results.skipped.length,
            details: results,
          },
        },
        200,
        request
      );
    } else {
      // Single auto-assign
      const parseResult = singleAssignSchema.safeParse(body);
      if (!parseResult.success) {
        return createSecureResponse(
          { error: "Validation failed", details: parseResult.error.flatten() },
          400,
          request
        );
      }

      const { workOrderId } = parseResult.data;

      if (!isValidObjectId(workOrderId)) {
        return createSecureResponse(
          { error: "Invalid work order ID" },
          400,
          request
        );
      }

      // Verify work order exists and belongs to org
      const workOrder = await WorkOrder.findOne({
        _id: new Types.ObjectId(workOrderId),
        orgId: user.orgId,
        isDeleted: { $ne: true },
      }).lean();

      if (!workOrder) {
        return createSecureResponse(
          { error: "Work order not found" },
          404,
          request
        );
      }

      // Check if already assigned
      const isAssigned =
        workOrder.assignment?.assignedTo?.userId ||
        workOrder.assignment?.assignedTo?.vendorId ||
        workOrder.assignment?.assignedTo?.teamId;
      if (isAssigned) {
        return createSecureResponse(
          { error: "Work order is already assigned", currentAssignment: workOrder.assignment },
          409,
          request
        );
      }

      // Auto-assign
      const result = await autoAssignWorkOrder(user.orgId, workOrderId, user.id);

      if (!result.success) {
        return createSecureResponse(
          { error: result.error || "Auto-assignment failed" },
          422,
          request
        );
      }

      logger.info("[API] Auto-assignment completed", {
        workOrderId,
        orgId: user.orgId,
        assignee: result.assignee?.id,
        assigneeType: result.assignee?.type,
      });

      return createSecureResponse(
        {
          success: true,
          workOrderId,
          assignee: result.assignee,
        },
        200,
        request
      );
    }
  } catch (error) {
    logger.error("[API] Auto-assignment error", error);
    return createSecureResponse(
      { error: "Internal server error" },
      500,
      request
    );
  }
}
