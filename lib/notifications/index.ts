/**
 * FEATURE-001: Notifications Module
 * 
 * Real-time notification system using Server-Sent Events (SSE).
 * 
 * @module lib/notifications
 */

export {
  broadcastWorkOrderNotification,
  broadcastPaymentNotification,
  broadcastBidNotification,
  broadcastMaintenanceAlert,
  broadcastSystemAnnouncement,
  broadcastNotification,
  type BroadcastOptions,
  type WorkOrderNotification,
  type PaymentNotification,
  type BidNotification,
} from './broadcast';
