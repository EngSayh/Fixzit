/**
 * @fileoverview Work Order Service - Core Business Logic Layer
 * @module services/fm/work-order-service
 *
 * Provides centralized business logic for work order operations including:
 * - Status transitions and workflow enforcement (FSM)
 * - Statistics aggregation for dashboards
 * - SLA timer integration (deadline calculation, overdue detection)
 * - Assignment and escalation workflows
 *
 * Aligned with:
 * - domain/fm/fm.behavior.ts: WORK_ORDER_FSM, WOStatus enum, canTransition()
 * - server/models/WorkOrder.ts: Mongoose schema for persistence
 * - types/fm/work-order.ts: WOStatus, WOPriority enums
 *
 * @status IMPLEMENTED - TODO-003 resolved [AGENT-001-A]
 * @author [AGENT-001-A]
 * @created 2025-12-25
 * @updated 2025-12-26 - Full implementation
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import {
  WORK_ORDER_FSM,
  canTransition,
  WOStatus,
  Role,
  Plan,
  type ResourceCtx,
} from "@/domain/fm/fm.behavior";
import { WOPriority } from "@/types/fm/work-order";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Re-export canonical enums for external consumers
 */
export { WOStatus, WOPriority };

/**
 * Transition result from status change operations
 */
export interface TransitionResult {
  success: boolean;
  fromStatus: WOStatus;
  toStatus: WOStatus;
  transitionedAt: Date;
  transitionedBy: string;
  reason?: string;
  error?: string;
}

/**
 * Statistics for work order dashboards
 */
export interface WorkOrderStats {
  total: number;
  byStatus: Partial<Record<WOStatus, number>>;
  byPriority: Partial<Record<WOPriority, number>>;
  overdue: number;
  completedThisWeek: number;
  completedThisMonth: number;
  averageResolutionHours: number;
}

/**
 * Filter options for work order queries
 */
