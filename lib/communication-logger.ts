import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';

/**
 * Communication Log Entry Interface
 */
export interface CommunicationLog {
  _id?: ObjectId;
  userId: string | ObjectId; // User who received the communication
  channel: 'sms' | 'email' | 'whatsapp' | 'otp';
  type: 'notification' | 'otp' | 'marketing' | 'transactional' | 'alert' | 'broadcast';
  recipient: string; // Phone number or email
  subject?: string; // For email
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  metadata?: {
    twilioSid?: string;
    sendgridId?: string;
    whatsappId?: string;
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
 * Log communication to database
 * 
 * @param log - Communication log data
 * @returns Success boolean and log ID
 */
export async function logCommunication(log: Omit<CommunicationLog, '_id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const { connectToDatabase, getDatabase } = await import('@/lib/mongodb-unified');
    await connectToDatabase();
    const db = await getDatabase();

    const communicationLog: CommunicationLog = {
      ...log,
      userId: typeof log.userId === 'string' ? new ObjectId(log.userId) : log.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('communication_logs').insertOne(communicationLog);

    logger.info('[Communication] Logged', {
      logId: result.insertedId.toString(),
      userId: typeof log.userId === 'string' ? log.userId : log.userId.toString(),
      channel: log.channel,
      type: log.type,
      status: log.status,
    });

    return {
      success: true,
      logId: result.insertedId.toString(),
    };
  } catch (error) {
    logger.error('[Communication] Log error', error as Error, {
      userId: typeof log.userId === 'string' ? log.userId : log.userId.toString(),
      channel: log.channel,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update communication log status
 * 
 * @param logId - Communication log ID
 * @param status - New status
 * @param metadata - Additional metadata to merge
 * @returns Success boolean
 */
export async function updateCommunicationStatus(
  logId: string,
  status: CommunicationLog['status'],
  metadata?: Partial<CommunicationLog['metadata']>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { connectToDatabase, getDatabase } = await import('@/lib/mongodb-unified');
    await connectToDatabase();
    const db = await getDatabase();

    let update: Record<string, unknown> | { $set: Record<string, unknown> } = {
      status,
      updatedAt: new Date(),
    };

    // Set timestamp based on status
    if (status === 'sent') {
      (update as Record<string, unknown>).sentAt = new Date();
    } else if (status === 'delivered') {
      (update as Record<string, unknown>).deliveredAt = new Date();
    } else if (status === 'failed') {
      (update as Record<string, unknown>).failedAt = new Date();
    } else if (status === 'read') {
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

    await db.collection('communication_logs').updateOne(
      { _id: new ObjectId(logId) },
      metadata ? update : { $set: update }
    );

    logger.info('[Communication] Status updated', {
      logId,
      status,
    });

    return { success: true };
  } catch (error) {
    logger.error('[Communication] Update status error', error as Error, {
      logId,
      status,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get communication history for a user
 * 
 * @param userId - User ID
 * @param options - Query options
 * @returns Communication logs
 */
export async function getUserCommunications(
  userId: string,
  options?: {
    channel?: CommunicationLog['channel'];
    type?: CommunicationLog['type'];
    limit?: number;
    skip?: number;
  }
): Promise<CommunicationLog[]> {
  try {
    const { connectToDatabase, getDatabase } = await import('@/lib/mongodb-unified');
    await connectToDatabase();
    const db = await getDatabase();

    const query: Record<string, unknown> = { userId: new ObjectId(userId) };

    if (options?.channel) {
      query.channel = options.channel;
    }

    if (options?.type) {
      query.type = options.type;
    }

    const logs = await db
      .collection('communication_logs')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options?.skip || 0)
      .limit(options?.limit || 50)
      .toArray();

    return logs as unknown as CommunicationLog[];
  } catch (error) {
    logger.error('[Communication] Get user communications error', error as Error, {
      userId,
    });
    return [];
  }
}

/**
 * Get communication statistics
 * 
 * @param filters - Optional filters
 * @returns Statistics object
 */
export async function getCommunicationStats(filters?: {
  userId?: string;
  channel?: CommunicationLog['channel'];
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
    const { connectToDatabase, getDatabase } = await import('@/lib/mongodb-unified');
    await connectToDatabase();
    const db = await getDatabase();

    const matchStage: Record<string, unknown> = {};

    if (filters?.userId) {
      matchStage.userId = new ObjectId(filters.userId);
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
      .collection('communication_logs')
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
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

    const deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
    const failureRate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;

    return {
      total: stats.total,
      sent: stats.sent,
      delivered: stats.delivered,
      failed: stats.failed,
      pending: stats.pending,
      deliveryRate,
      failureRate,
    };
  } catch (error) {
    logger.error('[Communication] Get stats error', error as Error);
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
