/**
 * FM Work Orders API - FSM State Transitions
 * POST /api/fm/work-orders/[id]/transition
 * 
 * Handles work order state transitions according to FSM rules
 * Enforces RBAC permissions and validates transitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb-unified';
import { FMErrors } from '@/app/api/fm/errors';
import {
  WORK_ORDER_FSM,
  canTransition,
  can,
  Role as FMRole,
  Plan as FMPlan,
  SubmoduleKey,
  WOStatus,
  type ResourceCtx,
} from '@/domain/fm/fm.behavior';
import {
  getCanonicalUserId,
  mapWorkOrderDocument,
  recordTimelineEntry,
  type WorkOrderDocument,
} from '../../utils';
import { resolveTenantId } from '../../../utils/tenant';
import { getSessionUser, UnauthorizedError, type SessionUser } from '@/server/middleware/withAuthRbac';

interface AttachmentWithCategory {
  category?: string;
  type?: string;
  [key: string]: unknown;
}

interface WorkOrderForTransition {
  orgId?: { toString?: () => string } | string;
  propertyId?: string;
  requesterId?: string;
  ownerUserId?: string;
  location?: string | { propertyId?: string };
  requester?: { userId?: string };
  assignment?: {
    assignedTo?: {
      userId?: string;
      vendorId?: string;
      technicianId?: string;
    };
  };
  attachments?: AttachmentWithCategory[];
  [key: string]: unknown;
}
import { requireFmAbility } from '../../../utils/auth';
import type { NotificationChannel, NotificationRecipient } from '@/lib/fm-notifications';

/**
 * POST - Transition work order to new status
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const abilityCheck = await requireFmAbility('STATUS')(req);
    if (abilityCheck instanceof NextResponse) return abilityCheck;

    const user = await getSessionUser(req);
    const tenantResult = resolveTenantId(req, user.orgId || user.tenantId);
    if ('error' in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return FMErrors.invalidId('work order');
    }

    const body = await req.json();
    const { toStatus, comment, metadata } = body;

    if (!isWOStatus(toStatus)) {
      return FMErrors.validationError('Invalid target status');
    }

    const actorRole = mapSessionRole(user.role);
    if (!actorRole) {
      return FMErrors.forbidden('Role not allowed to transition work orders');
    }

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>('workorders');
    const workOrder = await collection.findOne({
      _id: new ObjectId(id),
      tenantId,
    });

    if (!workOrder) {
      return FMErrors.notFound('Work order');
    }

    const currentStatus = toWorkOrderStatus(workOrder.status);
    if (!currentStatus) {
      return FMErrors.validationError('Unsupported work order status', {
        currentStatus: workOrder.status
      });
    }

    const transition = WORK_ORDER_FSM.transitions.find(
      (t) => t.from === currentStatus && t.to === toStatus && t.by.includes(actorRole)
    );

    if (!transition) {
      const allowedTransitions = WORK_ORDER_FSM.transitions
        .filter((t) => t.from === currentStatus)
        .map((t) => t.to);
      return FMErrors.invalidTransition(
        `Cannot transition from ${currentStatus} to ${toStatus}`,
        allowedTransitions
      );
    }

    const actorContext = buildResourceContext(workOrder, user, tenantId, actorRole);

    const guardFailure = getTransitionGuardFailure(transition, actorContext);
    if (guardFailure) {
      return FMErrors.validationError(guardFailure, {
        required: transition.requireMedia
      });
    }

    if (!canTransition(currentStatus, toStatus, actorRole, actorContext)) {
      if (transition.action && !can(SubmoduleKey.WO_TRACK_ASSIGN, transition.action, actorContext)) {
        return FMErrors.forbidden(`Role ${actorRole} cannot perform action ${transition.action}`);
      }
      return FMErrors.validationError('Transition not permitted - guard validation failed');
    }

    // Build update object
    const update: Record<string, unknown> & { status: WOStatus; updatedAt: Date } = {
      status: toStatus,
      updatedAt: new Date(),
    };

    // Set timestamps based on status
    if (toStatus === WOStatus.IN_PROGRESS && !workOrder.startedAt) {
      update.startedAt = new Date();
    }
    if (toStatus === WOStatus.WORK_COMPLETE && !workOrder.completedAt) {
      update.completedAt = new Date();
    }

    // Apply update
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id), tenantId },
      { $set: update },
      { returnDocument: 'after' }
    );
    const updated = result?.value;

    if (!updated) {
      return FMErrors.notFound('Work order');
    }

    // Add timeline entry
    const actorId = getCanonicalUserId(user);
    if (!actorId) {
      return FMErrors.validationError('User identifier is required');
    }

    await recordTimelineEntry(db, {
      workOrderId: workOrder._id?.toString?.() ?? id,
      tenantId,
      action: 'status_changed',
      description: `Status changed from ${currentStatus} to ${toStatus}`,
      metadata: {
        fromStatus: currentStatus,
        toStatus,
        comment,
        transitionMetadata: metadata,
      },
      performedBy: actorId,
      performedAt: new Date(),
    });

    // Trigger notifications for important status changes
    try {
      const { onAssign } = await import('@/lib/fm-notifications');
      const recipients: NotificationRecipient[] = [];

      // Notify requester on completion
      if ((toStatus === WOStatus.WORK_COMPLETE || toStatus === WOStatus.CLOSED) && workOrder.requesterId) {
        const requester = await db.collection('users').findOne({ 
          $or: [
            { _id: new ObjectId(workOrder.requesterId) },
            { email: workOrder.requesterId }
          ]
        });
        if (requester?.email) {
          recipients.push({
            userId: workOrder.requesterId,
            name: requester.name || requester.email,
            email: requester.email,
            phone: requester.phone,
            preferredChannels: ['email', 'push'] as NotificationChannel[],
          });
        }
      }

      // Notify assignee on new assignment
      if (toStatus === WOStatus.IN_PROGRESS && workOrder.assigneeId) {
        const assignee = await db.collection('users').findOne({ _id: new ObjectId(workOrder.assigneeId) });
        if (assignee?.email) {
          recipients.push({
            userId: workOrder.assigneeId,
            name: assignee.name || assignee.email,
            email: assignee.email,
            phone: assignee.phone,
            preferredChannels: ['email', 'push'] as NotificationChannel[],
          });
        }
      }

      if (recipients.length > 0) {
        await onAssign(
          workOrder.workOrderNumber || id,
          user.name || user.email || 'Manager',
          `Status changed to ${toStatus}`,
          recipients
        );
      }
    } catch (notifError) {
      logger.error('Failed to send transition notification', notifError as Error);
    }

    // Check SLA compliance
    if (updated.slaHours && updated.createdAt) {
      const elapsedHours = (new Date().getTime() - new Date(updated.createdAt).getTime()) / (1000 * 60 * 60);
      if (elapsedHours > updated.slaHours && toStatus !== WOStatus.CLOSED) {
        const breachHours = Math.floor(elapsedHours - updated.slaHours);
        logger.warn('Work order SLA breach detected', {
          workOrderId: id,
          workOrderNumber: updated.workOrderNumber,
          slaHours: updated.slaHours,
          elapsedHours: Math.floor(elapsedHours),
          breachHours,
          currentStatus: toStatus
        });

        // Notify managers about SLA breach
        try {
          const managers = await db.collection('users').find({
            tenantId,
            role: { $in: ['ADMIN', 'MANAGER', 'FM_MANAGER', 'PROPERTY_MANAGER'] }
          }).limit(50).toArray(); // Limit to prevent memory issues with large orgs

          if (managers.length > 0) {
            const { onAssign } = await import('@/lib/fm-notifications');
            const managerRecipients = managers
              .filter(m => m.email)
              .map(m => ({
                userId: m._id.toString(),
                name: m.name || m.email,
                email: m.email,
                phone: m.phone,
                preferredChannels: ['email', 'push'] as NotificationChannel[],
              }));

            await onAssign(
              updated.workOrderNumber || id,
              'SLA Manager',
              `⚠️ SLA BREACH: Work order ${updated.workOrderNumber || id} has exceeded SLA by ${breachHours} hours (${updated.slaHours}h limit). Current status: ${toStatus}`,
              managerRecipients
            );
          }
        } catch (slaNotifError) {
          logger.error('Failed to send SLA breach notification', slaNotifError as Error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: mapWorkOrderDocument(updated),
      message: `Work order transitioned to ${toStatus}`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return FMErrors.unauthorized();
    }
    logger.error('FM Work Order Transition API error', error as Error);
    return FMErrors.internalError();
  }
}

const ROLE_ALIASES: Record<string, FMRole> = {
  ADMIN: FMRole.CORPORATE_ADMIN,
  MANAGER: FMRole.MANAGEMENT,
  FM_MANAGER: FMRole.MANAGEMENT,
  PROPERTY_MANAGER: FMRole.MANAGEMENT,
  DISPATCHER: FMRole.EMPLOYEE,
  OWNER: FMRole.PROPERTY_OWNER,
  OWNER_DEPUTY: FMRole.OWNER_DEPUTY,
  PROPERTY_OWNER: FMRole.PROPERTY_OWNER,
  CUSTOMER: FMRole.TENANT,
  SUPPORT: FMRole.EMPLOYEE,
};

const PLAN_ALIASES: Record<string, FMPlan> = {
  STARTER: FMPlan.STARTER,
  FREE: FMPlan.STARTER,
  BASIC: FMPlan.STARTER,
  STANDARD: FMPlan.STANDARD,
  DEFAULT: FMPlan.STANDARD,
  PRO: FMPlan.PRO,
  PROFESSIONAL: FMPlan.PRO,
  PREMIUM: FMPlan.PRO,
  ENTERPRISE: FMPlan.ENTERPRISE,
  CUSTOM: FMPlan.ENTERPRISE,
};

const LEGACY_STATUS_MAP: Record<string, WOStatus> = {
  DRAFT: WOStatus.NEW,
  SUBMITTED: WOStatus.ASSESSMENT,
  ASSIGNED: WOStatus.ASSESSMENT,
  OPEN: WOStatus.ASSESSMENT,
  ON_HOLD: WOStatus.ASSESSMENT,
  APPROVED: WOStatus.APPROVED,
  VERIFIED: WOStatus.QUALITY_CHECK,
  COMPLETED: WOStatus.WORK_COMPLETE,
  FINISHED: WOStatus.WORK_COMPLETE,
  IN_PROGRESS: WOStatus.IN_PROGRESS,
  PENDING_APPROVAL: WOStatus.PENDING_APPROVAL,
  CANCELLED: WOStatus.CLOSED,
  CLOSED: WOStatus.CLOSED,
  WORK_COMPLETE: WOStatus.WORK_COMPLETE,
  QUALITY_CHECK: WOStatus.QUALITY_CHECK,
  FINANCIAL_POSTING: WOStatus.FINANCIAL_POSTING,
};

function isWOStatus(value: unknown): value is WOStatus {
  if (typeof value !== 'string') return false;
  return (Object.values(WOStatus) as string[]).includes(value);
}

function toWorkOrderStatus(input: unknown): WOStatus | null {
  if (isWOStatus(input)) return input;
  if (typeof input !== 'string') return null;
  const normalized = input.toUpperCase();
  return LEGACY_STATUS_MAP[normalized] ?? null;
}

function mapSessionRole(role?: string | null): FMRole | null {
  if (!role) return null;
  const normalized = role.trim().toUpperCase();
  if ((Object.values(FMRole) as string[]).includes(normalized)) {
    return normalized as FMRole;
  }
  return ROLE_ALIASES[normalized] ?? null;
}

function resolvePlan(plan?: string | null): FMPlan {
  if (!plan) return FMPlan.STANDARD;
  const normalized = plan.toUpperCase();
  return PLAN_ALIASES[normalized] ?? FMPlan.STANDARD;
}

function buildResourceContext(
  workOrder: WorkOrderForTransition,
  user: SessionUser,
  tenantId: string,
  role: FMRole
): ResourceCtx {
  const userId = (user?.id ?? user?.email ?? 'unknown').toString();
  const orgId = workOrder.orgId?.toString?.() ?? tenantId;
  const propertyId = workOrder.propertyId ?? workOrder.location?.propertyId;
  const requesterId = workOrder.requesterId ?? workOrder.requester?.userId;
  const ownerId = workOrder.ownerUserId ?? workOrder.requester?.userId ?? requesterId;

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

function collectUploadedMedia(attachments: AttachmentWithCategory[] | undefined): ResourceCtx['uploadedMedia'] {
  if (!attachments?.length) return [];
  const allowed = new Set(['BEFORE', 'AFTER', 'DURING', 'QUOTE']);
  const collected = attachments
    .map((attachment) => attachment?.category ?? attachment?.type)
    .filter((cat): cat is string => Boolean(cat))
    .map((category) => category.toString().toUpperCase());
  return Array.from(
    new Set(collected.filter((value) => allowed.has(value)))
  ) as ResourceCtx['uploadedMedia'];
}

function isActorAssignedToWorkOrder(workOrder: WorkOrderForTransition, user: SessionUser): boolean {
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

function getTransitionGuardFailure(
  transition: (typeof WORK_ORDER_FSM.transitions)[number],
  ctx: ResourceCtx
): string | null {
  if (transition.requireMedia?.length) {
    const missing = transition.requireMedia.filter(
      (media) => !ctx.uploadedMedia?.includes(media)
    );
    if (missing.length) {
      return `${missing.join(' & ')} media required before continuing`;
    }
  }

  if (transition.guard === 'technicianAssigned' && !ctx.isTechnicianAssigned) {
    return 'Assign a technician before performing this transition';
  }

  return null;
}
