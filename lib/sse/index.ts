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
 * 3. In-memory pub/sub: Single-instance deployment (Vercel)
 * 4. Tenant isolation: All streams scoped by org_id
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
// SUBSCRIPTION STATE (In-Memory for single-instance deployment)
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
let cleanupIntervalId: NodeJS.Timeout | null = null;

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
  
  cleanupIntervalId = setInterval(() => {
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
 * @roadmap PERF-SSE-001: Replace with durable pub/sub for horizontal scaling (Q1 2026)
 */
export function subscribeToNotifications(
  orgId: Types.ObjectId,
  userId: Types.ObjectId,
  callback: (notification: NotificationPayload) => void
): () => void {
  // Check connection limit
  if (getUserConnectionCount(userId) >= SSE_CONFIG.MAX_CONNECTIONS_PER_USER) {
    // eslint-disable-next-line no-console -- Intentional: log connection limit errors
    console.error(`[SSE] User ${userId} exceeded max connections (${SSE_CONFIG.MAX_CONNECTIONS_PER_USER})`);
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
  
  // Return unsubscribe function
  return () => {
    subscriptions.delete(subscriptionId);
  };
}

/**
 * Publish notification to all subscribers in an org
 * @roadmap PERF-SSE-001: Replace with durable pub/sub for horizontal scaling (Q1 2026)
 */
export async function publishNotification(
  orgId: Types.ObjectId,
  notification: NotificationPayload,
  targetUserIds?: Types.ObjectId[]
): Promise<void> {
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
      // Refresh heartbeat on successful delivery to prevent cleanup eviction
      sub.lastHeartbeat = now;
    } catch (err) {
      // eslint-disable-next-line no-console -- Intentional: log subscriber callback errors
      console.error('[SSE] Error in subscriber callback:', err);
    }
  }
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
