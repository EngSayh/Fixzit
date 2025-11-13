import { logger } from '@/lib/logger';
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
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

/**
 * Generate deep link for FM entities
 */
export function generateDeepLink(
  type: 'work-order' | 'approval' | 'property' | 'unit' | 'tenant' | 'financial',
  id: string,
  subPath?: string
): string {
  const deepLinkMap = {
    'work-order': `fixizit://fm/work-orders/${id}`,
    'approval': `fixizit://approvals/quote/${id}`,
    'property': `fixizit://fm/properties/${id}`,
    'unit': `fixizit://fm/units/${id}`,
    'tenant': `fixizit://fm/tenants/${id}`,
    'financial': `fixizit://financials/statements/property/${id}`
  };

  const baseLink = deepLinkMap[type];
  return subPath ? `${baseLink}/${subPath}` : baseLink;
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
    case 'onTicketCreated':
      title = 'New Work Order Created';
      body = `Work Order #${context.workOrderId} has been created by ${context.tenantName}`;
      deepLink = generateDeepLink('work-order', context.workOrderId || '');
      priority = 'high';
      break;

    case 'onAssign':
      title = 'Work Order Assigned';
      body = `You have been assigned to Work Order #${context.workOrderId}`;
      deepLink = generateDeepLink('work-order', context.workOrderId || '');
      priority = 'high';
      break;

    case 'onApprovalRequested':
      title = 'Approval Required';
      body = `Quotation #${context.quotationId} requires your approval (Amount: SAR ${context.amount?.toLocaleString()})`;
      deepLink = generateDeepLink('approval', context.quotationId || '');
      priority = 'high';
      break;

    case 'onApproved':
      title = 'Approval Granted';
      body = `Quotation #${context.quotationId} has been approved`;
      deepLink = generateDeepLink('approval', context.quotationId || '');
      priority = 'normal';
      break;

    case 'onClosed':
      title = 'Work Order Closed';
      body = `Work Order #${context.workOrderId} has been completed and closed`;
      deepLink = generateDeepLink('financial', context.propertyId || '');
      priority = 'normal';
      break;

    default:
      body = 'Notification';
  }

  return {
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
  // TODO: Integrate with FCM or Web Push
  logger.info('[Notifications] Sending push', { recipientCount: recipients.length });
}

/**
 * Send email notifications
 */
async function sendEmailNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  logger.info('[Notifications] Sending email', { recipientCount: recipients.length });
}

/**
 * Send SMS notifications
 */
async function sendSMSNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
  logger.info('[Notifications] Sending SMS', { recipientCount: recipients.length });
}

/**
 * Send WhatsApp notifications
 */
async function sendWhatsAppNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  // TODO: Integrate with WhatsApp Business API
  logger.info('[Notifications] Sending WhatsApp', { recipientCount: recipients.length });
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
