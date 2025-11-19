import type { DefaultSession } from 'next-auth';
import type { WorkOrder, WorkOrderUser } from '@/types/fm';

/**
 * Map a MongoDB work order document to the API WorkOrder shape.
 */
export function mapWorkOrderDocument(doc: any): WorkOrder {
  if (!doc) {
    throw new Error('Work order document is required');
  }

  return {
    id: doc._id?.toString?.() ?? doc.id,
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
  };
}

type SessionUser = (DefaultSession['user'] & { id?: string | null; role?: string | null }) | null | undefined;

/**
 * Build a WorkOrderUser structure using session/user metadata.
 */
export function buildWorkOrderUser(user: SessionUser, overrides: Partial<WorkOrderUser> = {}): WorkOrderUser {
  const fallbackName = (user?.name ?? user?.email ?? 'User').trim();
  const [firstName, ...rest] = fallbackName.split(/\s+/);

  return {
    id: (user?.id ?? user?.email ?? overrides.id ?? 'unknown').toString(),
    firstName: overrides.firstName ?? (firstName || 'User'),
    lastName: overrides.lastName ?? rest.join(' '),
    avatar: overrides.avatar ?? undefined,
    role: overrides.role ?? (user?.role ?? undefined),
    email: overrides.email ?? (user?.email ?? undefined),
    phone: overrides.phone ?? undefined,
  };
}
