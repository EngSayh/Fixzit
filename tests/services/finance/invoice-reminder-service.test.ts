/**
 * @fileoverview Tests for Invoice Reminder Service
 * @module tests/services/finance/invoice-reminder-service
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateOutstandingAmount,
  determineReminderLevel,
  canSendReminder,
  scanForReminders,
  filterInvoicesByReminderLevel,
  getScheduledReminders,
  InvoiceReminderService,
  type InvoiceForReminder,
} from "@/services/finance/invoice-reminder-service";
import { Types } from "mongoose";
import { addDays, subDays } from "date-fns";

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
    debug: vi.fn(),
  },
}));

function createMockInvoice(
  overrides: Partial<InvoiceForReminder> = {}
): InvoiceForReminder {
  return {
    _id: new Types.ObjectId(),
    number: "INV-001",
    type: "SERVICE",
    status: "SENT",
    issueDate: subDays(new Date(), 30),
    dueDate: new Date(),
    total: 1000,
    currency: "SAR",
    orgId: new Types.ObjectId(),
    recipient: {
      name: "Test Customer",
      email: "customer@example.com",
      phone: "+966501234567",
    },
    issuer: {
      name: "Fixzit",
      email: "finance@fixzit.com",
    },
    payments: [],
    ...overrides,
  };
}

describe("InvoiceReminderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateOutstandingAmount", () => {
    it("should return full total when no payments", () => {
      const invoice = createMockInvoice({ total: 1000, payments: [] });
      expect(calculateOutstandingAmount(invoice)).toBe(1000);
    });

    it("should subtract completed payments", () => {
      const invoice = createMockInvoice({
        total: 1000,
        payments: [
          { amount: 300, status: "COMPLETED" },
          { amount: 200, status: "COMPLETED" },
        ],
      });
      expect(calculateOutstandingAmount(invoice)).toBe(500);
    });

    it("should ignore pending payments", () => {
      const invoice = createMockInvoice({
        total: 1000,
        payments: [
          { amount: 300, status: "COMPLETED" },
          { amount: 500, status: "PENDING" },
        ],
      });
      expect(calculateOutstandingAmount(invoice)).toBe(700);
    });

    it("should return 0 when fully paid", () => {
      const invoice = createMockInvoice({
        total: 1000,
        payments: [{ amount: 1000, status: "COMPLETED" }],
      });
      expect(calculateOutstandingAmount(invoice)).toBe(0);
    });

    it("should return 0 when overpaid", () => {
      const invoice = createMockInvoice({
        total: 1000,
        payments: [{ amount: 1500, status: "COMPLETED" }],
      });
      expect(calculateOutstandingAmount(invoice)).toBe(0);
    });
  });

  describe("determineReminderLevel", () => {
    it("should return null for paid invoices", () => {
      const invoice = createMockInvoice({
        status: "PAID",
        dueDate: subDays(new Date(), 10),
      });
      expect(determineReminderLevel(invoice).level).toBeNull();
    });

    it("should return null for cancelled invoices", () => {
      const invoice = createMockInvoice({
        status: "CANCELLED",
        dueDate: subDays(new Date(), 10),
      });
      expect(determineReminderLevel(invoice).level).toBeNull();
    });

    it("should return null for draft invoices", () => {
      const invoice = createMockInvoice({
        status: "DRAFT",
        dueDate: subDays(new Date(), 10),
      });
      expect(determineReminderLevel(invoice).level).toBeNull();
    });

    it("should return null for fully paid invoices", () => {
      const invoice = createMockInvoice({
        dueDate: subDays(new Date(), 10),
        payments: [{ amount: 1000, status: "COMPLETED" }],
      });
      expect(determineReminderLevel(invoice).level).toBeNull();
    });

    it("should return null for invoices not yet in reminder window", () => {
      const invoice = createMockInvoice({
        dueDate: addDays(new Date(), 30),
      });
      expect(determineReminderLevel(invoice).level).toBeNull();
    });

    it("should return upcoming for invoices within 7 days of due", () => {
      const invoice = createMockInvoice({
        dueDate: addDays(new Date(), 5),
      });
      const result = determineReminderLevel(invoice);
      expect(result.level).toBe("upcoming");
      expect(result.daysUntilDue).toBeDefined();
    });

    it("should return due_today for invoices due today", () => {
      const invoice = createMockInvoice({
        dueDate: new Date(),
      });
      const result = determineReminderLevel(invoice);
      expect(result.level).toBe("due_today");
      expect(result.daysUntilDue).toBe(0);
    });

    it("should return overdue for invoices past due", () => {
      const invoice = createMockInvoice({
        dueDate: subDays(new Date(), 5),
      });
      const result = determineReminderLevel(invoice);
      expect(result.level).toBe("overdue");
      expect(result.daysOverdue).toBeDefined();
    });

    it("should return severely_overdue for invoices 30+ days past due", () => {
      const invoice = createMockInvoice({
        dueDate: subDays(new Date(), 35),
      });
      const result = determineReminderLevel(invoice);
      expect(result.level).toBe("severely_overdue");
      expect(result.daysOverdue).toBeGreaterThanOrEqual(30);
    });

    it("should return final_notice for invoices 60+ days past due", () => {
      const invoice = createMockInvoice({
        dueDate: subDays(new Date(), 65),
      });
      const result = determineReminderLevel(invoice);
      expect(result.level).toBe("final_notice");
      expect(result.daysOverdue).toBeGreaterThanOrEqual(60);
    });

    it("should respect custom thresholds", () => {
      const invoice = createMockInvoice({
        dueDate: subDays(new Date(), 15),
      });

      // With default thresholds (30 days), should be overdue
      expect(determineReminderLevel(invoice).level).toBe("overdue");

      // With custom threshold (10 days), should be severely_overdue
      expect(
        determineReminderLevel(invoice, { severelyOverdueDays: 10 }).level
      ).toBe("severely_overdue");
    });
  });

  describe("canSendReminder", () => {
    it("should allow reminder if no history", () => {
      const invoice = createMockInvoice({ reminderHistory: [] });
      expect(canSendReminder(invoice, "overdue")).toBe(true);
    });

    it("should allow reminder if no reminderHistory field", () => {
      const invoice = createMockInvoice();
      delete (invoice as { reminderHistory?: unknown }).reminderHistory;
      expect(canSendReminder(invoice, "overdue")).toBe(true);
    });

    it("should block reminder within cooldown period", () => {
      const invoice = createMockInvoice({
        reminderHistory: [
          {
            sentAt: subDays(new Date(), 1),
            level: "overdue",
            channel: "email",
          },
        ],
      });
      expect(canSendReminder(invoice, "overdue")).toBe(false);
    });

    it("should allow reminder after cooldown period", () => {
      const invoice = createMockInvoice({
        reminderHistory: [
          {
            sentAt: subDays(new Date(), 5),
            level: "overdue",
            channel: "email",
          },
        ],
      });
      expect(canSendReminder(invoice, "overdue")).toBe(true);
    });

    it("should allow immediate escalation to higher level", () => {
      const invoice = createMockInvoice({
        reminderHistory: [
          {
            sentAt: new Date(),
            level: "overdue",
            channel: "email",
          },
        ],
      });
      // Should allow severely_overdue even though we just sent overdue
      expect(canSendReminder(invoice, "severely_overdue")).toBe(true);
    });
  });

  describe("filterInvoicesByReminderLevel", () => {
    it("should categorize invoices by reminder level", () => {
      const invoices = [
        createMockInvoice({
          number: "INV-001",
          dueDate: addDays(new Date(), 5),
        }), // upcoming
        createMockInvoice({
          number: "INV-002",
          dueDate: new Date(),
        }), // due_today
        createMockInvoice({
          number: "INV-003",
          dueDate: subDays(new Date(), 5),
        }), // overdue
        createMockInvoice({
          number: "INV-004",
          dueDate: subDays(new Date(), 35),
        }), // severely_overdue
        createMockInvoice({
          number: "INV-005",
          dueDate: subDays(new Date(), 65),
        }), // final_notice
        createMockInvoice({
          number: "INV-006",
          dueDate: addDays(new Date(), 30),
        }), // not yet
        createMockInvoice({
          number: "INV-007",
          status: "PAID",
          dueDate: subDays(new Date(), 10),
        }), // paid
      ];

      const result = filterInvoicesByReminderLevel(invoices);

      expect(result.upcoming.length).toBe(1);
      expect(result.dueToday.length).toBe(1);
      expect(result.overdue.length).toBe(1);
      expect(result.severelyOverdue.length).toBe(1);
      expect(result.finalNotice.length).toBe(1);
    });

    it("should handle empty array", () => {
      const result = filterInvoicesByReminderLevel([]);

      expect(result.upcoming.length).toBe(0);
      expect(result.dueToday.length).toBe(0);
      expect(result.overdue.length).toBe(0);
      expect(result.severelyOverdue.length).toBe(0);
      expect(result.finalNotice.length).toBe(0);
    });
  });

  describe("getScheduledReminders", () => {
    it("should return correct reminder dates", () => {
      const dueDate = new Date("2024-03-15");
      const schedules = getScheduledReminders(dueDate);

      expect(schedules).toHaveLength(5);
      expect(schedules[0].level).toBe("upcoming");
      expect(schedules[1].level).toBe("due_today");
      expect(schedules[2].level).toBe("overdue");
      expect(schedules[3].level).toBe("severely_overdue");
      expect(schedules[4].level).toBe("final_notice");
    });
  });

  describe("scanForReminders", () => {
    it("should scan invoices and return results", async () => {
      const invoices = [
        createMockInvoice({
          number: "INV-001",
          dueDate: addDays(new Date(), 5),
        }), // upcoming
        createMockInvoice({
          number: "INV-002",
          dueDate: subDays(new Date(), 5),
        }), // overdue
      ];

      const result = await scanForReminders(invoices);

      expect(result.totalScanned).toBe(2);
      expect(result.upcoming).toBe(1);
      expect(result.overdue).toBe(1);
      expect(result.reminders).toHaveLength(2);
    });

    it("should not send emails when sendEmails is false", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      const invoices = [
        createMockInvoice({
          dueDate: subDays(new Date(), 5),
        }),
      ];

      await scanForReminders(invoices, { sendEmails: false });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should skip invoices without recipient email", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      const invoices = [
        createMockInvoice({
          dueDate: subDays(new Date(), 5),
          recipient: { name: "Test" }, // no email
        }),
      ];

      const result = await scanForReminders(invoices);

      expect(result.overdue).toBe(1);
      expect(result.remindersSent).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should track successful and failed sends", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      mockSendEmail
        .mockResolvedValueOnce({ success: true, messageId: "msg-1" })
        .mockResolvedValueOnce({ success: false, error: "SMTP error" });

      const invoices = [
        createMockInvoice({
          number: "INV-001",
          dueDate: subDays(new Date(), 5),
        }),
        createMockInvoice({
          number: "INV-002",
          dueDate: subDays(new Date(), 35),
        }),
      ];

      const result = await scanForReminders(invoices);

      expect(result.remindersSent).toBe(1);
    });

    it("should respect cooldown and skip recently reminded invoices", async () => {
      const { sendEmail } = await import("@/lib/email");
      const mockSendEmail = vi.mocked(sendEmail);

      const invoices = [
        createMockInvoice({
          dueDate: subDays(new Date(), 5),
          reminderHistory: [
            {
              sentAt: subDays(new Date(), 1), // Within cooldown
              level: "overdue",
              channel: "email",
            },
          ],
        }),
      ];

      const result = await scanForReminders(invoices);

      expect(result.overdue).toBe(1);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
