import { Schema, Types } from "mongoose";
import { getClientIP } from "@/server/security/headers";
import { logger } from "@/lib/logger";

// Interface for field change
interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// Interface for change record
interface ChangeRecord {
  version: number;
  changedBy: string;
  changedAt: Date;
  changes: FieldChange[];
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Interface for audit information
export interface AuditInfo {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  changeReason?: string;
}

// Global context for audit information
let currentAuditContext: AuditInfo = {};

// Function to set audit context
export function setAuditContext(context: AuditInfo) {
  currentAuditContext = { ...context };
}

// Function to get current audit context
export function getAuditContext(): AuditInfo {
  return currentAuditContext;
}

// Function to clear audit context
export function clearAuditContext() {
  currentAuditContext = {};
}

// Plugin options interface
export interface AuditPluginOptions {
  excludeFields?: string[];
  enableChangeHistory?: boolean;
  maxHistoryVersions?: number;
  /** For platform-wide models (no user context), set to true to make createdBy optional */
  createdByOptional?: boolean;
}

// Plugin function
export function auditPlugin(schema: Schema, options: AuditPluginOptions = {}) {
  const {
    excludeFields = ["__v", "updatedAt", "createdAt"],
    enableChangeHistory = true,
    maxHistoryVersions = 50,
    createdByOptional = false,
  } = options;

  // ⚡ FIXED: Add audit fields to schema with ObjectId type (not String)
  // For platform-wide models, createdBy can be optional (system seeding)
  schema.add({
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: !createdByOptional,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    version: {
      type: Number,
      default: 1,
    },
  });

  // Add change history if enabled
  if (enableChangeHistory) {
    schema.add({
      changeHistory: [
        {
          version: Number,
          changedBy: { type: Schema.Types.ObjectId, ref: "User" }, // ⚡ FIXED: ObjectId not String
          changedAt: { type: Date, default: Date.now },
          changes: [
            {
              field: String,
              oldValue: Schema.Types.Mixed,
              newValue: Schema.Types.Mixed,
            },
          ],
          changeReason: String,
          ipAddress: String,
          userAgent: String,
        },
      ],
    });

    // Index for change history queries
    schema.index({ "changeHistory.changedAt": -1 });
    schema.index({ "changeHistory.changedBy": 1 });
  }

  // Pre-save middleware for audit fields and change tracking
  schema.pre("save", function (next) {
    const context = getAuditContext();
    const now = new Date();

    // Set createdBy for new documents
    if (this.isNew) {
      if (context.userId && Types.ObjectId.isValid(context.userId)) {
        this.createdBy = new Types.ObjectId(context.userId);
      } else if (!this.createdBy && !createdByOptional) {
        // For models that require createdBy, log warning but don't fail
        // The model's required validation will catch this if truly required
        logger.warn('[AuditPlugin] No valid userId in context for new document');
      }
      // Note: If createdByOptional=true and no userId, createdBy stays undefined (allowed)
      this.version = 1;
    } else {
      // Set updatedBy for existing documents
      if (context.userId && Types.ObjectId.isValid(context.userId)) {
        this.updatedBy = new Types.ObjectId(context.userId);
      }

      // Increment version
      this.version = ((this.version as number) || 0) + 1;

      // Track changes if enabled
      if (enableChangeHistory && this.isModified()) {
        this.changeHistory = this.changeHistory || [];

        const changes: Array<{
          field: string;
          oldValue: unknown;
          newValue: unknown;
        }> = [];

        // Get modified paths
        const modifiedPaths = this.modifiedPaths();

        for (const path of modifiedPaths) {
          // Skip excluded fields and audit fields
          if (
            excludeFields.includes(path) ||
            ["createdBy", "updatedBy", "version", "changeHistory"].includes(
              path,
            )
          ) {
            continue;
          }

          const internalState = this.$__ as {
            originalDoc?: Record<string, unknown>;
          };
          const oldValue = this.isNew
            ? undefined
            : internalState?.originalDoc?.[path];
          const newValue = this.get(path);

          // Only track if value actually changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              field: path,
              oldValue,
              newValue,
            });
          }
        }

        // Add change record if there are actual changes
        if (changes.length > 0) {
          // Resolve changedBy to a valid ObjectId or undefined
          let changedById: Types.ObjectId | undefined;
          if (context.userId && Types.ObjectId.isValid(context.userId)) {
            changedById = new Types.ObjectId(context.userId);
          } else if (this.updatedBy instanceof Types.ObjectId) {
            changedById = this.updatedBy;
          }
          // Note: changedBy can be undefined for system operations

          const changeRecord = {
            version: this.version,
            changedBy: changedById,
            changedAt: now,
            changes,
            changeReason: context.changeReason || undefined,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          };

          if (!this.changeHistory) {
            this.changeHistory = [];
          }
          (this.changeHistory as unknown[]).push(changeRecord);

          // Limit history size
          if ((this.changeHistory as unknown[]).length > maxHistoryVersions) {
            this.changeHistory = (this.changeHistory as unknown[]).slice(
              -maxHistoryVersions,
            );
          }
        }
      }
    }

