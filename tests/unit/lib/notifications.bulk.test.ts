import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sendBulkNotifications,
  type BulkNotificationResult
} from '@/lib/integrations/notifications';
import type { NotificationPayload, NotificationRecipient } from '@/lib/fm-notifications';
import * as notificationIntegrations from '@/lib/integrations/notifications';

function buildNotification(): NotificationPayload {
  return {
    id: 'NOTIF-TEST',
    event: 'onTicketCreated',
    recipients: [],
    title: 'Test notification',
    body: 'Body',
    priority: 'high',
    createdAt: new Date(),
    status: 'pending'
  };
}

describe('sendBulkNotifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks successful attempts across channels', async () => {
    const notification = buildNotification();
    const recipients: NotificationRecipient[] = [
      {
        userId: 'user-1',
        name: 'One',
        email: 'one@example.com',
        phone: '+15555550001',
        preferredChannels: ['push', 'email']
      },
      {
        userId: 'user-2',
        name: 'Two',
        phone: '+15555550002',
        preferredChannels: ['sms', 'whatsapp']
      }
    ];

    const pushSpy = vi.spyOn(notificationIntegrations, 'sendFCMNotification').mockResolvedValue();
    const emailSpy = vi.spyOn(notificationIntegrations, 'sendEmailNotification').mockResolvedValue();
    const smsSpy = vi.spyOn(notificationIntegrations, 'sendSMSNotification').mockResolvedValue();
    const whatsappSpy = vi.spyOn(notificationIntegrations, 'sendWhatsAppNotification').mockResolvedValue();

    const result = await sendBulkNotifications(notification, recipients);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(emailSpy).toHaveBeenCalledTimes(1);
    expect(smsSpy).toHaveBeenCalledTimes(1);
    expect(whatsappSpy).toHaveBeenCalledTimes(1);

    expect(result).toMatchObject<BulkNotificationResult>({
      attempted: 4,
      succeeded: 4,
      failed: 0,
      skipped: 0
    });
  });

  it('skips channels missing required contact info', async () => {
    const notification = buildNotification();
    const recipients: NotificationRecipient[] = [
      {
        userId: 'user-1',
        name: 'MissingEmail',
        preferredChannels: ['email']
      },
      {
        userId: 'user-2',
        name: 'MissingPhone',
        preferredChannels: ['sms', 'whatsapp']
      }
    ];

    const emailSpy = vi.spyOn(notificationIntegrations, 'sendEmailNotification').mockResolvedValue();
    const smsSpy = vi.spyOn(notificationIntegrations, 'sendSMSNotification').mockResolvedValue();
    const whatsappSpy = vi.spyOn(notificationIntegrations, 'sendWhatsAppNotification').mockResolvedValue();

    const result = await sendBulkNotifications(notification, recipients);

    expect(emailSpy).not.toHaveBeenCalled();
    expect(smsSpy).not.toHaveBeenCalled();
    expect(whatsappSpy).not.toHaveBeenCalled();

    expect(result.skipped).toBe(3);
    expect(result.attempted).toBe(0);
    expect(result.issues).toHaveLength(3);
    expect(result.issues.map(issue => issue.type)).toEqual(['skipped', 'skipped', 'skipped']);
  });

  it('records failures when providers reject send attempts', async () => {
    const notification = buildNotification();
    const recipients: NotificationRecipient[] = [
      {
        userId: 'user-1',
        name: 'FailureCase',
        phone: '+15555550001',
        preferredChannels: ['sms']
      }
    ];

    vi.spyOn(notificationIntegrations, 'sendSMSNotification').mockRejectedValue(new Error('Twilio down'));

    const result = await sendBulkNotifications(notification, recipients);

    expect(result.attempted).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.issues).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        channel: 'sms',
        type: 'failed',
        reason: 'Twilio down'
      })
    ]);
  });
});
