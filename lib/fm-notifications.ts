import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { sendFCMNotification, sendEmailNotification, sendSMSNotification, sendWhatsAppNotification } from '@/lib/integrations/notifications';
/**
 * FM Notification Template Engine
 * Generates notifications with deep links for various FM events
 */

import { NOTIFY } from '@/domain/fm/fm.behavior';

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

  // Group recipients by preferred channels
  const channelGroups: Record<NotificationChannel, NotificationRecipient[]> = {
    push: [],
    email: [],
    sms: [],
    whatsapp: []
  };

  notification.recipients.forEach(recipient => {
    recipient.preferredChannels.forEach(channel => {
      channelGroups[channel].push(recipient);
    });
  });

  // Send via push notifications
  if (channelGroups.push.length > 0) {
    await sendPushNotifications(notification, channelGroups.push);
  }

  // Send via email
  if (channelGroups.email.length > 0) {
    await sendEmailNotifications(notification, channelGroups.email);
  }

  // Send via SMS
  if (channelGroups.sms.length > 0) {
    await sendSMSNotifications(notification, channelGroups.sms);
  }

  // Send via WhatsApp
  if (channelGroups.whatsapp.length > 0) {
    await sendWhatsAppNotifications(notification, channelGroups.whatsapp);
  }

  notification.status = 'sent';
  notification.sentAt = new Date();
}

/**
 * Send push notifications (Web Push API / Firebase Cloud Messaging)
 */
async function sendPushNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  logger.info('[Notifications] Sending push', { recipientCount: recipients.length });
  
  // Send via FCM to each recipient
  await Promise.allSettled(
    recipients.map(recipient => sendFCMNotification(recipient.userId, notification))
  );
}

/**
 * Send email notifications
 */
async function sendEmailNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  logger.info('[Notifications] Sending email', { recipientCount: recipients.length });
  
  // Send via SendGrid to each recipient
  await Promise.allSettled(
    recipients.map(recipient => sendEmailNotification(recipient, notification))
  );
}

/**
 * Send SMS notifications
 */
async function sendSMSNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  logger.info('[Notifications] Sending SMS', { recipientCount: recipients.length });
  
  // Send via Twilio to each recipient
  await Promise.allSettled(
    recipients.map(recipient => sendSMSNotification(recipient, notification))
  );
}

/**
 * Send WhatsApp notifications
 */
async function sendWhatsAppNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  logger.info('[Notifications] Sending WhatsApp', { recipientCount: recipients.length });
  
  // Send via WhatsApp Business API to each recipient
  await Promise.allSettled(
    recipients.map(recipient => sendWhatsAppNotification(recipient, notification))
  );
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
