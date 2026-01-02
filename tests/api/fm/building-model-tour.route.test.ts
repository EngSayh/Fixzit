/**
 * @fileoverview Tests for public building tour endpoint
 * @description Tests tenant isolation and PII sanitization for public tours
 * @module tests/api/fm/building-model-tour.route.test
 * 
 * Review Session: FIXIZIT-REVIEW-20251231-100702-5325ec6fc
 * Finding #3: QA test coverage for public tour endpoint
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock S3 storage
vi.mock("@/lib/storage/s3", () => ({
  getObjectText: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock database
const findOneMock = vi.fn();
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({ findOne: findOneMock }),
  }),
}));

const importRoute = async () =>
  await import("@/app/api/fm/properties/[id]/tour/route");

describe("API /api/fm/properties/[id]/tour", () => {
  const originalPublicOrg = process.env.PUBLIC_ORG_ID;
  const validObjectId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLIC_ORG_ID = "public-org-id";
  });

  afterEach(() => {
    if (originalPublicOrg) {
      process.env.PUBLIC_ORG_ID = originalPublicOrg;
    } else {
      delete process.env.PUBLIC_ORG_ID;
    }
  });

  describe("Tenant Isolation (Finding #1 - SEC-01, BE-03)", () => {
    it("returns 404 when PUBLIC_ORG_ID is not configured", async () => {
      delete process.env.PUBLIC_ORG_ID;
      
      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      const res = await route.GET(req, { params: { id: validObjectId } });
      
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Tour not available for this property");
    });

    it("scopes building_models query with PUBLIC_ORG_ID", async () => {
      findOneMock
        .mockResolvedValueOnce({
          model: { floors: [] },
          version: 1,
          status: "PUBLISHED",
        })
        .mockResolvedValueOnce({
          name: "Property A",
          units: [],
        });

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      await route.GET(req, { params: { id: validObjectId } });

      // First call is to building_models collection
      const buildingModelsQuery = findOneMock.mock.calls[0][0];
      expect(buildingModelsQuery.orgId).toBe("public-org-id");
      expect(buildingModelsQuery.status).toBe("PUBLISHED");
    });

    it("scopes properties query with PUBLIC_ORG_ID", async () => {
      findOneMock
        .mockResolvedValueOnce({
          model: { floors: [] },
          version: 1,
          status: "PUBLISHED",
        })
        .mockResolvedValueOnce({
          name: "Property A",
          units: [],
        });

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      await route.GET(req, { params: { id: validObjectId } });

      // Second call is to properties collection
      const propertiesQuery = findOneMock.mock.calls[1][0];
      expect(propertiesQuery.orgId).toBe("public-org-id");
    });

    it("returns 404 for property not in PUBLIC_ORG_ID", async () => {
      // Return null for both queries (not found in public org)
      findOneMock.mockResolvedValue(null);

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      const res = await route.GET(req, { params: { id: validObjectId } });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Tour not available for this property");
    });
  });

  describe("PII Sanitization (Finding #2 - PRV-01, SEC-05)", () => {
    it("removes tenant object from units", async () => {
      findOneMock
        .mockResolvedValueOnce({
          model: { floors: [] },
          version: 1,
          status: "PUBLISHED",
        })
        .mockResolvedValueOnce({
          name: "Property A",
          type: "Residential",
          units: [
            {
              unitNumber: "101",
              electricityMeter: "E123456",
              waterMeter: "W789012",
              tenantId: "tenant-id-1",
              tenant: { 
                name: "John Doe", 
                phone: "+966500000000",
                email: "john@example.com",
              },
              floor: 1,
              bedrooms: 2,
            },
          ],
        });

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      const res = await route.GET(req, { params: { id: validObjectId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      const unit = body.data.units[0];

      // Sensitive fields should be removed
      expect(unit.tenant).toBeUndefined();
      expect(unit.tenantId).toBeUndefined();
      expect(unit.electricityMeter).toBeUndefined();
      expect(unit.waterMeter).toBeUndefined();

      // Safe fields should remain
      expect(unit.unitNumber).toBe("101");
      expect(unit.floor).toBe(1);
      expect(unit.bedrooms).toBe(2);
    });

    it("removes meter numbers and unitDbId from model metadata", async () => {
      findOneMock
        .mockResolvedValueOnce({
          model: {
            floors: [
              {
                floorNumber: 1,
                units: [
                  {
                    key: "U1",
                    unitNumber: "101",
                    metadata: {
                      unitDbId: "db-id-123",
                      electricityMeter: "E123456",
                      waterMeter: "W789012",
                      color: "#FF0000",
                      label: "Unit 101",
                    },
                  },
                  {
                    key: "U2",
                    unitNumber: "102",
                    metadata: {
                      unitDbId: "db-id-456",
                      electricityMeter: "E654321",
                      waterMeter: "W210987",
                    },
                  },
                ],
              },
            ],
          },
          version: 1,
          status: "PUBLISHED",
        })
        .mockResolvedValueOnce({
          name: "Property A",
          units: [],
        });

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      const res = await route.GET(req, { params: { id: validObjectId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      const floor = body.data.model.floors[0];
      const unit1 = floor.units[0];
      const unit2 = floor.units[1];

      // Sensitive metadata should be removed from unit 1
      expect(unit1.metadata.unitDbId).toBeUndefined();
      expect(unit1.metadata.electricityMeter).toBeUndefined();
      expect(unit1.metadata.waterMeter).toBeUndefined();

      // Safe metadata should remain
      expect(unit1.metadata.color).toBe("#FF0000");
      expect(unit1.metadata.label).toBe("Unit 101");

      // Sensitive metadata should be removed from unit 2
      expect(unit2.metadata.unitDbId).toBeUndefined();
      expect(unit2.metadata.electricityMeter).toBeUndefined();
      expect(unit2.metadata.waterMeter).toBeUndefined();
    });

    it("handles model without floors gracefully", async () => {
      findOneMock
        .mockResolvedValueOnce({
          model: { /* no floors property */ },
          version: 1,
          status: "PUBLISHED",
        })
        .mockResolvedValueOnce({
          name: "Property A",
          units: [],
        });

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      const res = await route.GET(req, { params: { id: validObjectId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.model).toBeDefined();
    });

    it("handles units without metadata gracefully", async () => {
      findOneMock
        .mockResolvedValueOnce({
          model: {
            floors: [
              {
                floorNumber: 1,
                units: [
                  { key: "U1", unitNumber: "101" }, // No metadata
                ],
              },
            ],
          },
          version: 1,
          status: "PUBLISHED",
        })
        .mockResolvedValueOnce({
          name: "Property A",
          units: [],
        });

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      const res = await route.GET(req, { params: { id: validObjectId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      const unit = body.data.model.floors[0].units[0];
      expect(unit.key).toBe("U1");
    });
  });

  describe("Input Validation", () => {
    it("returns 400 for invalid ObjectId format", async () => {
      const route = await importRoute();
      const req = new NextRequest(
        "http://localhost:3000/api/fm/properties/invalid-id/tour"
      );
      const res = await route.GET(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid property ID format");
    });
  });

  describe("Published Status Check", () => {
    it("only returns PUBLISHED models", async () => {
      findOneMock
        .mockResolvedValueOnce({
          model: { floors: [] },
          version: 1,
          status: "PUBLISHED",
        })
        .mockResolvedValueOnce({
          name: "Property A",
          units: [],
        });

      const route = await importRoute();
      const req = new NextRequest(
        `http://localhost:3000/api/fm/properties/${validObjectId}/tour`
      );
      await route.GET(req, { params: { id: validObjectId } });

      const query = findOneMock.mock.calls[0][0];
      expect(query.status).toBe("PUBLISHED");
    });
  });
});
