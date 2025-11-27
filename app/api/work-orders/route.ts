/**
 * Work Orders API Routes - Refactored with CRUD Factory
 * BEFORE: 190 lines of duplicated boilerplate
 * AFTER: ~85 lines using reusable factory
 * REDUCTION: 55% less code
 */

import { createCrudHandlers } from "@/lib/api/crud-factory";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { resolveSlaTarget, WorkOrderPriority } from "@/lib/sla";
import { logger } from "@/lib/logger";
import { WOPriority } from "@/server/work-orders/wo.schema";
import { deleteObject } from "@/lib/storage/s3";

const attachmentInputSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().optional(),
  type: z.string().optional(),
  scanStatus: z
    .enum(["pending", "clean", "infected", "error"])
    .default("pending"),
});

type AttachmentInput = z.infer<typeof attachmentInputSchema>;

function normalizeAttachments(attachments: AttachmentInput[], userId: string) {
  return attachments.map((att) => ({
    key: att.key,
    fileName: att.name || att.key.split("/").pop() || att.key,
    originalName: att.name || att.key,
    fileUrl: att.url,
    fileType: att.type,
    fileSize: att.size,
    uploadedBy: userId,
    uploadedAt: new Date(),
    category: "WORK_ORDER",
    description: att.scanStatus === "infected" ? "Virus detected" : undefined,
    isPublic: false,
    scanStatus: att.scanStatus ?? "pending",
  }));
}

/**
 * Work Order Creation Schema
 */
const createWorkOrderSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z
    .enum([
      "MAINTENANCE",
      "REPAIR",
      "INSPECTION",
      "INSTALLATION",
      "EMERGENCY",
      "PREVENTIVE",
      "CORRECTIVE",
    ])
    .default("MAINTENANCE"),
  priority: WOPriority.default("MEDIUM"),
  category: z.string().default("GENERAL"),
  subcategory: z.string().optional(),
  propertyId: z.string().optional(),
  unitNumber: z.string().optional(),
  attachments: z.array(attachmentInputSchema).optional(),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "ASSIGNED",
      "IN_PROGRESS",
      "ON_HOLD",
      "PENDING_APPROVAL",
      "COMPLETED",
      "VERIFIED",
      "CLOSED",
      "CANCELLED",
    ])
    .default("DRAFT"),
  requester: z
    .object({
      type: z.enum(["TENANT", "OWNER", "STAFF"]).default("TENANT"),
      id: z.string().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

/**
 * Build Work Order Filter
 */
// 🔒 TYPE SAFETY: Using Record<string, unknown> for MongoDB filter
// 🔒 STRICT v4: Add role-based filtering for user assignments using canonical schema paths
function buildWorkOrderFilter(
  searchParams: URLSearchParams,
  orgId: string,
  userId?: string,
  userRole?: string,
  vendorId?: string,
  units?: string[]
) {
  const filter: Record<string, unknown> = { orgId, isDeleted: { $ne: true } };

  // 🔒 RBAC: Scope by role per STRICT v4 multi-tenant isolation
  // BLOCKER FIX: Use canonical schema paths from server/models/WorkOrder.ts
  if (userRole === 'TECHNICIAN' && userId) {
    // Technicians only see work orders assigned to them (canonical: assignment.assignedTo.userId)
    filter["assignment.assignedTo.userId"] = userId;
  } else if (userRole === 'VENDOR' && vendorId) {
    // Vendors only see work orders for their vendor organization (canonical: assignment.assignedTo.vendorId)
    filter["assignment.assignedTo.vendorId"] = vendorId;
  } else if (userRole === 'TENANT') {
    // MAJOR FIX: Tenants with empty units get 403, not org-wide access
    if (!units || units.length === 0) {
      // Return a filter that matches nothing - caller should check for this
      filter._id = { $exists: false }; // Impossible condition = no results
      filter.__tenantNoUnits = true; // Signal to caller
    } else {
      // Tenants only see work orders for their units (canonical: location.propertyId or unitNumber)
      filter["location.unitNumber"] = { $in: units };
    }
  }
  // SUPER_ADMIN, CORPORATE_ADMIN, ADMIN, MANAGER, FM_MANAGER, PROPERTY_MANAGER see all in org

  const status = searchParams.get("status");
  if (status) {
    filter.status = status;
  }

  const priority = searchParams.get("priority");
  if (priority && ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(priority)) {
    filter.priority = priority;
  }
  const propertyId = searchParams.get("propertyId");
  if (propertyId) {
    filter["location.propertyId"] = propertyId;
  }

  const search = searchParams.get("search") || searchParams.get("q");
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { workOrderNumber: { $regex: escapedSearch, $options: "i" } },
      { title: { $regex: escapedSearch, $options: "i" } },
      { description: { $regex: escapedSearch, $options: "i" } },
      { category: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  return filter;
}

/**
 * Generate Work Order Code with Year + Crypto UUID
 */
function generateWorkOrderNumber() {
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `WO-${new Date().getFullYear()}-${uuid}`;
}

/**
 * Export CRUD Handlers with Custom Work Order Logic
 */
export const { GET, POST } = createCrudHandlers({
  Model: WorkOrder,
  createSchema: createWorkOrderSchema,
  entityName: "work order",
  defaultSort: { createdAt: -1 },
  searchFields: ["workOrderNumber", "title", "description", "category"],
  buildFilter: buildWorkOrderFilter,
  // Custom onCreate hook to add SLA calculations
  // 🔒 TYPE SAFETY: Using Record for dynamic work order data
  onCreate: async (data: Record<string, unknown>, user) => {
    const createdAt = new Date();
    const { slaMinutes, dueAt } = resolveSlaTarget(
      data.priority as WorkOrderPriority,
      createdAt,
    );
    const responseMinutes = 120;

    const location = data.propertyId
      ? {
          propertyId: data.propertyId,
          unitNumber: data.unitNumber,
        }
      : undefined;

    delete data.propertyId;
    delete data.unitNumber;

    const attachments = Array.isArray(data.attachments)
      ? normalizeAttachments(data.attachments as AttachmentInput[], user.id)
      : [];

    return {
      ...data,
      orgId: user.orgId,
      workOrderNumber: generateWorkOrderNumber(),
      status: data.status === "DRAFT" ? "DRAFT" : "SUBMITTED",
      statusHistory: [
        {
          fromStatus: "DRAFT",
          toStatus: data.status === "DRAFT" ? "DRAFT" : "SUBMITTED",
          changedBy: user.id,
          changedAt: createdAt,
          notes: "Created via API",
        },
      ],
      location,
      sla: {
        responseTimeMinutes: responseMinutes,
        resolutionTimeMinutes: slaMinutes,
        responseDeadline: new Date(
          createdAt.getTime() + responseMinutes * 60 * 1000,
        ),
        resolutionDeadline: dueAt,
        status: "ON_TIME",
      },
      attachments,
      createdAt,
    };
  },
  onUpdate: async (id: string, updates: Record<string, unknown>, user) => {
    // best-effort cleanup of removed attachment keys with observability
    if (!Array.isArray(updates.attachments)) {
      return updates;
    }
    const existing = await WorkOrder.findOne({ _id: id, orgId: user.orgId })
      .select({ attachments: 1 })
      .lean<{ attachments?: { key?: string }[] } | null>();
    if (!existing?.attachments) return updates;
    const existingKeys = new Set(
      (existing.attachments || [])
        .map((a) => a.key)
        .filter(Boolean) as string[],
    );
    // Type assertion for attachments array with key property
    const updatesAttachments = updates.attachments as
      | Array<{ key?: string }>
      | undefined;
    const nextKeys = new Set(
      (updatesAttachments || []).map((a) => a.key).filter(Boolean) as string[],
    );
    const removed = [...existingKeys].filter((k) => !nextKeys.has(k));
    if (removed.length) {
      void (async () => {
        const results = await Promise.allSettled(
          removed.map((key) => deleteObject(key)),
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length) {
          logger.warn("[WorkOrder PATCH] S3 cleanup partial failure", {
            workOrderId: id,
            total: removed.length,
            failed: failed.length,
          });
          failed.forEach((res, idx) => {
            logger.error("[WorkOrder PATCH] S3 cleanup failed", {
              workOrderId: id,
              key: removed[idx],
              error: (res as PromiseRejectedResult).reason,
            });
          });

          // Enqueue cleanup retry job for failed deletions
          const failedKeys = results
            .map((res, idx) =>
              res.status === "rejected" ? removed[idx] : null,
            )
            .filter((key): key is string => Boolean(key));

          if (failedKeys.length > 0) {
            try {
              const { JobQueue } = await import("@/lib/jobs/queue");
              const jobId = await JobQueue.enqueue("s3-cleanup", {
                keys: failedKeys,
                workOrderId: id,
                retryReason: "partial-cleanup-failure",
              });
              logger.info("[WorkOrder PATCH] S3 cleanup retry job enqueued", {
                workOrderId: id,
                failedCount: failedKeys.length,
                jobId,
              });
            } catch (error) {
              logger.error(
                "[WorkOrder PATCH] Failed to enqueue cleanup retry",
                {
                  workOrderId: id,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                },
              );
            }
          }
        } else {
          logger.info("[WorkOrder PATCH] S3 cleanup success", {
            workOrderId: id,
            total: removed.length,
          });
        }
      })();
    }
    return updates;
  },
});