export interface WorkOrderFilter {
  orgId: string;
  status?: WOStatus | WOStatus[];
  priority?: WOPriority | WOPriority[];
  assigneeId?: string;
  propertyId?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Assignment options
 */
export interface AssignmentOptions {
  workOrderId: string;
  assigneeId: string;
  assigneeType: "user" | "team" | "vendor";
  assignedBy: string;
  orgId: string;
  notes?: string;
}

/**
 * Escalation options
 */
export interface EscalationOptions {
  workOrderId: string;
  escalatedBy: string;
  reason: string;
  orgId: string;
  newPriority?: WOPriority;
}

// Internal document type for aggregation results
// Using Document for flexibility with MongoDB native driver updates
interface WorkOrderDoc extends WithId<Document> {
  orgId: string;
  status: string;
  priority: string;
  createdAt?: Date;
  completedAt?: Date;
  sla?: {
    resolutionDeadline?: Date;
    resolutionTimeMinutes?: number;
  };
  assignment?: {
    assignedTo?: {
      userId?: string | ObjectId;
      teamId?: string | ObjectId;
      vendorId?: string | ObjectId;
    };
    assignedAt?: Date;
    reassignmentHistory?: unknown[];
  };
  statusHistory?: unknown[];
  communication?: {
    updates?: unknown[];
  };
  metrics?: {
    escalationCount?: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Terminal statuses where work is complete
 */
const TERMINAL_STATUSES: Set<WOStatus> = new Set([
  WOStatus.CLOSED,
  WOStatus.FINANCIAL_POSTING,
  WOStatus.WORK_COMPLETE,
]);

/**
 * Default SLA hours by priority (used when org config is not available)
 */
const DEFAULT_SLA_HOURS: Record<WOPriority, number> = {
  [WOPriority.CRITICAL]: 4,
  [WOPriority.HIGH]: 8,
  [WOPriority.MEDIUM]: 24,
  [WOPriority.LOW]: 72,
};

/**
 * Priority escalation order
 */
const PRIORITY_ORDER: WOPriority[] = [
  WOPriority.LOW,
  WOPriority.MEDIUM,
  WOPriority.HIGH,
  WOPriority.CRITICAL,
];

// ============================================================================
// WorkOrderService Class
// ============================================================================

/**
 * Work Order Service
 *
 * Provides business logic for work order operations.
 * All methods require orgId for multi-tenant isolation (STRICT v4.1 compliant).
 */
export class WorkOrderService {
  // ==========================================================================
  // Statistics Methods
  // ==========================================================================

  /**
   * Get aggregated statistics for work orders
   *
   * @param filter - Query filters including required orgId
   * @returns Aggregated statistics
   */
  static async getStats(filter: WorkOrderFilter): Promise<WorkOrderStats> {
    const db = await getDatabase();
    const collection = db.collection<WorkOrderDoc>(COLLECTIONS.WORK_ORDERS);

    // Build base match filter with tenant isolation
    const match: Record<string, unknown> = { orgId: filter.orgId };

    if (filter.status) {
      match.status = Array.isArray(filter.status)
        ? { $in: filter.status }
        : filter.status;
    }
    if (filter.priority) {
      match.priority = Array.isArray(filter.priority)
        ? { $in: filter.priority }
        : filter.priority;
    }
    if (filter.assigneeId) {
      match["assignment.assignedTo.userId"] = filter.assigneeId;
    }
    if (filter.propertyId) {
      if (!ObjectId.isValid(filter.propertyId)) {
        logger.warn(`[WorkOrderService.getStats] Invalid propertyId: ${filter.propertyId}`);
        // Return empty stats for invalid ID instead of throwing
        return {
          total: 0,
          byStatus: {},
          byPriority: {},
          overdue: 0,
          completedThisWeek: 0,
          completedThisMonth: 0,
          averageResolutionHours: 0,
        };
      }
      match["location.propertyId"] = new ObjectId(filter.propertyId);
    }
    if (filter.fromDate || filter.toDate) {
      match.createdAt = {};
      if (filter.fromDate) (match.createdAt as Record<string, Date>).$gte = filter.fromDate;
      if (filter.toDate) (match.createdAt as Record<string, Date>).$lte = filter.toDate;
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run aggregation pipeline
    const [
      totalResult,
      statusAgg,
      priorityAgg,
      completionAgg,
      overdueCount,
    ] = await Promise.all([
      collection.countDocuments(match),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: match },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: match },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ])
        .toArray(),
      collection
        .aggregate<{
          avgResolutionHours: number;
          completedThisWeek: number;
          completedThisMonth: number;
        }>([
          {
            $match: {
              ...match,
              completedAt: { $ne: null },
              createdAt: { $ne: null },
            },
          },
          {
            $project: {
              resolutionHours: {
                $divide: [
                  { $subtract: ["$completedAt", "$createdAt"] },
                  1000 * 60 * 60,
                ],
              },
              completedAt: 1,
            },
          },
          {
            $group: {
              _id: null,
              avgResolutionHours: { $avg: "$resolutionHours" },
              completedThisWeek: {
                $sum: { $cond: [{ $gte: ["$completedAt", weekAgo] }, 1, 0] },
              },
              completedThisMonth: {
                $sum: { $cond: [{ $gte: ["$completedAt", monthAgo] }, 1, 0] },
              },
            },
          },
        ])
        .toArray(),
      collection.countDocuments({
        ...match,
        completedAt: { $exists: false },
        "sla.resolutionDeadline": { $lt: now },
        status: { $nin: Array.from(TERMINAL_STATUSES) },
      }),
    ]);

    // Transform aggregation results
    const byStatus: Partial<Record<WOStatus, number>> = {};
    for (const { _id, count } of statusAgg) {
      byStatus[_id as WOStatus] = count;
    }

    const byPriority: Partial<Record<WOPriority, number>> = {};
    for (const { _id, count } of priorityAgg) {
      byPriority[_id as WOPriority] = count;
    }

    const completionMetrics = completionAgg[0] ?? {
      avgResolutionHours: 0,
      completedThisWeek: 0,
      completedThisMonth: 0,
    };

    logger.debug("[WorkOrderService.getStats] Completed", {
      orgId: filter.orgId,
      total: totalResult,
      overdue: overdueCount,
    });

    return {
      total: totalResult,
      byStatus,
      byPriority,
      overdue: overdueCount,
      completedThisWeek: completionMetrics.completedThisWeek,
      completedThisMonth: completionMetrics.completedThisMonth,
      averageResolutionHours: Number(
        completionMetrics.avgResolutionHours?.toFixed(2) ?? 0,
      ),
    };
  }

  // ==========================================================================
  // Status Transition Methods
  // ==========================================================================

