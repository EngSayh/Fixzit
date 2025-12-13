/**
 * Unit tests for package-activation.ts (P1 - HIGH PRIORITY)
 * Tests: activatePackageAfterPayment function for Aqar package activation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock mongoose before imports
vi.mock("mongoose", () => {
  const mockObjectId = Object.assign(
    vi.fn((id?: string) => ({
      toString: () => id || "mock-id-123",
    })),
    { isValid: vi.fn(() => true) }
  );
  
  return {
    default: {
      Types: { ObjectId: mockObjectId },
    },
    Types: { ObjectId: mockObjectId },
  };
});

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock utils
vi.mock("@/lib/utils/org-scope", () => ({
  buildOrgScopedFilter: vi.fn((id, orgId) => ({ _id: id, orgId })),
  isValidOrgId: vi.fn((orgId) => !!orgId && typeof orgId === "string"),
}));

// Mock tenant context
vi.mock("@/server/plugins/tenantIsolation", () => ({
  withTenantContext: vi.fn(async (_orgId, callback) => callback()),
}));

// Mock Aqar models
const mockPayment = {
  _id: "payment-123",
  type: "PACKAGE",
  relatedModel: "AqarPackage",
  relatedId: "package-456",
  status: "COMPLETED",
  orgId: "org-789",
};

const mockPackage = {
  _id: { toString: () => "package-456" },
  userId: { toString: () => "user-001" },
  type: "PREMIUM",
  paidAt: null,
  active: false,
  save: vi.fn().mockResolvedValue(true),
  activate: vi.fn().mockResolvedValue(true),
};

vi.mock("@/server/models/aqar", () => ({
  AqarPayment: {
    findOne: vi.fn(),
  },
  AqarPackage: {
    findOne: vi.fn(),
  },
  PaymentStatus: {
    COMPLETED: "COMPLETED",
    PENDING: "PENDING",
    FAILED: "FAILED",
  },
}));

// Import after mocks
import { activatePackageAfterPayment } from "@/lib/aqar/package-activation";
import { AqarPayment, AqarPackage } from "@/server/models/aqar";
import { logger } from "@/lib/logger";
import { buildOrgScopedFilter } from "@/lib/utils/org-scope";
import { withTenantContext } from "@/server/plugins/tenantIsolation";

describe("activatePackageAfterPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Input Validation", () => {
    it("should return false if orgId is empty", async () => {
      const result = await activatePackageAfterPayment("payment-123", "");
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "activatePackageAfterPayment: orgId is required for tenant isolation",
        expect.any(Object)
      );
    });

    it("should return false if orgId is null", async () => {
      const result = await activatePackageAfterPayment("payment-123", null as unknown as string);
      
      expect(result).toBe(false);
    });
  });

  describe("Payment Lookup", () => {
    it("should return false if payment is not found", async () => {
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce(null);
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "activatePackageAfterPayment: Payment not found (or wrong org)",
        expect.any(Object)
      );
    });

    it("should return false if payment type is not PACKAGE", async () => {
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce({
        ...mockPayment,
        type: "BOOKING",
      });
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "activatePackageAfterPayment: Not a package payment",
        expect.any(Object)
      );
    });

    it("should return false if relatedModel is not AqarPackage", async () => {
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce({
        ...mockPayment,
        relatedModel: "AqarBooking",
      });
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(false);
    });

    it("should return false if payment status is not COMPLETED", async () => {
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce({
        ...mockPayment,
        status: "PENDING",
      });
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "activatePackageAfterPayment: Payment not marked as COMPLETED",
        expect.any(Object)
      );
    });

    it("should return false if payment has no relatedId", async () => {
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce({
        ...mockPayment,
        relatedId: null,
      });
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "activatePackageAfterPayment: Payment missing relatedId",
        expect.any(Object)
      );
    });
  });

  describe("Package Activation", () => {
    it("should return false if package is not found", async () => {
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce(mockPayment);
      vi.mocked(AqarPackage.findOne).mockResolvedValueOnce(null);
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "activatePackageAfterPayment: Package not found (or wrong org)",
        expect.any(Object)
      );
    });

    it("should set paidAt if not already set", async () => {
      const testPackage = { ...mockPackage, paidAt: null };
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce(mockPayment);
      vi.mocked(AqarPackage.findOne).mockResolvedValueOnce(testPackage);
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(true);
      expect(testPackage.paidAt).toBeInstanceOf(Date);
      expect(testPackage.save).toHaveBeenCalled();
    });

    it("should not overwrite paidAt if already set", async () => {
      const existingDate = new Date("2024-01-01");
      const testPackage = { ...mockPackage, paidAt: existingDate };
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce(mockPayment);
      vi.mocked(AqarPackage.findOne).mockResolvedValueOnce(testPackage);
      
      await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(testPackage.paidAt).toBe(existingDate);
    });

    it("should activate package if not already active", async () => {
      const testPackage = { ...mockPackage, active: false };
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce(mockPayment);
      vi.mocked(AqarPackage.findOne).mockResolvedValueOnce(testPackage);
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(true);
      expect(testPackage.activate).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "activatePackageAfterPayment: Package activated successfully",
        expect.any(Object)
      );
    });

    it("should not re-activate package if already active", async () => {
      const testPackage = { ...mockPackage, active: true };
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce(mockPayment);
      vi.mocked(AqarPackage.findOne).mockResolvedValueOnce(testPackage);
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(testPackage.activate).not.toHaveBeenCalled();
      expect(testPackage.save).toHaveBeenCalled();
      expect(testPackage.paidAt).toBeInstanceOf(Date);
      expect(result).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should return false and log error on exception", async () => {
      vi.mocked(AqarPayment.findOne).mockRejectedValueOnce(new Error("DB connection failed"));
      
      const result = await activatePackageAfterPayment("payment-123", "org-789");
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "activatePackageAfterPayment: Error activating package",
        expect.objectContaining({ paymentId: "payment-123" })
      );
    });
  });

  describe("Tenant isolation", () => {
    it("wraps lookups in tenant context with scoped filters", async () => {
      vi.mocked(AqarPayment.findOne).mockResolvedValueOnce(mockPayment);
      vi.mocked(AqarPackage.findOne).mockResolvedValueOnce({ ...mockPackage });

      const result = await activatePackageAfterPayment(mockPayment._id, mockPayment.orgId);

      expect(result).toBe(true);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockPayment.orgId,
        expect.any(Function),
      );
      expect(buildOrgScopedFilter).toHaveBeenNthCalledWith(
        1,
        mockPayment._id,
        mockPayment.orgId,
      );
      expect(buildOrgScopedFilter).toHaveBeenNthCalledWith(
        2,
        mockPayment.relatedId,
        mockPayment.orgId,
      );
    });
  });
});
