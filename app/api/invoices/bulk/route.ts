/**
 * @fileoverview Invoices Bulk Actions API
 * @description Bulk operations for invoices - status changes, send reminders, mark as paid
 * @route POST /api/invoices/bulk - Perform bulk actions on invoices
 * @access Protected - Requires FINANCE_MANAGER, ACCOUNTANT, SUPER_ADMIN, or CORPORATE_OWNER role
 * @module finance
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { Invoice } from "@/server/models/Invoice";
import { Types } from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";
import { createSecureResponse } from "@/server/security/headers";
import { isValidObjectId } from "@/lib/utils/objectid";
import { z } from "zod";

/**
 * Allowed roles for bulk invoice operations
 */
const BULK_ALLOWED_ROLES = new Set([
  "SUPER_ADMIN",
  "CORPORATE_OWNER",
  "FINANCE_MANAGER",
  "ACCOUNTANT",
  "FM_MANAGER",
]);

/**
 * Valid actions for bulk operations
 */
const BULK_ACTIONS = [
  "mark_paid",
  "mark_sent",
  "update_status",
  "send_reminder",
  "archive",
  "delete",
] as const;

/**
 * Valid status options for bulk status update
 */
const BULK_STATUS_OPTIONS = [
  "draft",
  "sent",
  "viewed",
  "partial",
  "paid",
  "overdue",
  "cancelled",
  "void",
] as const;

/**
 * Request body schema for bulk operations
 */
const bulkActionSchema = z.object({
  action: z.enum(BULK_ACTIONS),
  invoiceIds: z
    .array(z.string())
    .min(1, "At least one invoice ID required")
    .max(50, "Maximum 50 invoices per bulk operation"),
  // Status update params
  status: z.enum(BULK_STATUS_OPTIONS).optional(),
  // Payment params
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  paymentDate: z.string().optional(),
  // Common params
  reason: z.string().min(5).max(500).optional(),
});

type BulkAction = z.infer<typeof bulkActionSchema>;

/**
 * POST /api/invoices/bulk
 *
 * Perform bulk actions on multiple invoices
 *
 * Body: {
 *   action: 'mark_paid' | 'mark_sent' | 'update_status' | 'send_reminder' | 'archive' | 'delete',
 *   invoiceIds: string[],
 *   status?: string (for update_status),
 *   paymentMethod?: string (for mark_paid),
 *   paymentReference?: string (for mark_paid),
 *   paymentDate?: string (for mark_paid),
 *   reason?: string
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute for bulk operations
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "invoices:bulk",
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

    const {
      action,
      invoiceIds,
      status,
      paymentMethod,
      paymentReference,
      paymentDate,
      reason,
    } = parseResult.data;

    // Validate all IDs are valid ObjectIds
    const invalidIds = invoiceIds.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return createSecureResponse(
        { error: "Invalid invoice IDs", invalidIds },
        400,
        request
      );
    }

    await connectToDatabase();

    // 🔒 TENANT-SCOPED: Fetch only invoices belonging to user's org
    const objectIds = invoiceIds.map((id) => new Types.ObjectId(id));
    const invoices = await Invoice.find({
      _id: { $in: objectIds },
      orgId: user.orgId,
      isDeleted: { $ne: true },
    }).lean();

    if (invoices.length === 0) {
      return createSecureResponse(
        { error: "No invoices found or none belong to your organization" },
        404,
        request
      );
    }

    const results = {
      processed: 0,
      failed: [] as Array<{ id: string; error: string }>,
      notFound: invoiceIds.filter(
        (id) => !invoices.find((inv) => inv._id.toString() === id)
      ),
    };

    // Process based on action type
    switch (action) {
      case "mark_paid": {
        const paidDate = paymentDate ? new Date(paymentDate) : new Date();

        const updateResult = await Invoice.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
            status: { $nin: ["paid", "cancelled", "void"] },
          },
          {
            $set: {
              status: "paid",
              paidAt: paidDate,
              paidBy: user.id,
              "payment.paidDate": paidDate,
              ...(paymentMethod && { "payment.method": paymentMethod }),
              ...(paymentReference && { "payment.reference": paymentReference }),
              updatedAt: new Date(),
              updatedBy: user.id,
            },
            $push: {
              history: {
                action: "BULK_MARKED_PAID",
                performedBy: user.id,
                performedAt: new Date(),
                notes: reason || "Bulk marked as paid",
              },
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        break;
      }

      case "mark_sent": {
        const updateResult = await Invoice.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
            status: "draft",
          },
          {
            $set: {
              status: "sent",
              sentAt: new Date(),
              sentBy: user.id,
              updatedAt: new Date(),
              updatedBy: user.id,
            },
            $push: {
              history: {
                action: "BULK_MARKED_SENT",
                performedBy: user.id,
                performedAt: new Date(),
                notes: reason || "Bulk marked as sent",
              },
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        break;
      }

      case "update_status": {
        if (!status) {
          return createSecureResponse(
            { error: "Status is required for update_status action" },
            400,
            request
          );
        }

        const updateResult = await Invoice.updateMany(
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
            },
            $push: {
              history: {
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

      case "send_reminder": {
        // For now, just mark as reminder sent - actual email sending would be via queue
        const updateResult = await Invoice.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
            status: { $in: ["sent", "viewed", "overdue"] },
          },
          {
            $set: {
              lastReminderSentAt: new Date(),
              updatedAt: new Date(),
              updatedBy: user.id,
            },
            $inc: {
              reminderCount: 1,
            },
            $push: {
              history: {
                action: "BULK_REMINDER_SENT",
                performedBy: user.id,
                performedAt: new Date(),
                notes: reason || "Bulk payment reminder sent",
              },
            },
          }
        );

        results.processed = updateResult.modifiedCount;
        // TODO: Queue actual reminder emails via notification service
        break;
      }

      case "archive": {
        const updateResult = await Invoice.updateMany(
          {
            _id: { $in: objectIds },
            orgId: user.orgId,
            isDeleted: { $ne: true },
            status: { $in: ["paid", "cancelled", "void"] },
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
        const notArchived = invoices.length - updateResult.modifiedCount;
        if (notArchived > 0) {
          results.failed.push({
            id: "multiple",
            error: `${notArchived} invoices could not be archived (must be PAID, CANCELLED, or VOID)`,
          });
        }
        break;
      }

      case "delete": {
        // Soft delete
        const updateResult = await Invoice.updateMany(
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

    logger.info("[API] Bulk invoice operation completed", {
      action,
      orgId: user.orgId,
      userId: user.id,
      requested: invoiceIds.length,
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
    logger.error("[API] Bulk invoice operation failed", error);
    return createSecureResponse(
      { error: "Internal server error" },
      500,
      request
    );
  }
}