  /**
   * Get allowed transitions from current status based on WORK_ORDER_FSM
   *
   * @param currentStatus - The work order's current status
   * @returns Array of valid next statuses
   */
  static getValidTransitions(currentStatus: WOStatus): WOStatus[] {
    return WORK_ORDER_FSM.transitions
      .filter((t) => t.from === currentStatus)
      .map((t) => t.to as WOStatus);
  }

  /**
   * Check if a status transition is valid for a given role
   *
   * @param fromStatus - Current status
   * @param toStatus - Desired next status
   * @param role - Role attempting the transition
   * @returns true if transition is allowed
   */
  static isValidTransition(
    fromStatus: WOStatus,
    toStatus: WOStatus,
    role?: Role,
  ): boolean {
    const transition = WORK_ORDER_FSM.transitions.find(
      (t) => t.from === fromStatus && t.to === toStatus,
    );
    if (!transition) return false;
    if (role && !transition.by.includes(role)) return false;
    return true;
  }

  /**
   * Perform a status transition with validation and audit logging
   *
   * @param workOrderId - Work order to transition
   * @param toStatus - Target status
   * @param userId - User performing the transition
   * @param orgId - Organization ID for tenant isolation
   * @param role - Role of the user performing transition
   * @param reason - Optional reason for transition
   * @param resourceCtx - Optional resource context for guard checks
   * @returns Transition result with success/error info
   */
  static async transitionStatus(
    workOrderId: string,
    toStatus: WOStatus,
    userId: string,
    orgId: string,
    role: Role,
    reason?: string,
    resourceCtx?: Partial<ResourceCtx>,
  ): Promise<TransitionResult> {
    const db = await getDatabase();
    const collection = db.collection<WorkOrderDoc>(COLLECTIONS.WORK_ORDERS);

    // Fetch current work order with tenant isolation
    const workOrder = await collection.findOne({
      _id: new ObjectId(workOrderId),
      orgId,
    });

    if (!workOrder) {
      return {
        success: false,
        fromStatus: WOStatus.NEW,
        toStatus,
        transitionedAt: new Date(),
        transitionedBy: userId,
        reason,
        error: "Work order not found or access denied",
      };
    }

    const fromStatus = workOrder.status as WOStatus;

    // Build resource context for canTransition check
    const ctx: ResourceCtx = {
      orgId,
      role,
      userId,
      plan: resourceCtx?.plan ?? Plan.STANDARD, // Default to STANDARD if not provided
      isOrgMember: true,
      isTechnicianAssigned:
        workOrder.assignment?.assignedTo?.userId?.toString() === userId,
      uploadedMedia: resourceCtx?.uploadedMedia ?? [],
      ...resourceCtx,
    };

    // Validate transition using domain FSM
    if (!canTransition(fromStatus, toStatus, role, ctx)) {
      const allowedTransitions = this.getValidTransitions(fromStatus);
      return {
        success: false,
        fromStatus,
        toStatus,
        transitionedAt: new Date(),
        transitionedBy: userId,
        reason,
        error: `Invalid transition from ${fromStatus} to ${toStatus}. Allowed: ${allowedTransitions.join(", ") || "none"}`,
      };
    }

    // Build update
    const now = new Date();
    const update: Record<string, unknown> = {
      status: toStatus,
      updatedAt: now,
    };

    // Set timestamps based on status
    if (toStatus === WOStatus.IN_PROGRESS && !workOrder.startedAt) {
      update.startedAt = now;
    }
    if (toStatus === WOStatus.WORK_COMPLETE) {
      update.completedAt = now;
    }

    // Add status history entry
    const historyEntry = {
      fromStatus,
      toStatus,
      changedBy: userId,
      changedAt: now,
      reason: reason ?? undefined,
    };

    // Apply update
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(workOrderId), orgId },
      {
        $set: update,
        $push: { statusHistory: historyEntry },
      } as Document,
      { returnDocument: "after" },
    );

    if (!result) {
      return {
        success: false,
        fromStatus,
        toStatus,
        transitionedAt: now,
        transitionedBy: userId,
        reason,
        error: "Failed to update work order",
      };
    }

    logger.info("[WorkOrderService.transitionStatus] Success", {
      workOrderId,
      fromStatus,
      toStatus,
      userId,
      orgId,
    });

    return {
      success: true,
      fromStatus,
      toStatus,
      transitionedAt: now,
      transitionedBy: userId,
      reason,
    };
  }

  // ==========================================================================
  // SLA Integration Methods
  // ==========================================================================

  /**
   * Calculate SLA deadline based on priority
   *
   * Uses default SLA hours. For org-specific SLA configuration,
   * extend to fetch from org settings collection.
   *
   * @param priority - Work order priority
   * @param createdAt - When the work order was created
   * @returns Calculated due date
   */
  static calculateDueDate(
    priority: WOPriority,
    createdAt: Date = new Date(),
  ): Date {
    const hoursToAdd = DEFAULT_SLA_HOURS[priority] ?? 24;
    return new Date(createdAt.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  /**
   * Calculate SLA response and resolution times in minutes
   *
   * @param priority - Work order priority
   * @returns SLA configuration with response and resolution times
   */
  static getSLAConfig(priority: WOPriority): {
    responseTimeMinutes: number;
    resolutionTimeMinutes: number;
  } {
    const hours = DEFAULT_SLA_HOURS[priority] ?? 24;
    return {
      responseTimeMinutes: Math.floor(hours * 6), // 10% of resolution time
      resolutionTimeMinutes: hours * 60,
    };
  }

  /**
   * Check if a work order is overdue based on SLA deadline
   *
   * @param resolutionDeadline - SLA resolution deadline
   * @param status - Current status
   * @returns true if overdue
   */
  static isOverdue(resolutionDeadline: Date, status: WOStatus): boolean {
    if (TERMINAL_STATUSES.has(status)) {
      return false;
    }
    return new Date() > new Date(resolutionDeadline);
  }

  // ==========================================================================
  // Assignment Methods
  // ==========================================================================

  /**
   * Assign a work order to a user, team, or vendor
   *
   * @param options - Assignment options
   * @returns Assignment result
   */
  static async assignWorkOrder(
    options: AssignmentOptions,
  ): Promise<{ success: boolean; error?: string }> {
    const { workOrderId, assigneeId, assigneeType, assignedBy, orgId, notes } =
      options;

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDoc>(COLLECTIONS.WORK_ORDERS);

    // Verify work order exists with tenant isolation
    const workOrder = await collection.findOne({
      _id: new ObjectId(workOrderId),
      orgId,
    });

    if (!workOrder) {
      return { success: false, error: "Work order not found or access denied" };
    }

    // Validate ObjectIds before conversion
    if (!ObjectId.isValid(assigneeId)) {
      return { success: false, error: `Invalid assigneeId format: ${assigneeId}` };
    }
    if (!ObjectId.isValid(assignedBy)) {
      return { success: false, error: `Invalid assignedBy format: ${assignedBy}` };
    }

    // Build assignment object based on type
    const assignedTo: Record<string, ObjectId> = {};
    if (assigneeType === "user") {
      assignedTo.userId = new ObjectId(assigneeId);
    } else if (assigneeType === "team") {
      assignedTo.teamId = new ObjectId(assigneeId);
    } else if (assigneeType === "vendor") {
      assignedTo.vendorId = new ObjectId(assigneeId);
    }

    const now = new Date();

    // Build update
    const update: Record<string, unknown> = {
      "assignment.assignedTo": assignedTo,
      "assignment.assignedBy": new ObjectId(assignedBy),
      "assignment.assignedAt": now,
      updatedAt: now,
    };

    // If currently NEW, transition to ASSESSMENT (validate via FSM)
    if (workOrder.status === WOStatus.NEW) {
      // Validate transition is allowed per FSM rules
      const ctx: ResourceCtx = {
        orgId,
        role: Role.PROPERTY_MANAGER, // Assignment implies management role
        userId: assignedBy,
        plan: Plan.STANDARD,
        isOrgMember: true,
        isTechnicianAssigned: false,
      };
      if (canTransition(WOStatus.NEW, WOStatus.ASSESSMENT, Role.PROPERTY_MANAGER, ctx)) {
        update.status = WOStatus.ASSESSMENT;
        // Add status history entry for audit trail
        const statusHistoryEntry = {
          fromStatus: WOStatus.NEW,
          toStatus: WOStatus.ASSESSMENT,
          changedBy: assignedBy,
          changedAt: now,
          reason: "Auto-transition on assignment",
        };
        // Will be pushed separately below
        (update as Record<string, unknown>)._statusHistoryEntry = statusHistoryEntry;
      }
    }

    // Extract status history entry if we're auto-transitioning
    const statusHistoryEntry = (update as Record<string, unknown>)._statusHistoryEntry;
    delete (update as Record<string, unknown>)._statusHistoryEntry;

    // Build the $push operations
    const pushOps: Record<string, unknown> = {
      "assignment.reassignmentHistory": {
        fromUserId: workOrder.assignment?.assignedTo?.userId ?? null,
        toUserId: assignedTo.userId ?? assignedTo.teamId ?? assignedTo.vendorId,
        reason: notes,
        assignedBy: new ObjectId(assignedBy),
        assignedAt: now,
      },
    };

    // Add status history entry if we auto-transitioned
    if (statusHistoryEntry) {
      pushOps.statusHistory = statusHistoryEntry;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(workOrderId), orgId },
      {
        $set: update,
        $push: pushOps,
      } as Document,
      { returnDocument: "after" },
    );

    if (!result) {
      return { success: false, error: "Failed to update work order assignment" };
    }

    logger.info("[WorkOrderService.assignWorkOrder] Success", {
      workOrderId,
      assigneeId,
      assigneeType,
      assignedBy,
      orgId,
    });

    return { success: true };
  }

  // ==========================================================================
  // Escalation Methods
  // ==========================================================================

  /**
   * Escalate a work order to higher priority
   *
   * @param options - Escalation options
   * @returns Escalation result with new priority
   */
  static async escalate(
    options: EscalationOptions,
  ): Promise<{ success: boolean; newPriority?: WOPriority; error?: string }> {
    const { workOrderId, escalatedBy, reason, orgId, newPriority } = options;

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDoc>(COLLECTIONS.WORK_ORDERS);

    // Fetch work order with tenant isolation
    const workOrder = await collection.findOne({
      _id: new ObjectId(workOrderId),
      orgId,
    });

    if (!workOrder) {
      return { success: false, error: "Work order not found or access denied" };
    }

    // Determine new priority
    const currentPriority = workOrder.priority as WOPriority;
    let targetPriority = newPriority;

    if (!targetPriority) {
      // Auto-escalate to next level
      const currentIndex = PRIORITY_ORDER.indexOf(currentPriority);
      if (currentIndex < PRIORITY_ORDER.length - 1) {
        targetPriority = PRIORITY_ORDER[currentIndex + 1];
      } else {
        return {
          success: false,
          error: "Work order is already at highest priority",
        };
      }
    }

    // Validate escalation direction
    if (
      PRIORITY_ORDER.indexOf(targetPriority) <=
      PRIORITY_ORDER.indexOf(currentPriority)
    ) {
      return {
        success: false,
        error: "Cannot escalate to same or lower priority",
      };
    }

    const now = new Date();

    // Recalculate SLA based on new priority
    const newSlaConfig = this.getSLAConfig(targetPriority);
    const newDeadline = this.calculateDueDate(
      targetPriority,
      workOrder.createdAt ?? now,
    );

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(workOrderId), orgId },
      {
        $set: {
          priority: targetPriority,
          "sla.resolutionTimeMinutes": newSlaConfig.resolutionTimeMinutes,
          "sla.responseTimeMinutes": newSlaConfig.responseTimeMinutes,
          "sla.resolutionDeadline": newDeadline,
          updatedAt: now,
        },
        $inc: { "metrics.escalationCount": 1 },
        $push: {
          "communication.updates": {
            updateType: "ESCALATION",
            description: `Escalated from ${currentPriority} to ${targetPriority}: ${reason}`,
            updatedBy: new ObjectId(escalatedBy),
            updatedAt: now,
            isAutomated: false,
          },
        },
      } as Document,
      { returnDocument: "after" },
    );

    if (!result) {
      return { success: false, error: "Failed to escalate work order" };
    }

    logger.info("[WorkOrderService.escalate] Success", {
      workOrderId,
      fromPriority: currentPriority,
      toPriority: targetPriority,
      escalatedBy,
      orgId,
    });

    return { success: true, newPriority: targetPriority };
  }
}

// ============================================================================
// Export
// ============================================================================

export default WorkOrderService;
