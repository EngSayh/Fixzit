/**
 * FEATURE-001: Server-Sent Events (SSE) Module
 * 
 * @status IMPLEMENTED
 * @adr ADR-001-real-time-notifications.md
 * @decision SSE over WebSocket (see ADR-001)
 * 
 * Implementation:
 * 1. SSE endpoint: app/api/notifications/stream/route.ts
 * 2. Client hook: hooks/useNotificationStream.ts
 * 3. Hybrid pub/sub: NATS when configured, in-memory fallback
 * 4. Tenant isolation: All streams scoped by org_id
 * 
 * Multi-instance support:
 * - Set NATS_URL environment variable to enable cross-instance messaging
 * - Without NATS_URL, notifications only reach subscribers on the same instance
 */

import { logger } from '@/lib/logger';
import { getNatsConnection, publish as natsPublish } from '@/lib/nats-client';
import { Types } from 'mongoose';
import { JSONCodec, type Subscription } from 'nats';

// ============================================================================
// TYPES
// ============================================================================

export interface SSEMessage<T = unknown> {
  id: string;
  event: SSEEventType;
  data: T;
  retry?: number;
}

export type SSEEventType =
  | 'notification'
  | 'work_order_update'
  | 'bid_received'
  | 'payment_confirmed'
  | 'maintenance_alert'
  | 'system_announcement'
  | 'heartbeat';

