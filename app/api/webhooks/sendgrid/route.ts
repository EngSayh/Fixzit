import { NextRequest } from "next/server";
import { createSecureResponse } from '@/server/security/headers';
import { getDatabase } from '@/lib/mongodb-unified';
import { verifyWebhookSignature } from '@/lib/sendgrid-config';

/**
 * SendGrid Event Webhook Handler
 * 
 * Receives delivery, open, click, bounce, and spam events from SendGrid
 * Updates email_logs collection with real-time delivery status
 * 
 * @see https://docs.sendgrid.com/for-developers/tracking-events/event
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security
 */

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'processed' | 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe';
  sg_event_id: string;
  sg_message_id: string;
  emailId?: string;
  errorId?: string;
  type?: string;
  url?: string; // For click events
  reason?: string; // For bounce/dropped events
  status?: string; // For bounce events (5.x.x format)
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const events: SendGridEvent[] = JSON.parse(rawBody);

    // Verify webhook signature (production security)
    const signature = req.headers.get('x-twilio-email-event-webhook-signature') || '';
    const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp') || '';
    const publicKey = req.headers.get('x-twilio-email-event-webhook-public-key') || '';

    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyWebhookSignature(publicKey, rawBody, signature, timestamp);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return createSecureResponse({ error: 'Invalid signature' }, 401, req);
      }
    }

    // Process events
    const db = await getDatabase();
    const emailsCollection = db.collection('email_logs');

    const updates = events.map(async (event) => {
      const emailId = event.emailId; // Custom arg we sent
      const eventDate = new Date(event.timestamp * 1000);

      // Build update based on event type
      const update: Record<string, unknown> = {
        lastEvent: event.event,
        lastEventAt: eventDate,
        [`events.${event.event}`]: eventDate
      };

      // Handle specific event types
      switch (event.event) {
        case 'delivered':
          update.status = 'delivered';
          update.deliveredAt = eventDate;
          break;

        case 'open':
          update.opened = true;
          update.openedAt = eventDate;
          update.openCount = { $inc: 1 };
          break;

        case 'click':
          update.clicked = true;
          update.clickedAt = eventDate;
          update.clickCount = { $inc: 1 };
          if (event.url) {
            update.clickedUrls = { $addToSet: event.url };
          }
          break;

        case 'bounce':
        case 'dropped':
          update.status = 'failed';
          update.failedAt = eventDate;
          update.error = event.reason || `Email ${event.event}`;
          update.bounceReason = event.reason;
          update.bounceStatus = event.status;
          break;

        case 'spamreport':
          update.status = 'spam';
          update.spamReportedAt = eventDate;
          break;

        case 'unsubscribe':
        case 'group_unsubscribe':
          update.unsubscribed = true;
          update.unsubscribedAt = eventDate;
          break;

        case 'group_resubscribe':
          update.unsubscribed = false;
          update.resubscribedAt = eventDate;
          break;
      }

      // Update email log
      if (emailId) {
        await emailsCollection.updateOne(
          { emailId },
          { 
            $set: update,
            $inc: update.openCount ? { openCount: 1 } : update.clickCount ? { clickCount: 1 } : {},
            $addToSet: update.clickedUrls ? { clickedUrls: event.url } : {}
          },
          { upsert: false }
        );
      } else {
        // Fallback: find by recipient email and sg_message_id
        await emailsCollection.updateOne(
          { 
            recipient: event.email,
            'metadata.sg_message_id': event.sg_message_id 
          },
          { 
            $set: update,
            $inc: update.openCount ? { openCount: 1 } : update.clickCount ? { clickCount: 1 } : {}
          },
          { upsert: false }
        );
      }

      console.log(`✅ Processed ${event.event} for ${event.email} (${emailId || event.sg_message_id})`);
    });

    await Promise.all(updates);

    return createSecureResponse({
      success: true,
      processed: events.length,
      message: 'Events processed successfully'
    }, 200, req);

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return createSecureResponse({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500, req);
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  return createSecureResponse({
    status: 'healthy',
    service: 'sendgrid-webhook',
    timestamp: new Date().toISOString()
  }, 200, req);
}
