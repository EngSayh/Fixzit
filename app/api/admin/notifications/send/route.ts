/**
 * Admin Notification Broadcast API
 * POST /api/admin/notifications/send
 * 
 * Allows super admins to send notifications via Email, SMS, or WhatsApp
 * to users, tenants, or corporate groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Document, type Filter } from 'mongodb';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb-unified';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
import { logCommunication } from '@/lib/communication-logger';
import { logger } from '@/lib/logger';

interface NotificationRequest {
  recipients: {
    type: 'users' | 'tenants' | 'corporate' | 'all';
    ids?: string[]; // Specific user/tenant IDs, or empty for "all"
  };
  channels: ('email' | 'sms' | 'whatsapp')[];
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: string; // ISO timestamp for scheduled delivery
}

export async function POST(req: NextRequest) {
  const logPromises: Promise<void>[] = [];
  const enqueueLog = (entry: Parameters<typeof logCommunication>[0]) => {
    logPromises.push(
      logCommunication(entry)
        .then((result) => {
          if (!result.success) {
            logger.warn('[Admin Notification] Communication log failed', {
              error: result.error,
              channel: entry.channel,
              recipient: entry.recipient,
            });
          }
        })
        .catch((error) => {
          logger.error('[Admin Notification] Communication log error', error as Error, {
            channel: entry.channel,
            recipient: entry.recipient,
          });
        })
    );
  };
  const flushLogs = async () => {
    if (logPromises.length > 0) {
      await Promise.allSettled(logPromises);
    }
  };

  try {
    // Authentication check
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Super admin check
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: NotificationRequest = await req.json();
    const { recipients, channels, subject, message, priority, scheduledAt } = body;

    // Validation
    if (!recipients?.type || !channels?.length || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: recipients, channels, subject, message' },
        { status: 400 }
      );
    }

    let scheduledDate: Date | null = null;
    if (scheduledAt) {
      const parsed = Date.parse(scheduledAt);
      if (Number.isNaN(parsed)) {
        return NextResponse.json(
          { success: false, error: 'Invalid scheduledAt timestamp' },
          { status: 400 }
        );
      }
      scheduledDate = new Date(parsed);
    }

    // Get database connection
    const db = await getDatabase();
    const broadcastId = new ObjectId();

    const triggeredBy = (session.user as { id?: string }).id || session.user.email || 'unknown';
    const senderEmail = session.user.email;

    // Fetch recipient contacts based on type
    let targetContacts: Array<{ id: string; name: string; email?: string; phone?: string }> = [];

    const buildRecipientQuery = (ids?: string[]): Filter<Document> | null => {
      if (!ids?.length) {
        return {};
      }

      const objectIds = ids
        .map(id => {
          try {
            return new ObjectId(id);
          } catch (error) {
            logger.warn('[Admin Notification] Invalid recipient id provided', { id, error });
            return null;
          }
        })
        .filter((value): value is ObjectId => value !== null);

      if (!objectIds.length) {
        return null;
      }

      return { _id: { $in: objectIds } };
    };

    if (recipients.type === 'users') {
      const query = buildRecipientQuery(recipients.ids);
      if (recipients.ids?.length && query === null) {
        return NextResponse.json(
          { success: false, error: 'Invalid user recipient IDs' },
          { status: 400 }
        );
      }

      const users = await db.collection('users').find(query ?? {}).toArray();
      targetContacts = users.map(u => ({
        id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        phone: u.phone
      }));
    } else if (recipients.type === 'tenants') {
      const query = buildRecipientQuery(recipients.ids);
      if (recipients.ids?.length && query === null) {
        return NextResponse.json(
          { success: false, error: 'Invalid tenant recipient IDs' },
          { status: 400 }
        );
      }

      const tenants = await db.collection('tenants').find(query ?? {}).toArray();
      targetContacts = tenants.map(t => ({
        id: t._id.toString(),
        name: t.name,
        email: t.email || t.contactEmail,
        phone: t.phone || t.contactPhone
      }));
    } else if (recipients.type === 'corporate') {
      const query = buildRecipientQuery(recipients.ids);
      if (recipients.ids?.length && query === null) {
        return NextResponse.json(
          { success: false, error: 'Invalid corporate recipient IDs' },
          { status: 400 }
        );
      }

      const corps = await db.collection('organizations').find(query ?? {}).toArray();
      targetContacts = corps.map(c => ({
        id: c._id.toString(),
        name: c.name,
        email: c.contactEmail,
        phone: c.contactPhone
      }));
    } else if (recipients.type === 'all') {
      // Fetch all users
      const users = await db.collection('users').find({}).toArray();
      targetContacts = users.map(u => ({
        id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        phone: u.phone
      }));
    }

    if (targetContacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients found' },
        { status: 404 }
      );
    }

    // Send notifications
    const results = {
      email: { sent: 0, failed: 0 },
      sms: { sent: 0, failed: 0 },
      whatsapp: { sent: 0, failed: 0 },
      totalRecipients: targetContacts.length
    };

    const smsBody = `${subject}\n\n${message}`;

    for (const contact of targetContacts) {
      // Email
      if (channels.includes('email') && contact.email) {
        try {
          const emailResult = await sendEmail(contact.email, subject, message);
          if (emailResult.success) {
            results.email.sent++;
          } else {
            results.email.failed++;
            logger.error('[Admin Notification] Email failed', {
              email: contact.email,
              error: emailResult.error,
            });
          }
          enqueueLog({
            userId: contact.id,
            channel: 'email',
            type: 'broadcast',
            recipient: contact.email,
            subject,
            message,
            status: emailResult.success ? 'sent' : 'failed',
            errorMessage: emailResult.success ? undefined : emailResult.error,
            metadata: {
              email: contact.email,
              name: contact.name,
              priority: priority || 'normal',
              broadcastId: broadcastId.toString(),
              triggeredBy,
              sendgridId: emailResult.messageId,
              triggeredByEmail: senderEmail,
            },
          });
        } catch (error) {
          logger.error('[Admin Notification] Email failed', { error, email: contact.email });
          results.email.failed++;
          enqueueLog({
            userId: contact.id,
            channel: 'email',
            type: 'broadcast',
            recipient: contact.email,
            subject,
            message,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: {
              email: contact.email,
              name: contact.name,
              priority: priority || 'normal',
              broadcastId: broadcastId.toString(),
              triggeredBy,
              triggeredByEmail: senderEmail,
            },
          });
        }
      }

      // SMS
      if (channels.includes('sms') && contact.phone) {
        try {
          const smsResult = await sendSMS(contact.phone, smsBody);
          if (smsResult.success) {
            results.sms.sent++;
          } else {
            results.sms.failed++;
            logger.error('[Admin Notification] SMS failed', {
              phone: contact.phone,
              error: smsResult.error,
            });
          }
          enqueueLog({
            userId: contact.id,
            channel: 'sms',
            type: 'broadcast',
            recipient: contact.phone,
            subject,
            message: smsBody,
            status: smsResult.success ? 'sent' : 'failed',
            errorMessage: smsResult.success ? undefined : smsResult.error,
            metadata: {
              phone: contact.phone,
              name: contact.name,
              priority: priority || 'normal',
              broadcastId: broadcastId.toString(),
              triggeredBy,
              segments: Math.max(1, Math.ceil(smsBody.length / 160)),
            },
          });
        } catch (error) {
          logger.error('[Admin Notification] SMS failed', { error, phone: contact.phone });
          results.sms.failed++;
          enqueueLog({
            userId: contact.id,
            channel: 'sms',
            type: 'broadcast',
            recipient: contact.phone,
            subject,
            message: smsBody,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: {
              phone: contact.phone,
              name: contact.name,
              priority: priority || 'normal',
              broadcastId: broadcastId.toString(),
              triggeredBy,
            },
          });
        }
      }

      // WhatsApp (placeholder - requires WhatsApp Business API integration)
      if (channels.includes('whatsapp') && contact.phone) {
        try {
          // TODO: Integrate WhatsApp Business API
          // For now, log as placeholder
          logger.info('[Admin Notification] WhatsApp not yet implemented', { phone: contact.phone });
          results.whatsapp.failed++;
          enqueueLog({
            userId: contact.id,
            channel: 'whatsapp',
            type: 'broadcast',
            recipient: contact.phone,
            subject,
            message,
            status: 'failed',
            errorMessage: 'WhatsApp channel not yet implemented',
            metadata: {
              phone: contact.phone,
              name: contact.name,
              priority: priority || 'normal',
              broadcastId: broadcastId.toString(),
              triggeredBy,
            },
          });
        } catch (error) {
          logger.error('[Admin Notification] WhatsApp failed', { error, phone: contact.phone });
          results.whatsapp.failed++;
        }
      }
    }

    // Log notification in database
    await db.collection('admin_notifications').insertOne({
      _id: broadcastId,
      senderId: session.user.id,
      senderEmail: session.user.email,
      recipients: {
        type: recipients.type,
        ids: recipients.ids || [],
        count: targetContacts.length
      },
      channels,
      subject,
      message,
      priority: priority || 'normal',
      scheduledAt: scheduledDate,
      sentAt: new Date(),
      results,
      status: 'sent',
      createdAt: new Date()
    });

    logger.info('[Admin Notification] Broadcast sent', {
      sender: session.user.email,
      recipients: recipients.type,
      channels,
      results,
      broadcastId: broadcastId.toString(),
    });

    await flushLogs();

    return NextResponse.json({
      success: true,
      message: 'Notifications sent successfully',
      results
    });

  } catch (error) {
    logger.error('[Admin Notification] Send failed', { error });
    await flushLogs();
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send notifications' 
      },
      { status: 500 }
    );
  }
}
