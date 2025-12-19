import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendBulkNotifications,
  type BulkNotificationResult,
} from "@/lib/integrations/notifications";
import type {
  NotificationPayload,
  NotificationRecipient,
} from "@/lib/fm-notifications";
import { resetTestMocks } from "../../helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

function buildNotification(): NotificationPayload {
  return {
    id: "NOTIF-TEST",
    orgId: "org-1",
    event: "onTicketCreated",
    recipients: [],
    title: "Test notification",
    body: "Body",
    priority: "high",
    createdAt: new Date(),
    status: "pending",
  };
}

describe("sendBulkNotifications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks successful attempts across channels", async () => {
    const notification = buildNotification();
    const recipients: NotificationRecipient[] = [
      {
        userId: "user-1",
        name: "One",
        email: "one@example.com",
        phone: "+15555550001",
        preferredChannels: ["push", "email"],
      },
      {
        userId: "user-2",
        name: "Two",
        phone: "+15555550002",
        preferredChannels: ["sms", "whatsapp"],
      },
    ];

    const senders = {
      push: vi.fn().mockResolvedValue(undefined),
      email: vi.fn().mockResolvedValue(undefined),
      sms: vi.fn().mockResolvedValue(undefined),
      whatsapp: vi.fn().mockResolvedValue(undefined),
    };

    const result = await sendBulkNotifications(notification, recipients, {
      senders,
    });

    expect(senders.push).toHaveBeenCalledTimes(1);
    expect(senders.email).toHaveBeenCalledTimes(1);
    expect(senders.sms).toHaveBeenCalledTimes(1);
    expect(senders.whatsapp).toHaveBeenCalledTimes(1);

    expect(result).toMatchObject<BulkNotificationResult>({
      attempted: 4,
      succeeded: 4,
      failed: 0,
      skipped: 0,
      issues: expect.any(Array),
      channelMetrics: expect.any(Object),
    });
  });

  it("skips channels missing required contact info", async () => {
    const notification = buildNotification();
    const recipients: NotificationRecipient[] = [
      {
        userId: "user-1",
        name: "MissingEmail",
        preferredChannels: ["email"],
      },
      {
        userId: "user-2",
        name: "MissingPhone",
        preferredChannels: ["sms", "whatsapp"],
      },
    ];

    const senders = {
      push: vi.fn(),
      email: vi.fn(),
      sms: vi.fn(),
      whatsapp: vi.fn(),
    };

    const result = await sendBulkNotifications(notification, recipients, {
      senders,
    });

    expect(senders.email).not.toHaveBeenCalled();
    expect(senders.sms).not.toHaveBeenCalled();
    expect(senders.whatsapp).not.toHaveBeenCalled();

    expect(result.skipped).toBe(3);
    expect(result.attempted).toBe(0);
    expect(result.issues).toHaveLength(3);
    expect(result.issues.map((issue) => issue.type)).toEqual([
      "skipped",
      "skipped",
      "skipped",
    ]);
  });

  it("records failures when providers reject send attempts", async () => {
    const notification = buildNotification();
    const recipients: NotificationRecipient[] = [
      {
        userId: "user-1",
        name: "FailureCase",
        phone: "+15555550001",
        preferredChannels: ["sms"],
      },
    ];

    const senders = {
      push: vi.fn(),
      email: vi.fn(),
      sms: vi.fn().mockRejectedValue(new Error("Channel outage")),
      whatsapp: vi.fn(),
    };

    const result = await sendBulkNotifications(notification, recipients, {
      senders,
    });

    expect(result.attempted).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.issues).toEqual([
      expect.objectContaining({
        userId: "user-1",
        channel: "sms",
        type: "failed",
        reason: "Channel outage",
      }),
    ]);
  });
});
