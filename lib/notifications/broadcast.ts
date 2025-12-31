/**
 * FEATURE-001: Notification Broadcast Service
 * 
 * Central service for publishing real-time notifications via SSE.
 * Used by API routes to notify users of important events.
 * 
 * @module lib/notifications/broadcast
 */

import { Types } from 'mongoose';
import { publishNotification, type NotificationPayload, type SSEEventType } from '@/lib/sse';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface BroadcastOptions {
  /** Target organization ID (required for tenant isolation) */
  orgId: string | Types.ObjectId;
  /** Optional: Target specific user IDs, otherwise broadcasts to all org users */
  userIds?: (string | Types.ObjectId)[];
  /** Notification priority */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** Optional: Link to navigate to when notification is clicked */
  link?: string;
}

export interface WorkOrderNotification {
  workOrderId: string;
  workOrderNumber: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed';
  newStatus?: string;
  assignedTo?: string;
}

export interface PaymentNotification {
  paymentId: string;
  amount: number;
  currency: string;
  action: 'received' | 'processed' | 'failed' | 'refunded';
}

export interface BidNotification {
  bidId: string;
  rfqId: string;
  vendorName: string;
  action: 'submitted' | 'accepted' | 'rejected' | 'expired';
}

// ============================================================================
// NOTIFICATION BUILDERS
// ============================================================================

/**
 * Generate a unique notification ID
 */
function generateNotificationId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert string or ObjectId array to ObjectId array
 */
function toObjectIdArray(ids?: (string | Types.ObjectId)[]): Types.ObjectId[] | undefined {
  if (!ids || ids.length === 0) return undefined;
  return ids.map(id => 
    typeof id === 'string' ? new Types.ObjectId(id) : id
  );
}

// ============================================================================
// BROADCAST FUNCTIONS
// ============================================================================

/**
 * Broadcast a work order notification
 */
export async function broadcastWorkOrderNotification(
  notification: WorkOrderNotification,
  options: BroadcastOptions
): Promise<void> {
  const actionMessages: Record<WorkOrderNotification['action'], string> = {
    created: 'New work order created',
    updated: 'Work order updated',
    status_changed: `Work order status changed to ${notification.newStatus || 'unknown'}`,
    assigned: `Work order assigned to ${notification.assignedTo || 'technician'}`,
    completed: 'Work order completed',
  };

  const payload: NotificationPayload = {
    id: generateNotificationId('wo'),
    type: 'work_order_update' as SSEEventType,
    title: `Work Order #${notification.workOrderNumber}`,
    message: actionMessages[notification.action],
    link: options.link || `/fm/work-orders/${notification.workOrderId}`,
    priority: options.priority || 'medium',
    createdAt: new Date().toISOString(),
  };

  const orgId = typeof options.orgId === 'string' 
    ? new Types.ObjectId(options.orgId) 
    : options.orgId;

  logger.info('[Broadcast] Work order notification', {
    workOrderId: notification.workOrderId,
    action: notification.action,
    orgId: orgId.toString(),
  });

  await publishNotification(orgId, payload, toObjectIdArray(options.userIds));
}

/**
 * Broadcast a payment notification
 */
export async function broadcastPaymentNotification(
  notification: PaymentNotification,
  options: BroadcastOptions
): Promise<void> {
  const actionMessages: Record<PaymentNotification['action'], string> = {
    received: `Payment of ${notification.currency} ${notification.amount.toFixed(2)} received`,
    processed: `Payment of ${notification.currency} ${notification.amount.toFixed(2)} processed`,
    failed: `Payment of ${notification.currency} ${notification.amount.toFixed(2)} failed`,
    refunded: `Refund of ${notification.currency} ${notification.amount.toFixed(2)} processed`,
  };

  const payload: NotificationPayload = {
    id: generateNotificationId('pay'),
    type: 'payment_confirmed' as SSEEventType,
    title: 'Payment Update',
    message: actionMessages[notification.action],
    link: options.link || `/finance/payments/${notification.paymentId}`,
    priority: notification.action === 'failed' ? 'high' : (options.priority || 'medium'),
    createdAt: new Date().toISOString(),
  };

  const orgId = typeof options.orgId === 'string' 
    ? new Types.ObjectId(options.orgId) 
    : options.orgId;

  logger.info('[Broadcast] Payment notification', {
    paymentId: notification.paymentId,
    action: notification.action,
    orgId: orgId.toString(),
  });

  await publishNotification(orgId, payload, toObjectIdArray(options.userIds));
}

