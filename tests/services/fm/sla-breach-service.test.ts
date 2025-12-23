/**
 * @fileoverview Tests for SLA Breach Service
 * @module tests/services/fm/sla-breach-service
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectBreachLevel,
  filterAtRiskWorkOrders,
  scanForSlaBreaches,
  buildRecipientList,
  SlaBreachService,
  type WorkOrderForSla,
} from "@/services/fm/sla-breach-service";
import { Types } from "mongoose";

// Mock email service
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: "test-123" }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createMockWorkOrder(
  overrides: Partial<WorkOrderForSla> = {}
): WorkOrderForSla {
  return {
    _id: new Types.ObjectId(),
    workOrderNumber: "WO-001",
    title: "Test Work Order",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    dueAt: new Date(),
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    orgId: new Types.ObjectId(),
    assignment: {
      assigneeId: new Types.ObjectId(),
      assigneeName: "Test Technician",
      assigneeEmail: "tech@example.com",
    },
    property: {
      name: "Test Property",
      address: "123 Test St",
    },
    ...overrides,
  };
}

describe("SlaBreachService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectBreachLevel", () => {
    it("should return null for completed work orders", () => {
      const wo = createMockWorkOrder({
        status: "COMPLETED",
        dueAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      const result = detectBreachLevel(wo);
      expect(result.level).toBeNull();
    });

    it("should return null for cancelled work orders", () => {
      const wo = createMockWorkOrder({
        status: "CANCELLED",
        dueAt: new Date(Date.now() - 3600000),
      });

      const result = detectBreachLevel(wo);
      expect(result.level).toBeNull();
    });

    it("should return null for work orders not yet approaching deadline", () => {
      const wo = createMockWorkOrder({
        dueAt: new Date(Date.now() + 7200000), // 2 hours from now
      });

      const result = detectBreachLevel(wo);
      expect(result.level).toBeNull();
    });

    it("should return approaching for work orders within threshold", () => {
      const wo = createMockWorkOrder({
        dueAt: new Date(Date.now() + 1800000), // 30 minutes from now
      });

      const result = detectBreachLevel(wo);
      expect(result.level).toBe("approaching");
      expect(result.minutesUntilBreach).toBeDefined();
      expect(result.minutesUntilBreach).toBeLessThanOrEqual(60);
    });

    it("should return breached for work orders past deadline", () => {
      const wo = createMockWorkOrder({
        dueAt: new Date(Date.now() - 1800000), // 30 minutes ago
      });

      const result = detectBreachLevel(wo);
      expect(result.level).toBe("breached");
      expect(result.minutesPastBreach).toBeDefined();
    });

    it("should return critical for work orders way past deadline", () => {
      const wo = createMockWorkOrder({
        dueAt: new Date(Date.now() - 5 * 3600000), // 5 hours ago
      });

      const result = detectBreachLevel(wo);
      expect(result.level).toBe("critical");
      expect(result.minutesPastBreach).toBeGreaterThan(240); // 4 hours in minutes
    });

    it("should respect custom approaching threshold", () => {
      const wo = createMockWorkOrder({
        dueAt: new Date(Date.now() + 5400000), // 90 minutes from now
      });

      // Default threshold (60 min) - should not be approaching
      const result1 = detectBreachLevel(wo);
      expect(result1.level).toBeNull();

      // Custom threshold (120 min) - should be approaching
      const result2 = detectBreachLevel(wo, {
        approachingThresholdMinutes: 120,
      });
      expect(result2.level).toBe("approaching");
    });

    it("should respect custom critical threshold", () => {
      const wo = createMockWorkOrder({
        dueAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      });

      // Default threshold (4 hours) - should be breached, not critical
      const result1 = detectBreachLevel(wo);
      expect(result1.level).toBe("breached");

      // Custom threshold (1 hour) - should be critical
      const result2 = detectBreachLevel(wo, {
        criticalThresholdHours: 1,
      });
      expect(result2.level).toBe("critical");
    });
  });

  describe("buildRecipientList", () => {
    it("should include assignee email", () => {
      const wo = createMockWorkOrder();
      const recipients = buildRecipientList(wo, "approaching");

      expect(recipients).toHaveLength(1);
      expect(recipients[0].email).toBe("tech@example.com");
      expect(recipients[0].role).toBe("assignee");
    });

    it("should include managers for breached work orders", () => {
      const wo = createMockWorkOrder();
      const recipients = buildRecipientList(wo, "breached", [
        "manager@example.com",
      ]);

      expect(recipients).toHaveLength(2);
      expect(recipients.some((r) => r.role === "manager")).toBe(true);
    });

    it("should include managers for critical work orders", () => {
      const wo = createMockWorkOrder();
      const recipients = buildRecipientList(wo, "critical", [
        "manager1@example.com",
        "manager2@example.com",
      ]);

      expect(recipients).toHaveLength(3);
      expect(recipients.filter((r) => r.role === "manager")).toHaveLength(2);
    });

    it("should return empty list if no assignee and approaching", () => {
      const wo = createMockWorkOrder({
        assignment: {},
      });
      const recipients = buildRecipientList(wo, "approaching");

      expect(recipients).toHaveLength(0);
    });

    it("should include managers even if no assignee for breached", () => {
      const wo = createMockWorkOrder({
        assignment: {},
      });
      const recipients = buildRecipientList(wo, "breached", [
        "manager@example.com",
      ]);

      expect(recipients).toHaveLength(1);
      expect(recipients[0].role).toBe("manager");
    });
  });

  describe("filterAtRiskWorkOrders", () => {
    it("should categorize work orders by breach level", () => {
      const workOrders = [
        createMockWorkOrder({
          workOrderNumber: "WO-001",
          dueAt: new Date(Date.now() + 1800000), // approaching
        }),
        createMockWorkOrder({
          workOrderNumber: "WO-002",
          dueAt: new Date(Date.now() - 1800000), // breached
        }),
        createMockWorkOrder({
          workOrderNumber: "WO-003",
          dueAt: new Date(Date.now() - 5 * 3600000), // critical
        }),
        createMockWorkOrder({
          workOrderNumber: "WO-004",
          dueAt: new Date(Date.now() + 7200000), // not at risk
        }),
        createMockWorkOrder({
          workOrderNumber: "WO-005",
          status: "COMPLETED",
          dueAt: new Date(Date.now() - 3600000), // completed, ignore
        }),
      ];

      const result = filterAtRiskWorkOrders(workOrders);

      expect(result.approaching).toHaveLength(1);
      expect(result.breached).toHaveLength(1);
      expect(result.critical).toHaveLength(1);
      expect(result.approaching[0].workOrderNumber).toBe("WO-001");
      expect(result.breached[0].workOrderNumber).toBe("WO-002");
      expect(result.critical[0].workOrderNumber).toBe("WO-003");
    });

    it("should handle empty array", () => {
      const result = filterAtRiskWorkOrders([]);

      expect(result.approaching).toHaveLength(0);
      expect(result.breached).toHaveLength(0);
      expect(result.critical).toHaveLength(0);
    });
  });

  describe("scanForSlaBreaches", () => {
    it("should scan work orders and return results", async () => {
      const workOrders = [
        createMockWorkOrder({
          workOrderNumber: "WO-001",
          dueAt: new Date(Date.now() + 1800000), // approaching
        }),
        createMockWorkOrder({
          workOrderNumber: "WO-002",
          dueAt: new Date(Date.now() - 1800000), // breached
        }),
      ];

      const result = await scanForSlaBreaches(workOrders, [
        "manager@example.com",
      ]);

      expect(result.totalScanned).toBe(2);
      expect(result.approaching).toBe(1);
      expect(result.breached).toBe(1);
      expect(result.alerts).toHaveLength(2);
    });

    it("should not send emails when sendEmails is false", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      const workOrders = [
        createMockWorkOrder({
          dueAt: new Date(Date.now() - 1800000), // breached
        }),
      ];

      await scanForSlaBreaches(workOrders, [], { sendEmails: false });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should include fallback manager emails", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      const workOrders = [
        createMockWorkOrder({
          dueAt: new Date(Date.now() - 1800000), // breached
        }),
      ];

      await scanForSlaBreaches(workOrders, [], {
        fallbackManagerEmails: ["fallback@example.com"],
      });

      // Should send to assignee + fallback manager
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    it("should handle work orders with no recipients", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      const workOrders = [
        createMockWorkOrder({
          dueAt: new Date(Date.now() + 1800000), // approaching
          assignment: {}, // no assignee
        }),
      ];

      const result = await scanForSlaBreaches(workOrders, []);

      expect(result.approaching).toBe(1);
      expect(result.alertsSent).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should track successful and failed email sends", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      mockSendEmail
        .mockResolvedValueOnce({ success: true, messageId: "msg-1" })
        .mockResolvedValueOnce({ success: false, error: "SMTP error" });

      const workOrders = [
        createMockWorkOrder({
          dueAt: new Date(Date.now() - 1800000), // breached
        }),
      ];

      const result = await scanForSlaBreaches(workOrders, [
        "manager@example.com",
      ]);

      expect(result.alertsSent).toBe(1); // Only count successful sends
      expect(result.alerts[0].alertsSent).toHaveLength(2);
      expect(result.alerts[0].alertsSent.filter((a) => a.success)).toHaveLength(
        1
      );
    });
  });
});