    next();
  });

  // Pre-update middleware for audit fields
  schema.pre(/^update/, function () {
    const context = getAuditContext();

    if (context.userId && Types.ObjectId.isValid(context.userId)) {
      this.set({ updatedBy: new Types.ObjectId(context.userId) });
    }

    // Increment version
    this.set({ $inc: { version: 1 } });
  });

  // Pre-findOneAndUpdate middleware
  schema.pre("findOneAndUpdate", function () {
    const context = getAuditContext();

    if (context.userId && Types.ObjectId.isValid(context.userId)) {
      this.set({ updatedBy: new Types.ObjectId(context.userId) });
    }

    // Increment version
    this.set({ $inc: { version: 1 } });
  });

  // Instance method to get change history for a specific field
  schema.methods.getFieldHistory = function (fieldName: string) {
    if (!this.changeHistory) return [];

    return this.changeHistory
      .filter((change: ChangeRecord) =>
        change.changes.some((c: FieldChange) => c.field === fieldName),
      )
      .map((change: ChangeRecord) => ({
        version: change.version,
        changedBy: change.changedBy,
        changedAt: change.changedAt,
        change: change.changes.find((c: FieldChange) => c.field === fieldName),
        changeReason: change.changeReason,
      }))
      .sort((a: ChangeRecord, b: ChangeRecord) => b.version - a.version);
  };

  // Instance method to get changes made by a specific user
  schema.methods.getChangesByUser = function (userId: string) {
    if (!this.changeHistory) return [];

    return this.changeHistory
      .filter((change: ChangeRecord) => change.changedBy === userId)
      .sort((a: ChangeRecord, b: ChangeRecord) => b.version - a.version);
  };

  // Instance method to get version at specific point in time
  schema.methods.getVersionAtDate = function (date: Date) {
    if (!this.changeHistory) return null;

    const changes = this.changeHistory
      .filter((change: ChangeRecord) => new Date(change.changedAt) <= date)
      .sort((a: ChangeRecord, b: ChangeRecord) => b.version - a.version);

    return changes.length > 0 ? changes[0] : null;
  };

  // Static method to find documents modified by user
  schema.statics.findByModifier = function (userId: string) {
    return this.find({
      $or: [
        { createdBy: userId },
        { updatedBy: userId },
        { "changeHistory.changedBy": userId },
      ],
    });
  };

  // Static method to find documents modified in date range
  schema.statics.findByDateRange = function (startDate: Date, endDate: Date) {
    return this.find({
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
        { "changeHistory.changedAt": { $gte: startDate, $lte: endDate } },
      ],
    });
  };

  // Add indexes for audit queries
  schema.index({ createdBy: 1 });
  schema.index({ updatedBy: 1 });
  schema.index({ version: 1 });
  // ⚡ REMOVED: createdAt/updatedAt indexes - already created by timestamps: true option
}

// Utility function to execute operations with audit context
export async function withAuditContext<T>(
  auditInfo: AuditInfo,
  operation: () => Promise<T>,
): Promise<T> {
  const originalContext = getAuditContext();

  try {
    setAuditContext({ ...originalContext, ...auditInfo });
    return await operation();
  } finally {
    setAuditContext(originalContext);
  }
}

// Utility function to create audit context from request
export function createAuditContextFromRequest(
  req: Record<string, unknown>,
  userId?: string,
): AuditInfo {
  const reqUser = req.user as
    | { id?: string; _id?: { toString: () => string }; email?: string }
    | undefined;

  const headers =
    typeof req.headers === "object" && req.headers !== null
      ? (req.headers as Record<string, unknown>)
      : {};

  // Use secure IP extraction from trusted sources (LAST IP from X-Forwarded-For)
  // Check if this is a NextRequest with get() method
  let clientIp = "unknown";
  if (req && typeof req === "object" && "headers" in req) {
    const headersObj = req.headers;
    if (
      headersObj &&
      typeof headersObj === "object" &&
      "get" in headersObj &&
      typeof headersObj.get === "function"
    ) {
      // This is a NextRequest or similar - use secure extraction
      clientIp = getClientIP(
        req as unknown as Parameters<typeof getClientIP>[0],
      );
    } else {
      // Fallback for generic request objects - extract safely
      const headersMap = headersObj as Record<string, string | undefined>;

      // 1) Cloudflare Connecting IP (most trusted)
      const cfIp = headersMap["cf-connecting-ip"];
      if (cfIp && cfIp.trim()) {
        clientIp = cfIp.trim();
      } else {
        // 2) X-Forwarded-For: take LAST IP (appended by our trusted proxy)
        const forwarded = headersMap["x-forwarded-for"];
        if (forwarded && forwarded.trim()) {
          const ips = forwarded
            .split(",")
            .map((ip) => ip.trim())
            .filter((ip) => ip);
          if (ips.length) clientIp = ips[ips.length - 1]; // LAST IP is from our proxy
        } else if (process.env.TRUST_X_REAL_IP === "true") {
          // 3) X-Real-IP only if explicitly trusted
          const realIP = headersMap["x-real-ip"];
          if (realIP && realIP.trim()) clientIp = realIP.trim();
        }
      }
    }
  }

  return {
    userId: userId || reqUser?.id || reqUser?._id?.toString(),
    userEmail: reqUser?.email,
    ipAddress: clientIp,
    userAgent: headers["user-agent"]
      ? String(headers["user-agent"])
      : undefined,
    timestamp: new Date(),
  };
}
