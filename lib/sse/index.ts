/**
 * FEATURE-001: Server-Sent Events (SSE) Module
 * 
 * @status IMPLEMENTED - Issue #293
 * @adr ADR-001-real-time-notifications.md
 * @decision SSE over WebSocket (see ADR-001)
 * 
 * Implementation:
 * 1. SSE endpoint: app/api/notifications/stream/route.ts
 * 2. Client hook: hooks/useNotificationStream.ts
 * 3. In-memory pub/sub with Redis-ready architecture
 * 4. Tenant isolation: All streams scoped by org_id
 * 
 * For horizontal scaling across Vercel instances, integrate Redis pub/sub
 * by replacing the in-memory subscriptions Map with Redis channels.
 */

import { Types } from 'mongoose';

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
} as const;

// ============================================================================
// IN-MEMORY SUBSCRIPTION MANAGER
// For single-instance deployment. For horizontal scaling, integrate Redis pub/sub.
// ============================================================================

type SubscriptionCallback = (notification: NotificationPayload) => void;

interface Subscription {
  orgId: string;
  userId: string;
  callback: SubscriptionCallback;
  connectionId: string;
  connectedAt: Date;
}

// In-memory subscription store (single instance)
// For production horizontal scaling, replace with Redis pub/sub
const subscriptions = new Map<string, Subscription>();

/**
 * Generate unique connection ID
 */
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get subscription key for lookup
 */
function getSubscriptionKey(connectionId: string): string {
  return connectionId;
}

// ============================================================================
// IMPLEMENTED FUNCTIONS
// ============================================================================

/**
 * Subscribe to tenant-scoped notifications
 * 
 * For single-instance deployments, uses in-memory subscriptions.
 * For horizontal scaling across Vercel instances, integrate Redis pub/sub:
 * 
 * Redis integration pattern:
 * ```typescript
 * import { createClient } from 'redis';
 * const redisClient = createClient({ url: process.env.REDIS_URL });
 * await redisClient.subscribe(`notifications:${orgId}`, (message) => {
 *   const notification = JSON.parse(message);
 *   if (!targetUserIds || targetUserIds.includes(userId)) {
 *     callback(notification);
 *   }
 * });
 * ```
 * 
 * @param orgId - Organization ID for tenant scoping
 * @param userId - User ID for optional user-specific filtering
 * @param callback - Function called when notification received
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToNotifications(
  orgId: Types.ObjectId,
  userId: Types.ObjectId,
  callback: (notification: NotificationPayload) => void
): () => void {
  const connectionId = generateConnectionId();
  const subscription: Subscription = {
    orgId: orgId.toString(),
    userId: userId.toString(),
    callback,
    connectionId,
    connectedAt: new Date(),
  };
  
  subscriptions.set(getSubscriptionKey(connectionId), subscription);
  
  // Return cleanup function
  return () => {
    subscriptions.delete(getSubscriptionKey(connectionId));
  };
}

/**
 * Publish notification to all subscribers in an org
 * 
 * For single-instance: Iterates in-memory subscriptions
 * For horizontal scaling: Publish to Redis channel
 * 
 * Redis integration pattern:
 * ```typescript
 * await redisClient.publish(`notifications:${orgId}`, JSON.stringify({
 *   notification,
 *   targetUserIds: targetUserIds?.map(id => id.toString()),
 * }));
 * ```
 * 
 * @param orgId - Organization ID for tenant scoping
 * @param notification - The notification payload to publish
 * @param targetUserIds - Optional: Only notify specific users
 */
export async function publishNotification(
  orgId: Types.ObjectId,
  notification: NotificationPayload,
  targetUserIds?: Types.ObjectId[]
): Promise<void> {
  const orgIdStr = orgId.toString();
  const targetUserIdStrs = targetUserIds?.map(id => id.toString());
  
  // Iterate all subscriptions for this org
  for (const subscription of subscriptions.values()) {
    // Tenant isolation: Only send to matching org
    if (subscription.orgId !== orgIdStr) {
      continue;
    }
    
    // User filtering: If targetUserIds specified, only send to those users
    if (targetUserIdStrs && !targetUserIdStrs.includes(subscription.userId)) {
      continue;
    }
    
    // Deliver notification
    try {
      subscription.callback(notification);
    } catch {
      // Silent fail - one failed callback shouldn't affect others
      // In production, this would log to a monitoring service
    }
  }
}

/**
 * Get count of active subscriptions for an org
 * Useful for monitoring and debugging
 */
export function getActiveSubscriptionCount(orgId?: Types.ObjectId): number {
  if (!orgId) {
    return subscriptions.size;
  }
  
  const orgIdStr = orgId.toString();
  let count = 0;
  for (const subscription of subscriptions.values()) {
    if (subscription.orgId === orgIdStr) {
      count++;
    }
  }
  return count;
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
  SSE_CONFIG,
};
