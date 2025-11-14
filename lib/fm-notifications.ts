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
  logger.info('[Notifications] Sending push', { recipientCount: recipients.length });
  
  // FCM Integration (if configured)
  if (process.env.FCM_SERVER_KEY && process.env.FCM_SENDER_ID) {
    try {
      const admin = await import('firebase-admin').catch(() => null);
      
      if (admin && !admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }
      
      if (admin) {
        const tokens = recipients
          .map(r => (r as { fcmToken?: string }).fcmToken)
          .filter((t): t is string => Boolean(t));
        
        if (tokens.length > 0) {
          await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: {
              deepLink: notification.deepLink || '',
              ...notification.data as Record<string, string>,
            },
          });
          logger.info('[Notifications] FCM push sent', { tokenCount: tokens.length });
        }
      }
    } catch (error: unknown) {
      logger.error('[Notifications] FCM push failed:', { error });
    }
  } else {
    logger.debug('[Notifications] FCM not configured (FCM_SERVER_KEY or FCM_SENDER_ID missing)');
  }
}

/**
 * Send email notifications
 */
async function sendEmailNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  logger.info('[Notifications] Sending email', { recipientCount: recipients.length });
  
  // SendGrid Integration (if configured)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = await import('@sendgrid/mail').then(m => m.default).catch(() => null);
      
      if (sgMail) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        const emails = recipients
          .map(r => r.email)
          .filter((e): e is string => Boolean(e));
        
        if (emails.length > 0) {
          await sgMail.sendMultiple({
            to: emails,
            from: process.env.SENDGRID_FROM_EMAIL || 'notifications@fixzit.com',
            subject: notification.title,
            text: notification.body,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">${notification.title}</h2>
                <p style="color: #666; line-height: 1.6;">${notification.body}</p>
                ${notification.deepLink ? `<p><a href="${notification.deepLink}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View Details</a></p>` : ''}
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="color: #999; font-size: 12px;">This is an automated notification from Fixzit. Please do not reply to this email.</p>
              </div>
            `,
          });
          logger.info('[Notifications] Email sent via SendGrid', { recipientCount: emails.length });
        }
      }
    } catch (error: unknown) {
      logger.error('[Notifications] Email send failed:', { error });
    }
  } else {
    logger.debug('[Notifications] SendGrid not configured (SENDGRID_API_KEY missing)');
  }
}

/**
 * Send SMS notifications
 */
async function sendSMSNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  logger.info('[Notifications] Sending SMS', { recipientCount: recipients.length });
  
  // Twilio Integration (if configured)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = await import('twilio').then(m => m.default).catch(() => null);
      
      if (twilio) {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        
        const phones = recipients
          .map(r => r.phone)
          .filter((p): p is string => Boolean(p));
        
        if (phones.length > 0) {
          const smsBody = `${notification.title}\n\n${notification.body}${notification.deepLink ? `\n\nView: ${notification.deepLink}` : ''}`;
          
          await Promise.all(
            phones.map(phone =>
              client.messages.create({
                to: phone,
                from: process.env.TWILIO_PHONE_NUMBER || '',
                body: smsBody.substring(0, 1600), // SMS length limit
              })
            )
          );
          logger.info('[Notifications] SMS sent via Twilio', { recipientCount: phones.length });
        }
      }
    } catch (error: unknown) {
      logger.error('[Notifications] SMS send failed:', { error });
    }
  } else {
    logger.debug('[Notifications] Twilio not configured (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing)');
  }
}

/**
 * Send WhatsApp notifications
 */
async function sendWhatsAppNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[]
): Promise<void> {
  logger.info('[Notifications] Sending WhatsApp', { recipientCount: recipients.length });
  
  // WhatsApp Business API via Twilio (if configured)
  if (process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = await import('twilio').then(m => m.default).catch(() => null);
      
      if (twilio) {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN || ''
        );
        
        const phones = recipients
          .map(r => r.phone)
          .filter((p): p is string => Boolean(p));
        
        if (phones.length > 0) {
          const whatsappBody = `*${notification.title}*\n\n${notification.body}${notification.deepLink ? `\n\nView Details: ${notification.deepLink}` : ''}`;
          
          await Promise.all(
            phones.map(phone =>
              client.messages.create({
                to: `whatsapp:${phone}`,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                body: whatsappBody,
              })
            )
          );
          logger.info('[Notifications] WhatsApp sent via Twilio', { recipientCount: phones.length });
        }
      }
    } catch (error) {
      logger.error('[Notifications] WhatsApp send failed:', { error });
    }
  } else {
    logger.debug('[Notifications] WhatsApp not configured (TWILIO_WHATSAPP_NUMBER or TWILIO_ACCOUNT_SID missing)');
  }
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
