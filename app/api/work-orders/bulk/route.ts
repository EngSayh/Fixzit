/**
 * @fileoverview Work Orders Bulk Actions API
 * @description Bulk operations for work orders - status changes, assignments, priority updates
 * @route POST /api/work-orders/bulk - Perform bulk actions on work orders
 * @access Protected - Requires FM_MANAGER, TECHNICIAN_LEAD, SUPER_ADMIN, or CORPORATE_OWNER role
 * @module work-orders
 */

import { NextRequest, NextResponse } from "next/server";
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

/**
 * Allowed roles for bulk work order operations
 */
const BULK_ALLOWED_ROLES = new Set([
  "SUPER_ADMIN",
  "CORPORATE_OWNER",
  "FM_MANAGER",
  "TECHNICIAN_LEAD",
]);

/**
 * Valid actions for bulk operations
 */
const BULK_ACTIONS = [
  "update_status",
  "update_priority",
  "assign",
  "archive",
  "delete",
] as const;

/**
 * Valid status transitions for bulk status update
 */
const BULK_STATUS_OPTIONS = [
  "SUBMITTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
] as const;

/**
 * Valid priority options for bulk priority update
 */
const BULK_PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

/**
 * Request body schema for bulk operations
 */
const bulkActionSchema = z.object({
  action: z.enum(BULK_ACTIONS),
  workOrderIds: z
    .array(z.string())
    .min(1, "At least one work order ID required")
    .max(50, "Maximum 50 work orders per bulk operation"),
  // Status update params
  status: z.enum(BULK_STATUS_OPTIONS).optional(),
  // Priority update params
  priority: z.enum(BULK_PRIORITY_OPTIONS).optional(),
  // Assignment params
  assigneeUserId: z.string().optional(),
  assigneeVendorId: z.string().optional(),
  // Common params
  reason: z.string().min(5).max(500).optional(),
});

type BulkAction = z.infer<typeof bulkActionSchema>;

/**
 * POST /api/work-orders/bulk
 *
 * Perform bulk actions on multiple work orders
 *
 * Body: {
 *   action: 'update_status' | 'update_priority' | 'assign' | 'archive' | 'delete',
 *   workOrderIds: string[],
 *   status?: string (for update_status),
 *   priority?: string (for update_priority),
 *   assigneeUserId?: string (for assign),
 *   assigneeVendorId?: string (for assign),
 *   reason?: string
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute for bulk operations
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "work-orders:bulk",
    requests: 10,
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
    if (!BULK_ALLOWED_ROLES.has(user.role)) {
      return createSecureResponse(
        { error: "Forbidden: Insufficient permissions for bulk operations" },
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

    // Parse and validate request body
    const { data: body, error: parseError } = await parseBodySafe<BulkAction>(request);
    if (parseError || !body) {
      return createSecureResponse(
        { error: parseError || "Invalid request body" },
        400,
        request
      );
    }

    const parseResult = bulkActionSchema.safeParse(body);
    if (!parseResult.success) {
      return createSecureResponse(
        { error: "Validation failed", details: parseResult.error.flatten() },
        400,
        request
      );
    }

    const { action, workOrderIds, status, priority, assigneeUserId, assigneeVendorId, reason } =
      parseResult.data;

    // Validate all IDs are valid ObjectIds
    const invalidIds = workOrderIds.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return createSecureResponse(
        { error: "Invalid work order IDs", invalidIds },
        400,
        request
      );
    }

    await connectToDatabase();

    // 🔒 TENANT-SCOPED: Fetch only work orders belonging to user's org
    const objectIds = workOrderIds.map((id) => new Types.ObjectId(id));
    const workOrders = await WorkOrder.find({
      _id: { $in: objectIds },
      orgId: user.orgId,
      isDeleted: { $ne: true },
    }).lean();

    if (workOrders.length === 0) {
      return createSecureResponse(
        { error: "No work orders found or none belong to your organization" },
        404,
        request
      );
    }

    const results = {
      processed: 0,
      failed: [] as Array<{ id: string; error: string }>,
      notFound: workOrderIds.filter(
        (id) => !workOrders.find((wo) => wo._id.toString() === id)
      ),
    };

    // Process based on action type
    switch (action) {
      case "update_status": {
        if (!status) {
          return createSecureResponse(
            { error: "Status is required for update_status action" },
            400,
            request
          );
        }

        const updateResult = await WorkOrder.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
          },
          {
            $set: {
              status,
              updatedAt: new Date(),
              updatedBy: user.id,
              ...(reason && { statusChangeReason: reason }),
            },
            $push: {
              "timeline.history": {
                action: "BULK_STATUS_UPDATE",
                status,
                performedBy: user.id,
                performedAt: new Date(),
                notes: reason || `Bulk status update to ${status}`,
              },
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        break;
      }

      case "update_priority": {
        if (!priority) {
          return createSecureResponse(
            { error: "Priority is required for update_priority action" },
            400,
            request
          );
        }

        const updateResult = await WorkOrder.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
          },
          {
            $set: {
              priority,
              updatedAt: new Date(),
              updatedBy: user.id,
            },
            $push: {
              "timeline.history": {
                action: "BULK_PRIORITY_UPDATE",
                performedBy: user.id,
                performedAt: new Date(),
                notes: reason || `Bulk priority update to ${priority}`,
              },
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        break;
      }

      case "assign": {
        if (!assigneeUserId && !assigneeVendorId) {
          return createSecureResponse(
            { error: "Either assigneeUserId or assigneeVendorId is required for assign action" },
            400,
            request
          );
        }

        const updateResult = await WorkOrder.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
          },
          {
            $set: {
              "assignment.assignedTo": {
                ...(assigneeUserId && { userId: assigneeUserId }),
                ...(assigneeVendorId && { vendorId: assigneeVendorId }),
              },
              "assignment.assignedAt": new Date(),
              "assignment.assignedBy": user.id,
              status: "ASSIGNED",
              updatedAt: new Date(),
              updatedBy: user.id,
            },
            $push: {
              "timeline.history": {
                action: "BULK_ASSIGNMENT",
                performedBy: user.id,
                performedAt: new Date(),
                notes: reason || "Bulk assignment",
              },
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        break;
      }

      case "archive": {
        const updateResult = await WorkOrder.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
            status: { $in: ["CLOSED", "CANCELLED", "VERIFIED"] },
          },
          {
            $set: {
              isArchived: true,
              archivedAt: new Date(),
              archivedBy: user.id,
              updatedAt: new Date(),
              updatedBy: user.id,
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        const notArchived = workOrders.length - updateResult.modifiedCount;
        if (notArchived > 0) {
          results.failed.push({
            id: "multiple",
            error: `${notArchived} work orders could not be archived (must be CLOSED, CANCELLED, or VERIFIED)`,
          });
        }
        break;
      }

      case "delete": {
        // Soft delete
        const updateResult = await WorkOrder.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
          },
          {
            $set: {
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: user.id,
              updatedAt: new Date(),
              updatedBy: user.id,
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        break;
      }
    }

    logger.info("[API] Bulk work order operation completed", {
      action,
      orgId: user.orgId,
      userId: user.id,
      requested: workOrderIds.length,
      processed: results.processed,
      notFound: results.notFound.length,
      failed: results.failed.length,
    });

    return createSecureResponse(
      {
        success: true,
        action,
        results,
      },
      200,
      request
    );
  } catch (error) {
    logger.error("[API] Bulk work order operation failed", error);
    return createSecureResponse(
      { error: "Internal server error" },
      500,
      request
    );
  }
}
