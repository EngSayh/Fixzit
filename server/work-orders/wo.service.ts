import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import {
  withIdempotency,
  createIdempotencyKey,
} from "@/server/security/idempotency";
import { WorkOrder, type WorkOrderDoc } from "@/server/models/WorkOrder";
import type { Types } from "mongoose";
import { WoCreate, WoUpdate } from "./wo.schema";

const DEFAULT_CATEGORY = "GENERAL";
const DEFAULT_TYPE = "MAINTENANCE";
const DEFAULT_STATUS = "SUBMITTED";

const _VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["ASSIGNED", "REJECTED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "PENDING_APPROVAL", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  PENDING_APPROVAL: ["COMPLETED", "REJECTED", "IN_PROGRESS"],
  COMPLETED: ["VERIFIED", "REJECTED"],
  VERIFIED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
  REJECTED: ["DRAFT", "SUBMITTED"],
};

const describeWorkOrder = (wo?: Partial<WorkOrderDoc> | null) =>
  wo?.workOrderNumber ?? "unknown";

// DUPLICATE SCHEMA REMOVED: Now using the main WorkOrder model from server/models/WorkOrder.ts
// This fixes the mongoose duplicate schema registration issue where two different schemas
// were both trying to register as 'WorkOrder' model

export interface WorkOrderInput {
  orgId: string;
  title: string;
  description: string;
  priority?: string;
  category?: string;
  type?: string;
  subcategory?: string;
  propertyId: string;
  unitNumber?: string;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterType?: string;
  slaHours?: number;
  responseMinutes?: number;
  assignmentUserId?: string;
  assignmentVendorId?: string;
}

export async function create(
  data: WorkOrderInput,
  actorId: string,
  ip?: string,
) {
  await connectToDatabase();

  // ⚡ FIXED: Validate input with Zod schema
  const validated = WoCreate.parse(data);

  // ⚡ FIXED: Use deterministic idempotency key based on payload content
  // This ensures that duplicate requests with the same data are truly idempotent
  const key = createIdempotencyKey("wo:create", {
    orgId: validated.orgId,
    title: validated.title,
  });

  const wo = await withIdempotency(key, async () => {
    const now = new Date();
    const resolutionMinutes = validated.slaHours * 60;
    const responseMinutes = validated.responseMinutes ?? 120;
    const hasAssignment = Boolean(
      validated.assignmentUserId || validated.assignmentVendorId,
    );
    const assignment = hasAssignment
      ? {
          assignedBy: actorId,
          assignedAt: now,
          assignedTo: {
            ...(validated.assignmentUserId
              ? { userId: validated.assignmentUserId }
              : {}),
            ...(validated.assignmentVendorId
              ? { vendorId: validated.assignmentVendorId }
              : {}),
          },
        }
      : undefined;

    return await WorkOrder.create({
      orgId: validated.orgId,
      title: validated.title,
      description: validated.description,
      priority: validated.priority,
      category: validated.category || DEFAULT_CATEGORY,
      type: validated.type || DEFAULT_TYPE,
      subcategory: validated.subcategory,
      location: {
        propertyId: validated.propertyId,
        unitNumber: validated.unitNumber,
      },
      requester: {
        userId: validated.requesterId,
        type: (validated.requesterType || "TENANT").toUpperCase(),
        name: validated.requesterName || "Requester",
        contactInfo: {
          email: validated.requesterEmail,
        },
      },
      assignment,
      sla: {
        responseTimeMinutes: responseMinutes,
        resolutionTimeMinutes: resolutionMinutes,
        responseDeadline: new Date(now.getTime() + responseMinutes * 60 * 1000),
        resolutionDeadline: new Date(
          now.getTime() + resolutionMinutes * 60 * 1000,
        ),
        status: "ON_TIME",
      },
      status: DEFAULT_STATUS,
      statusHistory: [
        {
          fromStatus: "DRAFT",
          toStatus: DEFAULT_STATUS,
          changedBy: actorId,
          changedAt: now,
          notes: "Created via wo.service",
        },
      ],
      createdBy: actorId,
    });
  });

  logger.info(
    `Work order created: ${describeWorkOrder(wo)} by ${actorId} from ${ip || "unknown"}`,
  );
  return wo;
}

