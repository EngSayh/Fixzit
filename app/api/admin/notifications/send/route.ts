/**
 * Admin Notification Broadcast API
 * POST /api/admin/notifications/send
 * 
 * Allows super admins to send notifications via Email, SMS, or WhatsApp
 * to users, tenants, or corporate groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { getDatabase } from '@/lib/mongodb-unified';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
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
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    
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

    // Get database connection
    const db = await getDatabase();

    // Fetch recipient contacts based on type
    let targetContacts: Array<{ id: string; name: string; email?: string; phone?: string }> = [];

    if (recipients.type === 'users') {
      const query = recipients.ids?.length 
        ? { _id: { $in: recipients.ids } }
        : {};
      
      const users = await db.collection('users').find(query).toArray();
      targetContacts = users.map(u => ({
        id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        phone: u.phone
      }));
    } else if (recipients.type === 'tenants') {
      const query = recipients.ids?.length
        ? { _id: { $in: recipients.ids } }
        : {};
      
      const tenants = await db.collection('tenants').find(query).toArray();
      targetContacts = tenants.map(t => ({
        id: t._id.toString(),
        name: t.name,
        email: t.email || t.contactEmail,
        phone: t.phone || t.contactPhone
      }));
    } else if (recipients.type === 'corporate') {
      const query = recipients.ids?.length
        ? { _id: { $in: recipients.ids } }
        : {};
      
      const corps = await db.collection('organizations').find(query).toArray();
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

    for (const contact of targetContacts) {
      // Email
      if (channels.includes('email') && contact.email) {
        try {
          await sendEmail(contact.email, subject, message);
          results.email.sent++;
        } catch (error) {
          logger.error('[Admin Notification] Email failed', { error, email: contact.email });
          results.email.failed++;
        }
      }

      // SMS
      if (channels.includes('sms') && contact.phone) {
        try {
          const smsResult = await sendSMS(contact.phone, `${subject}\n\n${message}`);
          if (smsResult.success) {
            results.sms.sent++;
          } else {
            results.sms.failed++;
          }
        } catch (error) {
          logger.error('[Admin Notification] SMS failed', { error, phone: contact.phone });
          results.sms.failed++;
        }
      }

      // WhatsApp (placeholder - requires WhatsApp Business API integration)
      if (channels.includes('whatsapp') && contact.phone) {
        try {
          // TODO: Integrate WhatsApp Business API
          // For now, log as placeholder
          logger.info('[Admin Notification] WhatsApp not yet implemented', { phone: contact.phone });
          results.whatsapp.failed++;
        } catch (error) {
          logger.error('[Admin Notification] WhatsApp failed', { error, phone: contact.phone });
          results.whatsapp.failed++;
        }
      }
    }

    // Log notification in database
    await db.collection('admin_notifications').insertOne({
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
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sentAt: new Date(),
      results,
      status: 'sent',
      createdAt: new Date()
    });

    logger.info('[Admin Notification] Broadcast sent', {
      sender: session.user.email,
      recipients: recipients.type,
      channels,
      results
    });

    return NextResponse.json({
      success: true,
      message: 'Notifications sent successfully',
      results
    });

  } catch (error) {
    logger.error('[Admin Notification] Send failed', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send notifications' 
      },
      { status: 500 }
    );
  }
}
