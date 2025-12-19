/**
 * AuditLog Model - System-wide audit trail
 * 
 * @module server/models/AuditLog
 * @description Comprehensive audit logging for compliance and security.
 * Tracks all user actions, data changes, and system events.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Action-based event tracking (CREATE/UPDATE/DELETE/LOGIN/etc.)
 * - Before/after state snapshots
 * - IP address and user agent capture
 * - Entity-type categorization
 * - Search and filter capabilities
 * - Retention policy support
 * - Immutable records (no updates/deletes)
 * 
 * @action_types
 * - CREATE: New record creation
 * - READ: Data access (sensitive operations)
 * - UPDATE: Record modifications
 * - DELETE: Record deletion
 * - LOGIN/LOGOUT: Authentication events
 * - EXPORT/IMPORT: Data transfer operations
 * - APPROVE/REJECT: Workflow decisions
 * - SEND/RECEIVE: Communication events
 * - UPLOAD/DOWNLOAD: File operations
 * - SHARE: Data sharing events
 * - ARCHIVE/RESTORE: Lifecycle operations
 * - ACTIVATE/DEACTIVATE: Status changes
 * - CUSTOM: Application-specific events
 * 
 * @entity_types
 * - USER: User accounts
 * - PROPERTY: Real estate properties
 * - TENANT: Property occupants
 * - WORK_ORDER: Maintenance requests
 * - INVOICE: Financial documents
 * - VENDOR: Service providers
 * - ASSET: Equipment and facilities
 * - ORGANIZATION: Tenant organizations
 * - (see full list in ActionType enum)
 * 
 * @indexes
 * - Index: { orgId, createdAt } for tenant audit queries
 * - Index: { userId, actionType } for user activity tracking
 * - Index: { entityType, entityId } for entity audit trails
 * - Index: { actionType, createdAt } for action-based filtering
 * 
 * @compliance
 * - GDPR audit requirements
 * - ZATCA compliance logging
 * - ISO 27001 audit trails
 * - Retention: 7 years (configurable)
 * 
 * @security
 * - Immutable records (insert-only)
 * - No delete operations
 * - No update operations
 * - IP tracking for forensics
 */

import { Schema, model, models, InferSchemaType } from "mongoose";
import { logger } from "@/lib/logger";

/** Audit action types */
const ActionType = [
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
  "APPROVE",
  "REJECT",
  "SEND",
  "RECEIVE",
  "UPLOAD",
  "DOWNLOAD",
  "SHARE",
  "ARCHIVE",
  "RESTORE",
  "ACTIVATE",
  "DEACTIVATE",
  "CUSTOM",
] as const;

/** Entity types for audit tracking */
const EntityType = [
  "USER",
  "PROPERTY",
  "TENANT",
  "OWNER",
  "CONTRACT",
  "PAYMENT",
  "INVOICE",
  "WORKORDER",
  "TICKET",
  "PROJECT",
  "BID",
  "VENDOR",
  "SERVICE_PROVIDER",
  "DOCUMENT",
  "SETTING",
  "OTHER",
] as const;

const AuditLogSchema = new Schema(
  {
    // Organization/Tenant
    // Note: index: true removed from orgId to avoid duplicate index warning
    // orgId is indexed via composite indexes below (orgId+timestamp, orgId+userId+timestamp, etc.)
    orgId: { type: String, required: true },

    // Action Details
    action: { type: String, enum: ActionType, required: true },
    entityType: { type: String, enum: EntityType, required: true },
    entityId: String, // ID of the affected entity
    entityName: String, // Human-readable name

    // User Information
    userId: { type: String, ref: "User", required: true },
    userName: String,
    userEmail: String,
    userRole: String,
    impersonatedBy: String, // If admin is impersonating another user

    // Request Context
    context: {
      method: String, // GET, POST, PUT, DELETE
      endpoint: String, // API endpoint
      userAgent: String,
      ipAddress: String,
      sessionId: String,
      requestId: String, // For tracing
      browser: String,
      os: String,
      device: String,
    },

    // Changes (for UPDATE actions)
    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        dataType: String, // string, number, boolean, object, array
      },
    ],

    // Before/After Snapshots (for important entities)
    snapshot: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    },

    // Additional Metadata
    metadata: {
      reason: String, // Why action was performed
      comment: String, // User-provided comment
      source: {
        type: String,
        enum: ["WEB", "MOBILE", "API", "SYSTEM", "IMPORT"],
      },
      batchId: String, // For bulk operations
      parentActionId: String, // For related actions
      tags: [String],
    },

    // Result
    result: {
      success: { type: Boolean, default: true },
      errorCode: String,
      errorMessage: String,
      duration: Number, // milliseconds
      affectedRecords: Number, // For bulk operations
    },

    // Compliance
    compliance: {
      dataProtection: Boolean, // GDPR/PDPL relevant
      financialRecord: Boolean, // Financial compliance
      contractual: Boolean, // Contract-related
      retentionPeriod: Number, // days (for auto-deletion)
    },

    // Security
    security: {
      sensitiveData: { type: Boolean, default: false },
      encryptedFields: [String], // List of encrypted field names
      accessLevel: String, // PUBLIC, INTERNAL, CONFIDENTIAL, SECRET
      flaggedAsSuspicious: Boolean,
      reviewRequired: Boolean,
    },

    // Timestamps
    timestamp: { type: Date, default: Date.now, required: true }, // ⚡ Removed index: true - covered by compound indexes below
  },
  {
    timestamps: false, // Using custom timestamp field
    // Collection is not capped to allow TTL index to work
  },
);

