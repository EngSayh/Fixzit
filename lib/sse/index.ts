/**
 * FEATURE-001: Server-Sent Events (SSE) Module
 * 
 * @status SCAFFOLDING - Q1 2026
 * @adr ADR-001-real-time-notifications.md
 * @decision SSE over WebSocket (see ADR-001)
 * 
 * Implementation Plan:
 * 1. SSE endpoint: app/api/notifications/stream/route.ts
 * 2. Client hook: hooks/useNotificationStream.ts
 * 3. Redis pub/sub: For horizontal scaling across Vercel instances
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
// PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED Q1 2026)
// ============================================================================

/**
 * Subscribe to tenant-scoped notifications
 * @todo Implement with Redis pub/sub for horizontal scaling
 */
export function subscribeToNotifications(
  _orgId: Types.ObjectId,
  _userId: Types.ObjectId,
  _callback: (notification: NotificationPayload) => void
): () => void {
  // TODO: Implement subscription logic
  // - Connect to Redis pub/sub channel: `notifications:${orgId}`
  // - Filter by userId if needed
  // - Call callback on new messages
  return () => {
    // Cleanup function
  };
}

/**
 * Publish notification to all subscribers in an org
 * @todo Implement with Redis pub/sub
 */
export async function publishNotification(
  _orgId: Types.ObjectId,
  _notification: NotificationPayload,
  _targetUserIds?: Types.ObjectId[]
): Promise<void> {
  // TODO: Implement publish logic
  // - Publish to Redis channel: `notifications:${orgId}`
  // - Include targetUserIds for filtering
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
  SSE_CONFIG,
};