export async function update(
  id: string,
  patch: Partial<WorkOrderInput>,
  orgId: string,
  actorId: string,
  ip?: string,
) {
  await connectToDatabase();

  if (!id) {
    throw new Error("Work order ID required");
  }
  if (!patch || Object.keys(patch).length === 0) {
    return await WorkOrder.findById(id).lean();
  }

  // ⚡ FIXED: Validate input with Zod schema
  const validated = WoUpdate.parse(patch);

  // ⚡ FIXED: Fetch existing work order to check state transitions
  // NO_LEAN: Document used for state validation and comparison before update
  const existing = await WorkOrder.findById(id);
  if (!existing) {
    throw new Error(`Work order not found: ${id}`);
  }

  const existingOrgId = (existing as { orgId?: Types.ObjectId | string }).orgId;
  if (existingOrgId && existingOrgId.toString() !== orgId) {
    throw new Error(`Work order not found: ${id}`); // Don't leak existence
  }

  // ⚡ FIXED: Validate state machine transitions if status is changing
  if (validated.status && validated.status !== existing.status) {
    const validTransitions = _VALID_TRANSITIONS[existing.status] || [];
    if (!validTransitions.includes(validated.status)) {
      throw new Error(
        `Invalid state transition from ${existing.status} to ${validated.status}. ` +
          `Valid transitions: ${validTransitions.join(", ")}`,
      );
    }
  }

  const setUpdate: Record<string, unknown> = {};

  if (validated.title) setUpdate.title = validated.title;
  if (validated.description) setUpdate.description = validated.description;
  if (validated.priority) setUpdate.priority = validated.priority;
  if (validated.category) setUpdate.category = validated.category;
  if (validated.subcategory) setUpdate.subcategory = validated.subcategory;

  if (validated.assignmentUserId) {
    setUpdate["assignment.assignedTo.userId"] = validated.assignmentUserId;
  }
  if (validated.assignmentVendorId) {
    setUpdate["assignment.assignedTo.vendorId"] = validated.assignmentVendorId;
  }
  if (validated.assignmentUserId || validated.assignmentVendorId) {
    setUpdate["assignment.assignedBy"] = actorId;
    setUpdate["assignment.assignedAt"] = new Date();
  }

  if (validated.slaHours) {
    const minutes = validated.slaHours * 60;
    setUpdate["sla.resolutionTimeMinutes"] = minutes;
    setUpdate["sla.resolutionDeadline"] = new Date(
      Date.now() + minutes * 60 * 1000,
    );
  }

  if (validated.responseMinutes) {
    setUpdate["sla.responseTimeMinutes"] = validated.responseMinutes;
    setUpdate["sla.responseDeadline"] = new Date(
      Date.now() + validated.responseMinutes * 60 * 1000,
    );
  }

  if (validated.scheduledAt) {
    setUpdate["assignment.scheduledDate"] = validated.scheduledAt;
  }
  if (validated.startedAt) {
    setUpdate["work.actualStartTime"] = validated.startedAt;
  }
  if (validated.completedAt) {
    setUpdate["work.actualEndTime"] = validated.completedAt;
  }

  if (validated.status) {
    setUpdate.status = validated.status;
  }

  if (Object.keys(setUpdate).length === 0) {
    return existing;
  }

  const updatePayload: Record<string, unknown> = { $set: setUpdate };

  if (validated.status && validated.status !== existing.status) {
    updatePayload.$push = {
      statusHistory: {
        fromStatus: existing.status,
        toStatus: validated.status,
        changedBy: actorId,
        changedAt: new Date(),
        notes: "Updated via wo.service",
      },
    };
  }

  const updated = await WorkOrder.findByIdAndUpdate(id, updatePayload, {
    new: true,
  });

  logger.info(
    `Work order updated: ${describeWorkOrder(updated)} by ${actorId} from ${ip || "unknown"}`,
  );
  return updated;
}

export async function list(orgId: string, q?: string, status?: string) {
  await connectToDatabase();

  const filters: Record<string, unknown> = { orgId, isDeleted: { $ne: true } };

  if (status) {
    filters.status = status;
  }

  if (q) {
    // SECURITY: Escape regex special characters to prevent ReDoS
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.$or = [
      { workOrderNumber: new RegExp(escapedQ, "i") },
      { title: new RegExp(escapedQ, "i") },
      { description: new RegExp(escapedQ, "i") },
    ];
  }

  return await WorkOrder.find(filters).sort({ createdAt: -1 }).lean();
}
