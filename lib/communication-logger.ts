import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";

/**
 * Normalize orgId to ObjectId, keeping string if invalid.
 * Returns null if orgId is undefined/null.
 */
function normalizeOrgId(orgId: string | ObjectId | undefined | null): ObjectId | string | null {
  if (orgId === undefined || orgId === null) return null;
  if (typeof orgId !== "string") return orgId;
  // Only convert to ObjectId if it's a valid 24-char hex string
  if (ObjectId.isValid(orgId) && /^[a-fA-F0-9]{24}$/.test(orgId)) {
    return new ObjectId(orgId);
  }
  return orgId; // Keep as string for non-standard org IDs
}

/**
 * Communication Log Entry Interface
 * SECURITY: orgId is required for tenant isolation (STRICT v4.1 compliance)
 */
export interface CommunicationLog {
  _id?: ObjectId;
  orgId?: string | ObjectId; // Organization for tenant isolation
  userId: string | ObjectId; // User who received the communication
  channel: "sms" | "email" | "whatsapp" | "otp";
  type:
    | "notification"
    | "otp"
    | "marketing"
    | "transactional"
    | "alert"
    | "broadcast";
  recipient: string; // Phone number or email
  subject?: string; // For email
  message: string;
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  metadata?: {
    twilioSid?: string;
    sendgridId?: string;
    whatsappId?: string;
    messageId?: string;
    email?: string;
    phone?: string;
    name?: string;
    otpCode?: string;
    otpExpiresAt?: Date;
    otpAttempts?: number;
    cost?: number;
    segments?: number;
    broadcastId?: string;
    ipAddress?: string;
    userAgent?: string;
    triggeredBy?: string;
    identifier?: string;
    priority?: string;
    rateLimitRemaining?: number;
    triggeredByEmail?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  readAt?: Date;
  errorMessage?: string;
}

/**
 * Normalize userId to ObjectId, keeping string if invalid.
 * Demo/test users may have non-ObjectId IDs like "demo-uuid" or "EMP001".
 */
function normalizeUserId(userId: string | ObjectId): ObjectId | string {
  if (typeof userId !== "string") return userId;
  // Only convert to ObjectId if it's a valid 24-char hex string
  if (ObjectId.isValid(userId) && /^[a-fA-F0-9]{24}$/.test(userId)) {
    return new ObjectId(userId);
  }
  return userId; // Keep as string for demo/test users
}

/**
 * Log communication to database
 * SECURITY: orgId should be provided for tenant isolation (STRICT v4.1)
 *
 * @param log - Communication log data
 * @returns Success boolean and log ID
 */
export async function logCommunication(
  log: Omit<CommunicationLog, "_id" | "createdAt" | "updatedAt">,
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const { connectToDatabase, getDatabase } = await import(
      "@/lib/mongodb-unified"
    );
    await connectToDatabase();
    const db = await getDatabase();

    // SECURITY: Normalize orgId for tenant isolation
    const normalizedOrgId = normalizeOrgId(log.orgId);

    const communicationLog: CommunicationLog = {
      ...log,
      ...(normalizedOrgId !== null && { orgId: normalizedOrgId }),
      userId: normalizeUserId(log.userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("communication_logs")
      .insertOne(communicationLog);

    logger.info("[Communication] Logged", {
      logId: result.insertedId.toString(),
      orgId: normalizedOrgId ? String(normalizedOrgId) : undefined,
      userId:
        typeof log.userId === "string" ? log.userId : log.userId.toString(),
      channel: log.channel,
      type: log.type,
      status: log.status,
    });

    return {
      success: true,
      logId: result.insertedId.toString(),
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Communication] Log error", error as Error, {
      userId:
        typeof log.userId === "string" ? log.userId : log.userId.toString(),
      channel: log.channel,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update communication log status
 * SECURITY: orgId should be provided for tenant-scoped updates (STRICT v4.1)
 *
 * @param logId - Communication log ID
 * @param status - New status
 * @param metadata - Additional metadata to merge
 * @param orgId - Organization ID for tenant isolation (optional for backward compatibility)
 * @returns Success boolean
 */
export async function updateCommunicationStatus(
  logId: string,
  status: CommunicationLog["status"],
  metadata?: Partial<CommunicationLog["metadata"]>,
  orgId?: string | ObjectId,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { connectToDatabase, getDatabase } = await import(
      "@/lib/mongodb-unified"
    );
    await connectToDatabase();
    const db = await getDatabase();

    // SECURITY: Build query with orgId scoping when provided
    const query: Record<string, unknown> = { _id: new ObjectId(logId) };
    const normalizedOrgId = normalizeOrgId(orgId);
    if (normalizedOrgId !== null) {
      query.orgId = normalizedOrgId;
    }

    let update: Record<string, unknown> | { $set: Record<string, unknown> } = {
      status,
      updatedAt: new Date(),
    };

    // Set timestamp based on status
    if (status === "sent") {
      (update as Record<string, unknown>).sentAt = new Date();
    } else if (status === "delivered") {
      (update as Record<string, unknown>).deliveredAt = new Date();
    } else if (status === "failed") {
      (update as Record<string, unknown>).failedAt = new Date();
    } else if (status === "read") {
      (update as Record<string, unknown>).readAt = new Date();
    }

    // Merge metadata
    if (metadata) {
      const $set: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      const baseUpdate = update as Record<string, unknown>;
      if (baseUpdate.sentAt) $set.sentAt = baseUpdate.sentAt;
      if (baseUpdate.deliveredAt) $set.deliveredAt = baseUpdate.deliveredAt;
      if (baseUpdate.failedAt) $set.failedAt = baseUpdate.failedAt;
      if (baseUpdate.readAt) $set.readAt = baseUpdate.readAt;

      Object.keys(metadata).forEach((key) => {
        $set[`metadata.${key}`] = (metadata as Record<string, unknown>)[key];
      });

      update = { $set };
    }

    // SECURITY: Use org-scoped query for tenant isolation
    await db
      .collection("communication_logs")
      .updateOne(
        query,
        metadata ? update : { $set: update },
      );

    logger.info("[Communication] Status updated", {
      logId,
      orgId: normalizedOrgId ? String(normalizedOrgId) : undefined,
      status,
    });

    return { success: true };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Communication] Update status error", error as Error, {
      logId,
      status,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get communication history for a user
 * SECURITY: orgId should be provided for tenant-scoped queries (STRICT v4.1)
 *
 * @param userId - User ID
 * @param options - Query options including orgId for tenant isolation
 * @returns Communication logs
 */
export async function getUserCommunications(
  userId: string,
  options?: {
    orgId?: string | ObjectId;
    channel?: CommunicationLog["channel"];
    type?: CommunicationLog["type"];
    limit?: number;
    skip?: number;
  },
): Promise<CommunicationLog[]> {
  try {
    const { connectToDatabase, getDatabase } = await import(
      "@/lib/mongodb-unified"
    );
    await connectToDatabase();
    const db = await getDatabase();

    // SECURITY: Build query with orgId scoping when provided
    const query: Record<string, unknown> = { userId: normalizeUserId(userId) };
    const normalizedOrgId = normalizeOrgId(options?.orgId);
    if (normalizedOrgId !== null) {
      query.orgId = normalizedOrgId;
    }

    if (options?.channel) {
      query.channel = options.channel;
    }

    if (options?.type) {
      query.type = options.type;
    }

    const logs = await db
      .collection("communication_logs")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options?.skip || 0)
      .limit(options?.limit || 50)
      .toArray();

    return logs.map((log) => ({
      ...log,
      _id: log._id?.toString(),
    })) as unknown as CommunicationLog[];
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error(
      "[Communication] Get user communications error",
      error as Error,
      {
        userId,
      },
    );
    return [];
  }
}

/**
 * Get communication statistics
 * SECURITY: orgId should be provided for tenant-scoped queries (STRICT v4.1)
 *
 * @param filters - Optional filters including orgId for tenant isolation
 * @returns Statistics object
 */
export async function getCommunicationStats(filters?: {
  orgId?: string | ObjectId;
  userId?: string;
  channel?: CommunicationLog["channel"];
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  failureRate: number;
}> {
  try {
    const { connectToDatabase, getDatabase } = await import(
      "@/lib/mongodb-unified"
    );
    await connectToDatabase();
    const db = await getDatabase();

    const matchStage: Record<string, unknown> = {};

    // SECURITY: Scope by orgId when provided
    const normalizedOrgId = normalizeOrgId(filters?.orgId);
    if (normalizedOrgId !== null) {
      matchStage.orgId = normalizedOrgId;
    }

    if (filters?.userId) {
      matchStage.userId = normalizeUserId(filters.userId);
    }

    if (filters?.channel) {
      matchStage.channel = filters.channel;
    }

    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) {
        createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        createdAt.$lte = filters.endDate;
      }
      matchStage.createdAt = createdAt;
    }

    const result = await db
      .collection("communication_logs")
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: {
              $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();

    const stats = result[0] || {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
    };

    const deliveryRate =
      stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
    const failureRate =
      stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;

    return {
      total: stats.total,
      sent: stats.sent,
      delivered: stats.delivered,
      failed: stats.failed,
      pending: stats.pending,
      deliveryRate,
      failureRate,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Communication] Get stats error", error as Error);
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      deliveryRate: 0,
      failureRate: 0,
    };
  }
}
