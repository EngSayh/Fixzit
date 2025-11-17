import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { NOTIFY } from '@/domain/fm/fm.behavior';
import { sendBulkNotifications, type BulkNotificationResult } from '@/lib/integrations/notifications';
import { emitNotificationTelemetry } from '@/lib/telemetry';
/**
 * FM Notification Template Engine
 * Generates notifications with deep links for various FM events
 */

export type NotificationChannel = 'push' | 'email' | 'sms' | 'whatsapp';

export interface NotificationRecipient {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  preferredChannels: NotificationChannel[];
}

export interface NotificationPayload {
  id: string;
  event: keyof typeof NOTIFY;
  recipients: NotificationRecipient[];
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, unknown>;
  priority: 'high' | 'normal' | 'low';
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'partial_failure';
  failureReason?: string;
}

/**
 * Generate deep link for FM entities
 */
export function generateDeepLink(
  type: 'work-order' | 'approval' | 'property' | 'unit' | 'tenant' | 'financial',
  id: string,
  subPath?: string
): string {
  const scheme = process.env.NEXT_PUBLIC_FIXZIT_DEEP_LINK_SCHEME || 'fixzit://';
  const normalizedScheme = scheme.endsWith('://') ? scheme : `${scheme.replace(/\/+$/, '')}://`;
  const deepLinkMap = {
    'work-order': `${normalizedScheme}fm/work-orders/${id}`,
    'approval': `${normalizedScheme}approvals/quote/${id}`,
    'property': `${normalizedScheme}fm/properties/${id}`,
    'unit': `${normalizedScheme}fm/units/${id}`,
    'tenant': `${normalizedScheme}fm/tenants/${id}`,
    'financial': `${normalizedScheme}financials/statements/property/${id}`
  };

  const baseLink = deepLinkMap[type];
  return subPath ? `${baseLink}/${subPath}` : baseLink;
}

function requireContextValue(
  value: string | undefined,
  field: string,
  event: keyof typeof NOTIFY
): string {
  if (!value) {
    throw new Error(`[Notifications] Missing ${field} for ${event}`);
  }
  return value;
}

/**
 * Build notification from template
 */
export function buildNotification(
  event: keyof typeof NOTIFY,
  context: {
    workOrderId?: string;
    quotationId?: string;
    propertyId?: string;
    tenantName?: string;
    technicianName?: string;
    amount?: number;
    priority?: string;
    description?: string;
  },
  recipients: NotificationRecipient[]
): NotificationPayload {
  // Build notification title and body
  let title = 'Fixzit Notification';
  let body = '';
  let deepLink: string | undefined;
  let priority: 'high' | 'normal' | 'low' = 'normal';

  switch (event) {
    case 'onTicketCreated': {
      const workOrderId = requireContextValue(context.workOrderId, 'workOrderId', event);
      title = 'New Work Order Created';
      body = `Work Order #${workOrderId} has been created by ${context.tenantName ?? 'customer'}`;
      deepLink = generateDeepLink('work-order', workOrderId);
      priority = 'high';
      break;
    }

    case 'onAssign': {
      const workOrderId = requireContextValue(context.workOrderId, 'workOrderId', event);
      title = 'Work Order Assigned';
      body = `You have been assigned to Work Order #${workOrderId}`;
      deepLink = generateDeepLink('work-order', workOrderId);
      priority = 'high';
      break;
    }

    case 'onApprovalRequested': {
      const quotationId = requireContextValue(context.quotationId, 'quotationId', event);
      title = 'Approval Required';
      const amountText = typeof context.amount === 'number'
        ? ` (Amount: SAR ${context.amount.toLocaleString()})`
        : '';
      body = `Quotation #${quotationId} requires your approval${amountText}`;
      deepLink = generateDeepLink('approval', quotationId);
      priority = 'high';
      break;
    }

    case 'onApproved': {
      const quotationId = requireContextValue(context.quotationId, 'quotationId', event);
      title = 'Approval Granted';
      body = `Quotation #${quotationId} has been approved`;
      deepLink = generateDeepLink('approval', quotationId);
      priority = 'normal';
      break;
    }

    case 'onClosed': {
      const workOrderId = requireContextValue(context.workOrderId, 'workOrderId', event);
      title = 'Work Order Closed';
      body = `Work Order #${workOrderId} has been completed and closed`;
      deepLink = generateDeepLink('work-order', workOrderId);
      priority = 'normal';
      break;
    }

    default:
      body = 'Notification';
  }

  return {
    id: randomUUID(),
    event,
    recipients,
    title,
    body,
    deepLink,
    data: context,
    priority,
    createdAt: new Date(),
    status: 'pending'
  };
}

