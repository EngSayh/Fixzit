/**
 * FEATURE-001: SSE Module Tests
 * 
 * Unit tests for the Server-Sent Events notification system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import {
  subscribeToNotifications,
  publishNotification,
  formatSSEMessage,
  createHeartbeat,
  getActiveSubscriptionCount,
  getUserConnectionCount,
  SSE_CONFIG,
  _resetForTesting,
  type NotificationPayload,
} from '@/lib/sse';

describe('SSE Module', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe('formatSSEMessage', () => {
    it('formats a basic message correctly', () => {
      const message = formatSSEMessage({
        id: 'test-123',
        event: 'notification',
        data: { foo: 'bar' },
      });

      expect(message).toContain('id: test-123');
      expect(message).toContain('event: notification');
      expect(message).toContain('data: {"foo":"bar"}');
      expect(message.endsWith('\n\n')).toBe(true);
    });

    it('includes retry field when specified', () => {
      const message = formatSSEMessage({
        id: 'test-456',
        event: 'notification',
        data: { test: true },
        retry: 3000,
      });

      expect(message).toContain('retry: 3000');
    });
  });

  describe('createHeartbeat', () => {
    it('creates a valid heartbeat message', () => {
      const heartbeat = createHeartbeat();

      expect(heartbeat).toMatch(/^: heartbeat \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(heartbeat.endsWith('\n\n')).toBe(true);
    });
  });

  describe('subscribeToNotifications', () => {
    it('creates a subscription and returns unsubscribe function', () => {
      const orgId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const callback = vi.fn();

      expect(getActiveSubscriptionCount()).toBe(0);

      const unsubscribe = subscribeToNotifications(orgId, userId, callback);

      expect(getActiveSubscriptionCount()).toBe(1);
      expect(getActiveSubscriptionCount(orgId)).toBe(1);
      expect(getUserConnectionCount(userId)).toBe(1);

      unsubscribe();

      expect(getActiveSubscriptionCount()).toBe(0);
    });

    it('respects max connections per user limit', () => {
      const orgId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const callback = vi.fn();

      // Create max connections
      const unsubscribes: (() => void)[] = [];
      for (let i = 0; i < SSE_CONFIG.MAX_CONNECTIONS_PER_USER; i++) {
        unsubscribes.push(subscribeToNotifications(orgId, userId, callback));
      }

      expect(getUserConnectionCount(userId)).toBe(SSE_CONFIG.MAX_CONNECTIONS_PER_USER);

      // Try to add one more - should fail silently
      const extraUnsubscribe = subscribeToNotifications(orgId, userId, callback);
      
      // Still at max
      expect(getUserConnectionCount(userId)).toBe(SSE_CONFIG.MAX_CONNECTIONS_PER_USER);

      // Cleanup
      unsubscribes.forEach(unsub => unsub());
      extraUnsubscribe();
    });
  });

  describe('publishNotification', () => {
    it('delivers notifications to subscribers in the same org', async () => {
      const orgId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const callback = vi.fn();

      subscribeToNotifications(orgId, userId, callback);

      const notification: NotificationPayload = {
        id: 'notif-1',
        type: 'work_order_update',
        title: 'Test Notification',
        message: 'This is a test',
        priority: 'medium',
        createdAt: new Date().toISOString(),
      };

      await publishNotification(orgId, notification);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(notification);
    });

    it('does not deliver notifications to different orgs', async () => {
      const orgId1 = new Types.ObjectId();
      const orgId2 = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribeToNotifications(orgId1, userId, callback1);
      subscribeToNotifications(orgId2, userId, callback2);

      const notification: NotificationPayload = {
        id: 'notif-1',
        type: 'notification',
        title: 'Test',
        message: 'Test message',
        priority: 'low',
        createdAt: new Date().toISOString(),
      };

      await publishNotification(orgId1, notification);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it('filters by target user IDs when specified', async () => {
      const orgId = new Types.ObjectId();
      const userId1 = new Types.ObjectId();
      const userId2 = new Types.ObjectId();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribeToNotifications(orgId, userId1, callback1);
      subscribeToNotifications(orgId, userId2, callback2);

      const notification: NotificationPayload = {
        id: 'notif-1',
        type: 'notification',
        title: 'Targeted',
        message: 'For user 1 only',
        priority: 'medium',
        createdAt: new Date().toISOString(),
      };

      await publishNotification(orgId, notification, [userId1]);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it('broadcasts to all org users when no target specified', async () => {
      const orgId = new Types.ObjectId();
      const userId1 = new Types.ObjectId();
      const userId2 = new Types.ObjectId();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribeToNotifications(orgId, userId1, callback1);
      subscribeToNotifications(orgId, userId2, callback2);

      const notification: NotificationPayload = {
        id: 'notif-1',
        type: 'system_announcement',
        title: 'Announcement',
        message: 'For everyone',
        priority: 'high',
        createdAt: new Date().toISOString(),
      };

      await publishNotification(orgId, notification);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveSubscriptionCount', () => {
    it('counts all subscriptions when no org specified', () => {
      const orgId1 = new Types.ObjectId();
      const orgId2 = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const callback = vi.fn();

      subscribeToNotifications(orgId1, userId, callback);
      subscribeToNotifications(orgId1, userId, callback);
      subscribeToNotifications(orgId2, userId, callback);

      expect(getActiveSubscriptionCount()).toBe(3);
    });

    it('counts only subscriptions for specific org', () => {
      const orgId1 = new Types.ObjectId();
      const orgId2 = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const callback = vi.fn();

      subscribeToNotifications(orgId1, userId, callback);
      subscribeToNotifications(orgId1, userId, callback);
      subscribeToNotifications(orgId2, userId, callback);

      expect(getActiveSubscriptionCount(orgId1)).toBe(2);
      expect(getActiveSubscriptionCount(orgId2)).toBe(1);
    });
  });
});
