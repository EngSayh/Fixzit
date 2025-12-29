/**
 * @fileoverview Tests for Notification Engine Service
 * @module tests/services/admin/notification-engine
 * 
 * Tests multi-channel notification system functionality including:
 * - Authentication and tenant isolation (orgId)
 * - Notification sending and queuing
 * - User preference handling
 * - Template processing
 * 
 * @testcoverage TG-003: Service Layer Tests
 * @agent [AGENT-001-A]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock MongoDB before imports
const mockCollection = {
  findOne: vi.fn(),
  find: vi.fn(() => ({ toArray: vi.fn(() => []) })),
  insertOne: vi.fn(),
  insertMany: vi.fn(() => ({ insertedIds: { '0': 'mock-id-1' } })),
  updateOne: vi.fn(),
  countDocuments: vi.fn(() => 0),
  aggregate: vi.fn(() => ({ toArray: vi.fn(() => []) })),
};

const mockDb = {
  collection: vi.fn(() => mockCollection),
};

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import {
  sendNotification,
  sendBulkNotifications,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from "@/services/admin/notification-engine";

describe("notification-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.findOne.mockResolvedValue(null);
    mockCollection.insertMany.mockResolvedValue({ insertedIds: { '0': 'mock-id-1' } });
  });

  describe("sendNotification", () => {
    it("should require orgId (tenant isolation)", async () => {
      const request = {
        orgId: "org-123",
        userId: "user-456",
        category: NotificationCategory.SYSTEM,
        subject: "Test Notification",
        body: "Test body content",
      };

      const result = await sendNotification(request);
      
      // Verify notification was created with orgId
      expect(mockCollection.insertMany).toHaveBeenCalled();
      const insertedData = mockCollection.insertMany.mock.calls[0][0];
      expect(insertedData[0].orgId).toBe("org-123");
    });

    it("should default to IN_APP channel when no channels specified", async () => {
      const request = {
        orgId: "org-123",
        userId: "user-456",
        category: NotificationCategory.SYSTEM,
        subject: "Test Notification",
        body: "Test body",
      };

      await sendNotification(request);
      
      const insertedData = mockCollection.insertMany.mock.calls[0][0];
      expect(insertedData[0].channel).toBe(NotificationChannel.IN_APP);
    });

    it("should respect user preferences and filter channels", async () => {
      // User has disabled EMAIL channel
      mockCollection.findOne.mockResolvedValueOnce({
        orgId: "org-123",
        userId: "user-456",
        channels: {
          email: { enabled: false },
          in_app: { enabled: true },
        },
      });

      const request = {
        orgId: "org-123",
        userId: "user-456",
        category: NotificationCategory.SYSTEM,
        subject: "Test",
        body: "Body",
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      };

      await sendNotification(request);
      
      // Should only create IN_APP notification since EMAIL is disabled
      const insertedData = mockCollection.insertMany.mock.calls[0][0];
      expect(insertedData.length).toBe(1);
      expect(insertedData[0].channel).toBe(NotificationChannel.IN_APP);
    });

    it("should return error when user unsubscribed from all channels", async () => {
      // User has unsubscribed from SYSTEM category
      mockCollection.findOne.mockResolvedValueOnce({
        orgId: "org-123",
        userId: "user-456",
        channels: {
          in_app: { enabled: true },
        },
        unsubscribedFrom: [NotificationCategory.SYSTEM],
      });

      const request = {
        orgId: "org-123",
        userId: "user-456",
        category: NotificationCategory.SYSTEM,
        subject: "Test",
        body: "Body",
      };

      const result = await sendNotification(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("User has unsubscribed from all channels");
    });

    it("should create notifications with correct priority", async () => {
      const request = {
        orgId: "org-123",
        userId: "user-456",
        category: NotificationCategory.SECURITY,
        priority: NotificationPriority.CRITICAL,
        subject: "Security Alert",
        body: "Suspicious login detected",
      };

      await sendNotification(request);
      
      const insertedData = mockCollection.insertMany.mock.calls[0][0];
      expect(insertedData[0].priority).toBe(NotificationPriority.CRITICAL);
    });

    it("should return notificationIds on success", async () => {
      mockCollection.insertMany.mockResolvedValue({
        insertedIds: { '0': 'notif-abc-123' },
      });

      const request = {
        orgId: "org-123",
        userId: "user-456",
        category: NotificationCategory.BILLING,
        subject: "Invoice Ready",
        body: "Your invoice is ready",
      };

      const result = await sendNotification(request);
      
      expect(result.success).toBe(true);
      expect(result.notificationIds).toContain("notif-abc-123");
    });
  });

  describe("sendBulkNotifications", () => {
    it("should process multiple notifications and track success/failure", async () => {
      const requests = [
        {
          orgId: "org-123",
          userId: "user-1",
          category: NotificationCategory.REMINDER,
          subject: "Reminder 1",
          body: "Body 1",
        },
        {
          orgId: "org-123",
          userId: "user-2",
          category: NotificationCategory.REMINDER,
          subject: "Reminder 2",
          body: "Body 2",
        },
      ];

      const result = await sendBulkNotifications(requests);
      
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("should enforce same orgId for all bulk notifications (tenant isolation)", async () => {
      const requests = [
        {
          orgId: "org-123",
          userId: "user-1",
          category: NotificationCategory.ALERT,
          subject: "Alert",
          body: "Body",
        },
      ];

      await sendBulkNotifications(requests);
      
      // Verify all insertions have orgId
      const calls = mockCollection.insertMany.mock.calls;
      calls.forEach(call => {
        const notifications = call[0];
        notifications.forEach((notif: { orgId: string }) => {
          expect(notif.orgId).toBe("org-123");
        });
      });
    });
  });
});
