import type { DefaultSession } from "next-auth";
import type { WorkOrder, WorkOrderUser } from "@/types/fm";
import type { getDatabase } from "@/lib/mongodb-unified";
import type { ObjectId } from "mongodb";

export type WorkOrderDocument = Partial<WorkOrder> & {
  _id?: ObjectId;
  id?: string;
  workOrderNumber?: string;
  woNumber?: string;
  code?: string;
  category?: string;
  unitId?: string;
  technicianId?: string;
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
    workOrderNumber: doc.workOrderNumber ?? doc.code ?? doc.woNumber,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    priority: doc.priority,
    category: doc.category,
    propertyId: doc.propertyId,
    unitId: doc.unitId,
    requesterId: doc.requesterId,
    assigneeId: doc.assigneeId,
    technicianId: doc.technicianId,
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

type MongoDatabase = Awaited<ReturnType<typeof getDatabase>>;

export async function assertWorkOrderQuota(
  db: MongoDatabase,
  collectionName: string,
  tenantId: string,
  workOrderId: string,
  limit: number,
): Promise<void> {
  const existingCount = await db
    .collection(collectionName)
    .countDocuments({ tenantId, workOrderId });
  if (existingCount >= limit) {
    throw new WorkOrderQuotaError(
      `Maximum ${collectionName.replace("workorder_", "").replace("_", " ")} reached for this work order`,
      limit,
    );
  }
}

type TimelineEntry = {
  workOrderId: string;
  tenantId: string;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
  comment?: string;
  performedBy: string | null | undefined;
  performedAt: Date;
};

export async function recordTimelineEntry(
  db: MongoDatabase,
  entry: TimelineEntry,
  limit: number = WORK_ORDER_TIMELINE_LIMIT,
) {
  await db.collection("workorder_timeline").insertOne(entry);
  await trimTimelineEntries(db, entry.tenantId, entry.workOrderId, limit);
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
  db: MongoDatabase,
  tenantId: string,
  workOrderId: string,
  limit: number,
) {
  const collection = db.collection("workorder_timeline");
  const total = await collection.countDocuments({ tenantId, workOrderId });
  const excess = total - limit;
  if (excess <= 0) {
    return;
  }

  const oldest = await collection
    .find({ tenantId, workOrderId })
    .sort({ performedAt: 1, _id: 1 })
    .limit(excess)
    .project({ _id: 1 })
    .toArray();

  const ids = oldest.map((doc) => doc._id).filter(Boolean);
  if (ids.length) {
    await collection.deleteMany({ _id: { $in: ids } });
  }
}
