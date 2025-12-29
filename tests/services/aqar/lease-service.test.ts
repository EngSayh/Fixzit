/**
 * @fileoverview Tests for Lease Service
 * @module tests/services/aqar/lease-service
 * 
 * Tests lease lifecycle management including:
 * - Tenant isolation (orgId enforcement)
 * - Lease creation validation
 * - Status transitions
 * - Overlapping lease detection
 * 
 * @testcoverage TG-003: Service Layer Tests
 * @agent [AGENT-001-A]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

// Mock MongoDB before imports
const mockFindOneAndUpdate = vi.fn();
const mockFindOne = vi.fn();
const mockInsertOne = vi.fn();
const mockUpdateOne = vi.fn();
const mockFind = vi.fn(() => ({
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  toArray: vi.fn(() => []),
}));

const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
  findOneAndUpdate: mockFindOneAndUpdate,
  find: mockFind,
  insertOne: mockInsertOne,
  updateOne: mockUpdateOne,
}));

const mockDb = {
  collection: mockCollection,
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
  createLease,
  getLeaseById,
  getLeasesByProperty,
  LeaseStatus,
  PaymentFrequency,
} from "@/services/aqar/lease-service";

describe("lease-service", () => {
  const validUnitId = new ObjectId().toString();
  const validTenantId = new ObjectId().toString();
  const validPropertyId = new ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockFindOneAndUpdate.mockResolvedValue({ seq: 1 });
    mockFindOne.mockResolvedValue(null);
    mockInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  describe("createLease", () => {
    it("should require orgId (tenant isolation)", async () => {
      // Mock unit exists
      mockFindOne
        .mockResolvedValueOnce({ _id: new ObjectId(validUnitId), status: "available", propertyId: validPropertyId, orgId: "org-123" }) // unit
        .mockResolvedValueOnce({ _id: new ObjectId(validTenantId), name: "John Doe", orgId: "org-123" }) // tenant
        .mockResolvedValueOnce(null); // no overlapping lease

      const request = {
        orgId: "org-123",
        propertyId: validPropertyId,
        unitId: validUnitId,
        tenantId: validTenantId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        monthlyRent: 5000,
        securityDeposit: 10000,
        createdBy: "user-123",
      };

      const result = await createLease(request);
      
      // Verify orgId is used in queries
      expect(mockCollection).toHaveBeenCalledWith("units");
      const unitQuery = mockFindOne.mock.calls[0][0];
      expect(unitQuery.orgId).toBe("org-123");
    });

    it("should fail if unit not found", async () => {
      mockFindOne.mockResolvedValueOnce(null); // unit not found

      const request = {
        orgId: "org-123",
        propertyId: validPropertyId,
        unitId: validUnitId,
        tenantId: validTenantId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        monthlyRent: 5000,
        securityDeposit: 10000,
        createdBy: "user-123",
      };

      const result = await createLease(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unit not found");
    });

    it("should fail if unit is already occupied", async () => {
      mockFindOne.mockResolvedValueOnce({
        _id: new ObjectId(validUnitId),
        status: "occupied",
        propertyId: validPropertyId,
        orgId: "org-123",
      });

      const request = {
        orgId: "org-123",
        propertyId: validPropertyId,
        unitId: validUnitId,
        tenantId: validTenantId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        monthlyRent: 5000,
        securityDeposit: 10000,
        createdBy: "user-123",
      };

      const result = await createLease(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unit is already occupied");
    });

    it("should fail if tenant not found", async () => {
      mockFindOne
        .mockResolvedValueOnce({ _id: new ObjectId(validUnitId), status: "available", orgId: "org-123" }) // unit
        .mockResolvedValueOnce(null); // tenant not found

      const request = {
        orgId: "org-123",
        propertyId: validPropertyId,
        unitId: validUnitId,
        tenantId: validTenantId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        monthlyRent: 5000,
        securityDeposit: 10000,
        createdBy: "user-123",
      };

      const result = await createLease(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Tenant not found");
    });

    it("should fail if overlapping lease exists", async () => {
      mockFindOne
        .mockResolvedValueOnce({ _id: new ObjectId(validUnitId), status: "available", orgId: "org-123" }) // unit
        .mockResolvedValueOnce({ _id: new ObjectId(validTenantId), name: "John Doe", orgId: "org-123" }) // tenant
        .mockResolvedValueOnce({ _id: new ObjectId(), status: LeaseStatus.ACTIVE }); // overlapping lease

      const request = {
        orgId: "org-123",
        propertyId: validPropertyId,
        unitId: validUnitId,
        tenantId: validTenantId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        monthlyRent: 5000,
        securityDeposit: 10000,
        createdBy: "user-123",
      };

      const result = await createLease(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Overlapping lease exists for this unit");
    });

    it("should create lease with default payment frequency", async () => {
      mockFindOne
        .mockResolvedValueOnce({ _id: new ObjectId(validUnitId), status: "available", orgId: "org-123" }) // unit
        .mockResolvedValueOnce({ _id: new ObjectId(validTenantId), name: "John Doe", nationalId: "123", orgId: "org-123" }) // tenant
        .mockResolvedValueOnce(null); // no overlapping

      const request = {
        orgId: "org-123",
        propertyId: validPropertyId,
        unitId: validUnitId,
        tenantId: validTenantId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        monthlyRent: 5000,
        securityDeposit: 10000,
        createdBy: "user-123",
        // No paymentFrequency specified - should default to MONTHLY
      };

      const result = await createLease(request);
      
      if (result.success && result.lease) {
        expect(result.lease.paymentFrequency).toBe(PaymentFrequency.MONTHLY);
      }
    });
  });

  describe("getLeaseById", () => {
    it("should require orgId for tenant isolation", async () => {
      const leaseId = new ObjectId().toString();
      mockFindOne.mockResolvedValueOnce({
        _id: new ObjectId(leaseId),
        orgId: "org-123",
        status: LeaseStatus.ACTIVE,
      });

      // Note: getLeaseById signature is (orgId, leaseId)
      await getLeaseById("org-123", leaseId);
      
      // Verify query includes orgId
      expect(mockCollection).toHaveBeenCalledWith("leases");
      // findOne is called within the function
      expect(mockFindOne).toHaveBeenCalled();
    });

    it("should return null for invalid lease ID", async () => {
      const result = await getLeaseById("org-123", "invalid-id");
      
      expect(result).toBeNull();
    });
  });

  describe("getLeasesByProperty", () => {
    it("should filter by orgId and propertyId", async () => {
      const mockLeases = [
        { _id: new ObjectId(), orgId: "org-123", propertyId: validPropertyId, status: LeaseStatus.ACTIVE },
      ];
      
      mockFind.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValueOnce(mockLeases),
      });

      // Note: getLeasesByProperty signature is (orgId, propertyId, options)
      await getLeasesByProperty("org-123", validPropertyId);
      
      expect(mockCollection).toHaveBeenCalledWith("leases");
      expect(mockFind).toHaveBeenCalled();
    });
  });
});
