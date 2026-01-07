/**
 * @fileoverview Tests for Invoice Auto-Approval Service
 * @module tests/services/finance/invoice-auto-approval.test
 *
 * AUTO-002: Test coverage for invoice auto-approval functionality
 *
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { getDatabase } from "@/lib/mongodb-unified";
import {
  getAutoApprovalConfig,
  updateAutoApprovalConfig,
  evaluateForAutoApproval,
  processAutoApproval,
  batchProcessAutoApprovals,
} from "@/services/finance/invoice-auto-approval";

describe("Invoice Auto-Approval Service", () => {
  const mockDb = {
    collection: vi.fn(),
  };

  const mockCollection = {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    insertOne: vi.fn(),
    countDocuments: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDatabase as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);
    mockDb.collection.mockReturnValue(mockCollection);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAutoApprovalConfig", () => {
    it("should return default config when no org config exists", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const config = await getAutoApprovalConfig("org-001");

      expect(config.enabled).toBe(true);
      expect(config.thresholdAmount).toBe(1000);
      expect(config.currency).toBe("SAR");
      expect(config.requireMatchingPO).toBe(true);
    });

    it("should return org-specific config when exists", async () => {
      mockCollection.findOne.mockResolvedValue({
        orgId: "org-001",
        config: {
          enabled: true,
          thresholdAmount: 5000,
          currency: "USD",
          requireMatchingPO: false,
        },
      });

      const config = await getAutoApprovalConfig("org-001");

      expect(config.thresholdAmount).toBe(5000);
      expect(config.currency).toBe("USD");
      expect(config.requireMatchingPO).toBe(false);
    });

    it("should merge with defaults for partial config", async () => {
      mockCollection.findOne.mockResolvedValue({
        orgId: "org-001",
        config: {
          thresholdAmount: 2000,
        },
      });

      const config = await getAutoApprovalConfig("org-001");

      expect(config.thresholdAmount).toBe(2000);
      expect(config.enabled).toBe(true); // From default
      expect(config.maxDailyAutoApprovals).toBe(50); // From default
    });
  });

  describe("updateAutoApprovalConfig", () => {
    it("should update config and return merged result", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await updateAutoApprovalConfig(
        "org-001",
        { thresholdAmount: 3000 },
        "user-001"
      );

      expect(result.thresholdAmount).toBe(3000);
      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });

  describe("evaluateForAutoApproval", () => {
    const baseInvoice = {
      _id: { toString: () => "inv-001" },
      orgId: "org-001",
      invoiceNumber: "INV-2024-001",
      amount: 500,
      currency: "SAR",
      poNumber: "PO-001",
      category: "MAINTENANCE",
      status: "PENDING",
      createdAt: new Date(),
    };

    it("should approve invoice under threshold with matching PO", async () => {
      // Mock config
      mockCollection.findOne
        .mockResolvedValueOnce(null) // No org config, use default
        .mockResolvedValueOnce({ poNumber: "PO-001", amount: 1000, status: "APPROVED" }); // PO exists
      
      mockCollection.countDocuments.mockResolvedValue(0); // No daily approvals yet

      // Simulate business hours (mock Date)
      const mockDate = new Date("2024-01-15T10:00:00");
      vi.setSystemTime(mockDate);

      const result = await evaluateForAutoApproval(baseInvoice as any);

      expect(result.approved).toBe(true);
      expect(result.reason).toBe("All auto-approval criteria met");
      expect(result.approvalDetails?.thresholdCheck).toBe(true);
      expect(result.approvalDetails?.poMatchCheck).toBe(true);
    });

    it("should reject invoice over threshold", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const mockDate = new Date("2024-01-15T10:00:00");
      vi.setSystemTime(mockDate);

      const overThresholdInvoice = { ...baseInvoice, amount: 5000 };
      const result = await evaluateForAutoApproval(overThresholdInvoice as any);

      expect(result.approved).toBe(false);
      expect(result.reason).toContain("exceeds threshold");
    });

    it("should reject when auto-approval is disabled", async () => {
      mockCollection.findOne.mockResolvedValue({
        config: { enabled: false },
      });

      const result = await evaluateForAutoApproval(baseInvoice as any);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe("Auto-approval is disabled for this organization");
    });

    it("should reject excluded vendor", async () => {
      mockCollection.findOne
        .mockResolvedValueOnce({
          config: {
            enabled: true,
            excludedVendors: ["vendor-blacklisted"],
          },
        })
        .mockResolvedValueOnce({ poNumber: "PO-001", amount: 1000, status: "APPROVED" });
      mockCollection.countDocuments.mockResolvedValue(0);

      const mockDate = new Date("2024-01-15T10:00:00");
      vi.setSystemTime(mockDate);

      const excludedVendorInvoice = {
        ...baseInvoice,
        vendorId: "vendor-blacklisted",
      };

      const result = await evaluateForAutoApproval(excludedVendorInvoice as any);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe("Vendor is excluded from auto-approval");
    });

    it("should reject when daily limit reached", async () => {
      mockCollection.findOne
        .mockResolvedValueOnce({ config: { maxDailyAutoApprovals: 5 } })
        .mockResolvedValueOnce({ poNumber: "PO-001", amount: 1000, status: "APPROVED" });
      mockCollection.countDocuments.mockResolvedValue(5); // Limit reached

      const mockDate = new Date("2024-01-15T10:00:00");
      vi.setSystemTime(mockDate);

      const result = await evaluateForAutoApproval(baseInvoice as any);

      expect(result.approved).toBe(false);
      expect(result.reason).toContain("Daily auto-approval limit");
    });

    it("should reject outside business hours", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      // Set time to 2 AM (outside business hours)
      const mockDate = new Date("2024-01-15T02:00:00");
      vi.setSystemTime(mockDate);

      const result = await evaluateForAutoApproval(baseInvoice as any);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe("Outside business hours for auto-approval");
    });

    it("should reject on weekends when weekends disabled", async () => {
      mockCollection.findOne.mockResolvedValue({
        config: { weekendsEnabled: false },
      });

      // Saturday at 10 AM
      const mockDate = new Date("2024-01-13T10:00:00"); // Saturday
      vi.setSystemTime(mockDate);

      const result = await evaluateForAutoApproval(baseInvoice as any);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe("Outside business hours for auto-approval");
    });
  });

  describe("processAutoApproval", () => {
    it("should return not found for missing invoice", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await processAutoApproval("inv-999", "org-001");

      expect(result.approved).toBe(false);
      expect(result.reason).toBe("Invoice not found");
    });

    it("should reject non-pending invoice", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: { toString: () => "inv-001" },
        status: "APPROVED",
      });

      const result = await processAutoApproval("inv-001", "org-001");

      expect(result.approved).toBe(false);
      expect(result.reason).toContain("not PENDING");
    });
  });

  describe("batchProcessAutoApprovals", () => {
    it("should return empty when disabled", async () => {
      mockCollection.findOne.mockResolvedValue({
        config: { enabled: false },
      });

      const result = await batchProcessAutoApprovals("org-001");

      expect(result.processed).toBe(0);
      expect(result.approved).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("should process multiple invoices", async () => {
      mockCollection.findOne.mockResolvedValue(null); // Use defaults
      mockCollection.find.mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            _id: { toString: () => "inv-001" },
            orgId: "org-001",
            amount: 500,
            currency: "SAR",
            status: "PENDING",
          },
          {
            _id: { toString: () => "inv-002" },
            orgId: "org-001",
            amount: 800,
            currency: "SAR",
            status: "PENDING",
          },
        ]),
      });

      const result = await batchProcessAutoApprovals("org-001");

      expect(result.processed).toBe(2);
    });
  });
});
