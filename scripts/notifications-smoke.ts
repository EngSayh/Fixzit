#!/usr/bin/env tsx
/**
 * Notification smoke test runner.
 *
 * Usage:
 *   pnpm tsx scripts/notifications-smoke.ts push email sms whatsapp
 *
 * Environment (required per channel):
 *   Common:
 *     NOTIFICATIONS_SMOKE_USER_ID
 *     NOTIFICATIONS_SMOKE_NAME
 *     NOTIFICATIONS_SMOKE_EMAIL (for email)
 *     NOTIFICATIONS_SMOKE_PHONE (for sms/whatsapp)
 *   Push:
 *     FIREBASE_ADMIN_PROJECT_ID
 *     FIREBASE_ADMIN_CLIENT_EMAIL
 *     FIREBASE_ADMIN_PRIVATE_KEY
 *     User record must have valid fcmTokens in MongoDB
 *   Email:
 *     SENDGRID_API_KEY
 *     SENDGRID_FROM_EMAIL
 *     SENDGRID_FROM_NAME
 *   SMS:
 *     TWILIO_ACCOUNT_SID
 *     TWILIO_AUTH_TOKEN
 *     TWILIO_PHONE_NUMBER
 *   WhatsApp:
 *     WHATSAPP_BUSINESS_API_KEY
 *     WHATSAPP_PHONE_NUMBER_ID
 *
 * The script will only attempt the channels provided via CLI arguments.
 */

import 'dotenv/config';
import type { NotificationChannel, NotificationPayload, NotificationRecipient } from '../lib/fm-notifications';
import {
  sendBulkNotifications,
  type BulkNotificationResult
} from '../lib/integrations/notifications';

interface SmokeConfig {
  channels: NotificationChannel[];
  recipient: NotificationRecipient;
  payload: NotificationPayload;
}

function parseChannels(): NotificationChannel[] {
  const args = process.argv.slice(2);
  const normalized = args.length > 0 ? args : (process.env.NOTIFICATIONS_SMOKE_CHANNELS ?? 'email').split(',');
  const channels = normalized
    .map((ch) => ch.trim())
    .filter((ch): ch is NotificationChannel => ['push', 'email', 'sms', 'whatsapp'].includes(ch as NotificationChannel));

  if (channels.length === 0) {
    throw new Error('No valid channels provided. Use one or more of: push, email, sms, whatsapp');
  }

  return channels;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateChannelEnv(channels: NotificationChannel[]): void {
  const requirements: Record<NotificationChannel, string[]> = {
    push: ['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'],
    email: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    sms: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    whatsapp: ['WHATSAPP_BUSINESS_API_KEY', 'WHATSAPP_PHONE_NUMBER_ID']
  };

  const missingPerChannel: Record<string, string[]> = {};

  for (const channel of channels) {
    const missing = requirements[channel].filter((envName) => !process.env[envName]);
    if (missing.length) {
      missingPerChannel[channel] = missing;
    }
  }

  if (Object.keys(missingPerChannel).length) {
    const formatted = Object.entries(missingPerChannel)
      .map(([channel, vars]) => `- ${channel}: ${vars.join(', ')}`)
      .join('\n');
    throw new Error(`Missing required env vars for selected channels:\n${formatted}`);
  }
}

function buildConfig(): SmokeConfig {
  const channels = parseChannels();
  validateChannelEnv(channels);

  const userId = requireEnv('NOTIFICATIONS_SMOKE_USER_ID');

  const recipient: NotificationRecipient = {
    userId,
    name: process.env.NOTIFICATIONS_SMOKE_NAME ?? 'Smoke Test User',
    email: process.env.NOTIFICATIONS_SMOKE_EMAIL,
    phone: process.env.NOTIFICATIONS_SMOKE_PHONE,
    preferredChannels: channels
  };

  const payload: NotificationPayload = {
    id: `smoke-${Date.now()}`,
    event: 'onTicketCreated',
    recipients: [recipient],
    title: 'Fixzit Notification Smoke Test',
    body: 'This is an automated smoke test for the Fixzit notification channels.',
    priority: 'normal',
    data: {
      workOrderId: process.env.NOTIFICATIONS_SMOKE_WORKORDER_ID ?? 'WO-TEST',
      tenantName: process.env.NOTIFICATIONS_SMOKE_TENANT ?? 'Smoke Tenant'
    },
    createdAt: new Date(),
    status: 'pending'
  };

  return { channels, recipient, payload };
}

async function run(): Promise<void> {
  try {
    const { channels, recipient, payload } = buildConfig();

    console.log('Running Fixzit notification smoke test');
    console.log('Channels:', channels.join(', '));
    console.log('Recipient:', {
      userId: recipient.userId,
      email: recipient.email,
      phone: recipient.phone
    });

    const result: BulkNotificationResult = await sendBulkNotifications(payload, [recipient], {
      senders: {
        push: recipient.preferredChannels.includes('push')
          ? undefined
          : async () => Promise.resolve()
      }
    });

    console.log('Notification smoke test complete:', {
      attempted: result.attempted,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      issues: result.issues
    });
  } catch (error) {
    console.error('Notification smoke test failed');
    console.error(error);
    process.exitCode = 1;
  }
}

void run();
