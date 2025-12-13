/**
 * @fileoverview Transition Context Builder
 * @description Builds resource context for FSM transition validation
 * @module api/fm/work-orders/_lib/transition-context
 */

import type { ResourceCtx } from "@/domain/fm/fm.behavior";
import type { SessionUser } from "@/server/middleware/withAuthRbac";
import type { WorkOrderUser } from "@/types/fm/work-order";
import { Role as FMRole } from "@/domain/fm/fm.behavior";
import { resolvePlan } from "./fsm-transitions";

export interface AttachmentWithCategory {
  category?: string;
  type?: string;
  [key: string]: unknown;
}

export interface WorkOrderForTransition {
  orgId?: { toString?: () => string } | string;
  propertyId?: string;
  requesterId?: string;
  ownerUserId?: string;
  technicianId?: string;
  location?: string | { propertyId?: string };
  requester?: WorkOrderUser | { userId?: string; [key: string]: unknown };
  assignment?: {
    assignedTo?: Record<string, unknown>;
    [key: string]: unknown;
  };
  attachments?: Array<AttachmentWithCategory | string>;
  [key: string]: unknown;
}

/**
 * Build resource context for FSM validation
 */
export function buildResourceContext(
  workOrder: WorkOrderForTransition,
  user: SessionUser,
  tenantId: string,
  role: FMRole,
): ResourceCtx {
  const userId = (user?.id ?? user?.email ?? "unknown").toString();
  const orgId = workOrder.orgId?.toString?.() ?? tenantId;
  const propertyId =
    workOrder.propertyId ??
    (typeof workOrder.location === "object"
      ? workOrder.location?.propertyId
      : undefined);
  const requesterUser = workOrder.requester as
    | WorkOrderUser
    | { userId?: string }
    | undefined;
  const requesterId =
    workOrder.requesterId ??
    (requesterUser && "userId" in requesterUser
      ? requesterUser.userId
      : undefined) ??
    (requesterUser && "id" in requesterUser ? requesterUser.id : undefined);
  const ownerId =
    workOrder.ownerUserId ??
    (requesterUser && "userId" in requesterUser
      ? requesterUser.userId
      : undefined) ??
    (requesterUser && "id" in requesterUser ? requesterUser.id : undefined) ??
    requesterId;

  const isOwnerOfProperty = ownerId ? String(ownerId) === userId : false;
  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const belongsToOrg =
    isSuperAdmin ||
    !user?.orgId ||
    String(user.orgId) === orgId ||
    String(user.orgId) === tenantId;

  return {
    orgId,
    plan: resolvePlan(user?.subscriptionPlan),
    role,
    userId,
    isOrgMember: belongsToOrg,
    isSuperAdmin,
    propertyId: propertyId ? String(propertyId) : undefined,
    requesterUserId: requesterId ? String(requesterId) : undefined,
    isOwnerOfProperty,
    isTechnicianAssigned: isActorAssignedToWorkOrder(workOrder, user),
    uploadedMedia: collectUploadedMedia(workOrder.attachments),
  };
}

/**
 * Collect uploaded media categories from attachments
 */
export function collectUploadedMedia(
  attachments: Array<AttachmentWithCategory | string> | undefined,
): ResourceCtx["uploadedMedia"] {
  if (!attachments?.length) return [];
  const allowed = new Set(["BEFORE", "AFTER", "DURING", "QUOTE"]);
  const collected = attachments
    .map((attachment) =>
      typeof attachment === "string"
        ? undefined
        : (attachment?.category ?? attachment?.type),
    )
    .filter((cat): cat is string => Boolean(cat))
    .map((category) => category.toString().toUpperCase());
  return Array.from(
    new Set(collected.filter((value) => allowed.has(value))),
  ) as ResourceCtx["uploadedMedia"];
}

/**
 * Check if the current user is assigned to the work order
 */
export function isActorAssignedToWorkOrder(
  workOrder: WorkOrderForTransition,
  user: SessionUser,
): boolean {
  const actorId = (user?.id ?? user?.email)?.toString();
  if (!actorId) return false;

  const assignment = workOrder.assignment?.assignedTo;
  const candidateIds = [
    assignment?.userId,
    assignment?.vendorId,
    assignment?.technicianId,
    workOrder.technicianId,
  ]
    .filter(Boolean)
    .map((value) => value?.toString?.() ?? String(value));

  return candidateIds.some((value) => value === actorId);
}