export interface SSESubscription {
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  connectionId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

export interface NotificationPayload {
  id: string;
  type: SSEEventType;
  title: string;
  message: string;
  link?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SSE_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 30_000, // 30 seconds
  RECONNECT_RETRY_MS: 3_000,     // 3 seconds
  MAX_CONNECTIONS_PER_USER: 5,
  CONNECTION_TIMEOUT_MS: 300_000, // 5 minutes
  NATS_SUBJECT_PREFIX: 'fixzit.notifications', // NATS subject for cross-instance messaging
} as const;

// ============================================================================
// SUBSCRIPTION STATE (Hybrid: In-Memory + NATS for horizontal scaling)
// ============================================================================

interface InternalSubscription {
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  callback: (notification: NotificationPayload) => void;
  connectedAt: Date;
  lastHeartbeat: Date;
}

const subscriptions = new Map<string, InternalSubscription>();
let subscriptionIdCounter = 0;
let cleanupIntervalId: ReturnType<typeof globalThis.setInterval> | null = null;
let natsSubscription: Subscription | null = null;
let natsInitialized = false;

/**
 * Initialize NATS subscription for cross-instance notification delivery
 * Called lazily on first subscription
 */
async function initNatsSubscription(): Promise<void> {
  if (natsInitialized) return;

  try {
    const nc = await getNatsConnection();
    if (!nc) {
      logger.info('[SSE] NATS not configured, using in-memory pub/sub only');
      natsInitialized = true; // Mark as initialized (no NATS available)
      return;
    }

    const jc = JSONCodec<{
      orgId: string;
      notification: NotificationPayload;
      targetUserIds?: string[];
    }>();

    // Subscribe to all notifications on this subject
    natsSubscription = nc.subscribe(`${SSE_CONFIG.NATS_SUBJECT_PREFIX}.>`);
    
    // Mark as initialized only after successful subscription
    natsInitialized = true;
    
    logger.info('[SSE] NATS subscription initialized for horizontal scaling');

    // Process incoming NATS messages
    (async () => {
      for await (const msg of natsSubscription!) {
        try {
          const data = jc.decode(msg.data);
          const orgId = new Types.ObjectId(data.orgId);
          const targetUserIds = data.targetUserIds?.map(id => new Types.ObjectId(id));
          
          // Deliver to local subscribers
          deliverToLocalSubscribers(orgId, data.notification, targetUserIds);
        } catch (err) {
          logger.error('[SSE] Error processing NATS message:', err);
        }
      }
    })();
  } catch (err) {
    logger.error('[SSE] Failed to initialize NATS subscription:', err);
    natsInitialized = false; // Allow retry
  }
}

/**
 * Deliver notification to local (in-memory) subscribers only
 */
function deliverToLocalSubscribers(
  orgId: Types.ObjectId,
  notification: NotificationPayload,
  targetUserIds?: Types.ObjectId[]
): void {
  const now = new Date();
  for (const sub of subscriptions.values()) {
    // Tenant isolation check
    if (!sub.orgId.equals(orgId)) continue;
    
    // User targeting check
    if (targetUserIds && targetUserIds.length > 0) {
      if (!targetUserIds.some(id => id.equals(sub.userId))) continue;
    }
    
    // Deliver notification
    try {
      sub.callback(notification);
      sub.lastHeartbeat = now;
    } catch (err) {
      logger.error('[SSE] Error in subscriber callback:', err);
    }
  }
}

/**
 * Get the number of active connections for a specific user
 */
export function getUserConnectionCount(userId: Types.ObjectId): number {
  let count = 0;
  for (const sub of subscriptions.values()) {
    if (sub.userId.equals(userId)) {
      count++;
    }
  }
  return count;
}

/**
 * Start the connection cleanup interval
 */
export function startConnectionCleanup(): void {
  if (cleanupIntervalId) return; // Already running
  
  cleanupIntervalId = globalThis.setInterval(() => {
    const now = Date.now();
    const timeout = SSE_CONFIG.CONNECTION_TIMEOUT_MS;
    
    for (const [id, sub] of subscriptions.entries()) {
      if (now - sub.lastHeartbeat.getTime() > timeout) {
        subscriptions.delete(id);
      }
    }
  }, 60_000); // Check every minute
}

/**
 * Stop the connection cleanup interval
 */
export function stopConnectionCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Reset internal state for testing purposes only
 * @internal
 */
export function _resetForTesting(): void {
  subscriptions.clear();
  subscriptionIdCounter = 0;
  stopConnectionCleanup();
  // Reset NATS state
  if (natsSubscription) {
    natsSubscription.unsubscribe();
    natsSubscription = null;
  }
  natsInitialized = false;
}

/**
 * Get the count of active subscriptions (optionally filtered by org)
 */
export function getActiveSubscriptionCount(orgId?: Types.ObjectId): number {
  if (!orgId) {
    return subscriptions.size;
  }
  let count = 0;
  for (const sub of subscriptions.values()) {
    if (sub.orgId.equals(orgId)) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// SUBSCRIPTION FUNCTIONS
// ============================================================================

/**
 * Subscribe to tenant-scoped notifications
 * Supports multi-instance deployments via NATS when NATS_URL is configured
 */
export function subscribeToNotifications(
  orgId: Types.ObjectId,
  userId: Types.ObjectId,
  callback: (notification: NotificationPayload) => void
): () => void {
  // Check connection limit
  if (getUserConnectionCount(userId) >= SSE_CONFIG.MAX_CONNECTIONS_PER_USER) {
    logger.warn(`[SSE] User ${userId} exceeded max connections (${SSE_CONFIG.MAX_CONNECTIONS_PER_USER})`);
    // Return a no-op cleanup to avoid breaking callers
    return () => {};
  }
  
  const subscriptionId = `sub_${++subscriptionIdCounter}`;
  const now = new Date();
  
  subscriptions.set(subscriptionId, {
    orgId,
    userId,
    callback,
    connectedAt: now,
    lastHeartbeat: now,
  });
  
  // Start cleanup if not already running
  startConnectionCleanup();
  
  // Initialize NATS subscription for cross-instance messaging (fire-and-forget)
  void initNatsSubscription();
  
  // Return unsubscribe function
  return () => {
    subscriptions.delete(subscriptionId);
  };
}

/**
 * Publish notification to all subscribers in an org
 * Uses NATS for cross-instance delivery when configured, falls back to local-only
 */
export async function publishNotification(
  orgId: Types.ObjectId,
  notification: NotificationPayload,
  targetUserIds?: Types.ObjectId[]
): Promise<void> {
  // Try to publish via NATS for cross-instance delivery
  const nc = await getNatsConnection().catch(() => null);
  
  if (nc) {
    // Publish to NATS - all instances will receive and deliver to their local subscribers
    try {
      await natsPublish(`${SSE_CONFIG.NATS_SUBJECT_PREFIX}.${orgId.toString()}`, {
        orgId: orgId.toString(),
        notification,
        targetUserIds: targetUserIds?.map(id => id.toString()),
      });
      // NATS subscribers (including this instance) will handle local delivery
      return;
    } catch (err) {
      logger.error('[SSE] NATS publish failed, falling back to local delivery:', err);
      // Fall through to local-only delivery
    }
  }
  
  // Local-only delivery (NATS not configured or failed)
  deliverToLocalSubscribers(orgId, notification, targetUserIds);
}

/**
 * Format SSE message according to spec
 */
export function formatSSEMessage<T>(message: SSEMessage<T>): string {
  let formatted = '';
  
  if (message.id) {
    formatted += `id: ${message.id}\n`;
  }
  
  if (message.event) {
    formatted += `event: ${message.event}\n`;
  }
  
  if (message.retry) {
    formatted += `retry: ${message.retry}\n`;
  }
  
  formatted += `data: ${JSON.stringify(message.data)}\n\n`;
  
  return formatted;
}

/**
 * Create heartbeat message
 */
export function createHeartbeat(): string {
  return `: heartbeat ${new Date().toISOString()}\n\n`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  subscribeToNotifications,
  publishNotification,
  formatSSEMessage,
  createHeartbeat,
  getActiveSubscriptionCount,
  getUserConnectionCount,
  startConnectionCleanup,
  stopConnectionCleanup,
  _resetForTesting,
  SSE_CONFIG,
};
