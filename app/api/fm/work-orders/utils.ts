import type { DefaultSession } from "next-auth";
import type { WorkOrder, WorkOrderUser } from "@/types/fm";
import type { ObjectId } from "mongodb";
import { WorkOrderComment } from "@/server/models/workorder/WorkOrderComment";
import { WorkOrderAttachment } from "@/server/models/workorder/WorkOrderAttachment";
import { WorkOrderTimeline } from "@/server/models/workorder/WorkOrderTimeline";

export type WorkOrderDocument = Partial<WorkOrder> & {
  _id?: ObjectId;
  id?: string;
  orgId?: string; // Fixed: added for STRICT v4 multi-tenancy
  workOrderNumber?: string;
  woNumber?: string;
  code?: string;
  category?: string;
  unitId?: string;
  unit_id?: string; // Canonical field per WorkOrder schema
  technicianId?: string;
  vendorId?: string; // Fixed: added for vendor RBAC filtering
  assignedTo?: string; // Fixed: normalized field name (legacy support)
  // Canonical assignment structure per server/models/WorkOrder.ts
  assignment?: {
    assignedTo?: {
      userId?: string | ObjectId;
      teamId?: string | ObjectId;
      vendorId?: string | ObjectId;
      name?: string;
      contactInfo?: {
        phone?: string;
        email?: string;
      };
    };
    assignedBy?: string | ObjectId;
    assignedAt?: Date;
  };
  // Location structure per WorkOrder schema
  location?: {
    propertyId?: string | ObjectId;
    unitNumber?: string;
    floor?: string;
    building?: string;
    area?: string;
    room?: string;
  };
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;
  photos?: unknown[];
  attachments?: unknown[];
  comments?: unknown[];
  timeline?: unknown[];
  requester?: unknown;
  assignee?: unknown;
  technician?: unknown;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * Map a MongoDB work order document to the API WorkOrder shape.
 */
export function mapWorkOrderDocument(doc: WorkOrderDocument): WorkOrder {
  if (!doc) {
    throw new Error("Work order document is required");
  }

  const normalizedId = doc._id?.toString?.() ?? doc.id ?? "";

  return {
    id: normalizedId,
    _id: doc._id?.toString?.(),
    tenantId: doc.tenantId,
    orgId: doc.orgId, // Fixed: include orgId in mapped output
    workOrderNumber: doc.workOrderNumber ?? doc.code ?? doc.woNumber,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    priority: doc.priority,
    category: doc.category,
    propertyId: doc.propertyId,
    unitId: doc.unitId,
    requesterId: doc.requesterId,
    assigneeId: doc.assigneeId ?? doc.assignedTo, // Fixed: support both field names during migration
    technicianId: doc.technicianId,
    vendorId: doc.vendorId, // Fixed: include vendorId
    scheduledAt: doc.scheduledAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    slaHours: doc.slaHours,
    estimatedCost: doc.estimatedCost,
    actualCost: doc.actualCost,
    currency: doc.currency,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    photos: doc.photos,
    attachments: doc.attachments,
    comments: doc.comments,
    timeline: doc.timeline,
    requester: doc.requester,
    assignee: doc.assignee,
    technician: doc.technician,
    tags: doc.tags,
    metadata: doc.metadata,
  } as WorkOrder;
}

type SessionUser =
  | (DefaultSession["user"] & { id?: string | null; role?: string | null })
  | null
  | undefined;

/**
 * Build a WorkOrderUser structure using session/user metadata.
 */
export function buildWorkOrderUser(
  user: SessionUser,
  overrides: Partial<WorkOrderUser> = {},
): WorkOrderUser {
  const fallbackName = (user?.name ?? user?.email ?? "User").trim();
  const [firstName, ...rest] = fallbackName.split(/\s+/);

  return {
    id: (user?.id ?? user?.email ?? overrides.id ?? "unknown").toString(),
    firstName: overrides.firstName ?? (firstName || "User"),
    lastName: overrides.lastName ?? rest.join(" "),
    avatar: overrides.avatar ?? undefined,
    role: overrides.role ?? user?.role ?? undefined,
    email: overrides.email ?? user?.email ?? undefined,
    phone: overrides.phone ?? undefined,
  };
}

export class WorkOrderQuotaError extends Error {
  limit: number;
  constructor(message: string, limit: number) {
    super(message);
    this.name = "WorkOrderQuotaError";
    this.limit = limit;
  }
}

export const WORK_ORDER_COMMENT_LIMIT = 500;
export const WORK_ORDER_ATTACHMENT_LIMIT = 200;
export const WORK_ORDER_TIMELINE_LIMIT = 1000;

export async function assertWorkOrderQuota(
  collectionName: string,
  orgId: string,
  workOrderId: string,
  limit: number,
): Promise<void> {
  const model =
    collectionName === "workorder_comments"
      ? WorkOrderComment
      : collectionName === "workorder_attachments"
        ? WorkOrderAttachment
        : WorkOrderTimeline;

  const existingCount = await model.countDocuments({ orgId, workOrderId });
  if (existingCount >= limit) {
    throw new WorkOrderQuotaError(
      `Maximum ${collectionName.replace("workorder_", "").replace("_", " ")} reached for this work order`,
      limit,
    );
  }
}

type TimelineEntry = {
  workOrderId: string;
  orgId: string;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
  comment?: string;
  performedBy: string | null | undefined;
  performedAt: Date;
};

export async function recordTimelineEntry(
  entry: TimelineEntry,
  limit: number = WORK_ORDER_TIMELINE_LIMIT,
) {
  await WorkOrderTimeline.create({
    orgId: entry.orgId,
    workOrderId: entry.workOrderId,
    performedAt: entry.performedAt,
    action: entry.action,
    description: entry.description,
    metadata: entry.metadata,
    performedBy: entry.performedBy
      ? { id: entry.performedBy }
      : undefined,
  });
  await trimTimelineEntries(entry.orgId, entry.workOrderId, limit);
}

type CanonicalUser = { id?: string | null } | null | undefined;

/**
 * Returns a canonical actor identifier (user id) if available, otherwise null.
 * Ensures we consistently reference the same identifier type in audit records.
 */
export function getCanonicalUserId(user: CanonicalUser): string | null {
  if (!user?.id) return null;
  return user.id.toString();
}

async function trimTimelineEntries(
  orgId: string,
  workOrderId: string,
  limit: number,
) {
  const total = await WorkOrderTimeline.countDocuments({ orgId, workOrderId });
  const excess = total - limit;
  if (excess <= 0) {
    return;
  }

  const oldest = await WorkOrderTimeline.find({ orgId, workOrderId })
    .sort({ performedAt: 1, _id: 1 })
    .limit(excess)
    .select({ _id: 1 })
    .lean();

  const ids = oldest.map((doc) => doc._id).filter(Boolean);
  if (ids.length) {
    await WorkOrderTimeline.deleteMany({ orgId, _id: { $in: ids } });
  }
}