/**
 * Send notification to recipients via their preferred channels
 */
export async function sendNotification(
  notification: NotificationPayload
): Promise<void> {
  logger.info('[Notifications] Sending notification', { 
    id: notification.id,
    event: notification.event,
    recipientCount: notification.recipients.length,
    title: notification.title,
    deepLink: notification.deepLink
  });

  if (notification.recipients.length === 0) {
    notification.status = 'failed';
    notification.failureReason = 'No recipients provided';
    logger.warn('[Notifications] Skipping sendNotification (no recipients)', {
      id: notification.id,
      event: notification.event
    });
    return;
  }

  let result: BulkNotificationResult;

  try {
    result = await sendBulkNotifications(notification, notification.recipients);
  } catch (error) {
    notification.status = 'failed';
    notification.failureReason = 'Bulk notification dispatch failed';
    notification.sentAt = new Date();
    logger.error('[Notifications] Failed to send notification', {
      id: notification.id,
      error
    });
    throw error;
  }

  notification.sentAt = new Date();

  if (result.attempted === 0) {
    notification.status = 'failed';
    notification.failureReason = 'No valid channels or contact info';
  } else if (result.failed === 0) {
    notification.status = 'sent';
  } else if (result.failed === result.attempted) {
    notification.status = 'failed';
    notification.failureReason = 'All notification attempts failed';
  } else {
    notification.status = 'partial_failure';
    notification.failureReason = `${result.failed} of ${result.attempted} channel attempts failed`;
  }

  if (result.issues.length > 0) {
    logger.warn('[Notifications] Issues encountered while dispatching', {
      id: notification.id,
      issues: result.issues
    });
  }

  logger.info('[Notifications] Notification dispatch complete', {
    id: notification.id,
    status: notification.status,
    attempted: result.attempted,
    failed: result.failed,
    skipped: result.skipped
  });

  emitNotificationTelemetry({
    notificationId: notification.id,
    event: notification.event,
    status: notification.status,
    attempted: result.attempted,
    failed: result.failed,
    skipped: result.skipped,
    issues: result.issues
  }).catch(error => {
    logger.warn('[Notifications] Telemetry emission failed', { id: notification.id, error });
  });
}

/**
 * Event handlers - wire these to your application events
 */

export async function onTicketCreated(
  workOrderId: string,
  tenantName: string,
  priority: string,
  description: string,
  recipients: NotificationRecipient[]
): Promise<void> {
  const notification = buildNotification('onTicketCreated', {
    workOrderId,
    tenantName,
    priority,
    description
  }, recipients);

  await sendNotification(notification);
}

export async function onAssign(
  workOrderId: string,
  technicianName: string,
  description: string,
  recipients: NotificationRecipient[]
): Promise<void> {
  const notification = buildNotification('onAssign', {
    workOrderId,
    technicianName,
    description
  }, recipients);

  await sendNotification(notification);
}

export async function onApprovalRequested(
  quotationId: string,
  amount: number,
  description: string,
  recipients: NotificationRecipient[]
): Promise<void> {
  const notification = buildNotification('onApprovalRequested', {
    quotationId,
    amount,
    description
  }, recipients);

  await sendNotification(notification);
}

export async function onClosed(
  workOrderId: string,
  propertyId: string,
  recipients: NotificationRecipient[]
): Promise<void> {
  const notification = buildNotification('onClosed', {
    workOrderId,
    propertyId
  }, recipients);

  await sendNotification(notification);
}