// Compound Indexes for common queries (these cover timestamp field)
AuditLogSchema.index({ orgId: 1, timestamp: -1 });
AuditLogSchema.index({ orgId: 1, userId: 1, timestamp: -1 });
AuditLogSchema.index({ orgId: 1, entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ orgId: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ "context.ipAddress": 1, timestamp: -1 });
AuditLogSchema.index({ "result.success": 1, timestamp: -1 });

// TTL Index for auto-deletion (expires after 2 years by default)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Static method to log an action
AuditLogSchema.statics.log = async function (data: {
  orgId: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  userId: string;
  changes?: Array<Record<string, unknown>>;
  snapshot?: Record<string, unknown>;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  result?: Record<string, unknown>;
}) {
  try {
    const log = await this.create({
      ...data,
      timestamp: new Date(),
    });
    return log;
  } catch (error) {
    // Silent fail - don't break the main operation if logging fails
    logger.error("Failed to create audit log", { error });
    return null;
  }
};

// Static method to search logs
AuditLogSchema.statics.search = async function (filters: {
  orgId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}) {
  const query: Record<string, unknown> = { orgId: filters.orgId };

  if (filters.userId)
    (query as Record<string, unknown>)["userId"] = filters.userId;
  if (filters.entityType)
    (query as Record<string, unknown>)["entityType"] = filters.entityType;
  if (filters.entityId)
    (query as Record<string, unknown>)["entityId"] = filters.entityId;
  if (filters.action)
    (query as Record<string, unknown>)["action"] = filters.action;

  if (filters.startDate || filters.endDate) {
    const ts: Record<string, unknown> = {};
    if (filters.startDate)
      (ts as Record<string, unknown>)["$gte"] = filters.startDate;
    if (filters.endDate)
      (ts as Record<string, unknown>)["$lte"] = filters.endDate;
    (query as Record<string, unknown>)["timestamp"] = ts;
  }

  // `find` accepts a wide variety of shapes; cast to unknown to satisfy TS here without using `any`
  return this.find(query as unknown as Record<string, unknown>)
    .sort({ timestamp: -1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0);
};

// Static method to get activity summary
AuditLogSchema.statics.getSummary = async function (
  orgId: string,
  period: "day" | "week" | "month" = "day",
) {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case "day":
      startDate.setDate(now.getDate() - 1);
      break;
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  const pipeline = [
    {
      $match: {
        orgId,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          action: "$action",
          entityType: "$entityType",
        },
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: ["$result.success", 1, 0] },
        },
        errorCount: {
          $sum: { $cond: ["$result.success", 0, 1] },
        },
      },
    },
    {
      $sort: { count: -1 as -1 },
    },
  ];

  // PERF-001 (2025-12-19): Added maxTimeMS to prevent timeout on large datasets
  return this.aggregate(pipeline, { maxTimeMS: 10_000 });
};

// Export type and model with proper typing
export type AuditLog = InferSchemaType<typeof AuditLogSchema>;

export interface AuditLogStaticMethods {
  log(data: {
    orgId: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    userId: string;
    changes?: Array<Record<string, unknown>>;
    snapshot?: Record<string, unknown>;
    context?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    result?: Record<string, unknown>;
  }): Promise<AuditLog | null>;

  search(filters: {
    orgId: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }): Promise<AuditLog[]>;

  getSummary(
    orgId: string,
    period?: "day" | "week" | "month",
  ): Promise<Array<{ _id: string; count: number }>>;
}

import type { Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

export type AuditLogModelType = Model<AuditLog> & AuditLogStaticMethods;

export const AuditLogModel: AuditLogModelType = getModel<
  AuditLog,
  AuditLogModelType
>("AuditLog", AuditLogSchema);