/**
 * Broadcast a bid/RFQ notification
 */
export async function broadcastBidNotification(
  notification: BidNotification,
  options: BroadcastOptions
): Promise<void> {
  const actionMessages: Record<BidNotification['action'], string> = {
    submitted: `New bid received from ${notification.vendorName}`,
    accepted: `Bid from ${notification.vendorName} accepted`,
    rejected: `Bid from ${notification.vendorName} rejected`,
    expired: 'Bid has expired',
  };

  const payload: NotificationPayload = {
    id: generateNotificationId('bid'),
    type: 'bid_received' as SSEEventType,
    title: 'Bid Update',
    message: actionMessages[notification.action],
    link: options.link || `/fm/rfqs/${notification.rfqId}`,
    priority: notification.action === 'submitted' ? 'high' : (options.priority || 'medium'),
    createdAt: new Date().toISOString(),
  };

  const orgId = typeof options.orgId === 'string' 
    ? new Types.ObjectId(options.orgId) 
    : options.orgId;

  logger.info('[Broadcast] Bid notification', {
    bidId: notification.bidId,
    rfqId: notification.rfqId,
    action: notification.action,
    orgId: orgId.toString(),
  });

  await publishNotification(orgId, payload, toObjectIdArray(options.userIds));
}

/**
 * Broadcast a maintenance alert
 */
export async function broadcastMaintenanceAlert(
  title: string,
  message: string,
  options: BroadcastOptions
): Promise<void> {
  const payload: NotificationPayload = {
    id: generateNotificationId('maint'),
    type: 'maintenance_alert' as SSEEventType,
    title,
    message,
    link: options.link,
    priority: options.priority || 'high',
    createdAt: new Date().toISOString(),
  };

  const orgId = typeof options.orgId === 'string' 
    ? new Types.ObjectId(options.orgId) 
    : options.orgId;

  logger.info('[Broadcast] Maintenance alert', {
    title,
    orgId: orgId.toString(),
  });

  await publishNotification(orgId, payload, toObjectIdArray(options.userIds));
}

/**
 * Broadcast a system announcement (to all users in org)
 */
export async function broadcastSystemAnnouncement(
  title: string,
  message: string,
  options: BroadcastOptions
): Promise<void> {
  const payload: NotificationPayload = {
    id: generateNotificationId('sys'),
    type: 'system_announcement' as SSEEventType,
    title,
    message,
    link: options.link,
    priority: options.priority || 'medium',
    createdAt: new Date().toISOString(),
  };

  const orgId = typeof options.orgId === 'string' 
    ? new Types.ObjectId(options.orgId) 
    : options.orgId;

  logger.info('[Broadcast] System announcement', {
    title,
    orgId: orgId.toString(),
  });

  // System announcements go to all users in org
  await publishNotification(orgId, payload);
}

/**
 * Generic notification broadcast
 */
export async function broadcastNotification(
  type: SSEEventType,
  title: string,
  message: string,
  options: BroadcastOptions
): Promise<void> {
  const payload: NotificationPayload = {
    id: generateNotificationId('notif'),
    type,
    title,
    message,
    link: options.link,
    priority: options.priority || 'medium',
    createdAt: new Date().toISOString(),
  };

  const orgId = typeof options.orgId === 'string' 
    ? new Types.ObjectId(options.orgId) 
    : options.orgId;

  await publishNotification(orgId, payload, toObjectIdArray(options.userIds));
}
