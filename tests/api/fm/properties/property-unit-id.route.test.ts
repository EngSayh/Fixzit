/**
 * @fileoverview Tests for Property Unit ID Route
 * @route GET/PATCH /api/fm/properties/[id]/units/[unitId]
 * @sprint Sprint 70
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// Hoisted mocks
const mockRequireFmPermission = vi.fn();
const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
}));

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn(() => mockRequireFmPermission()),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((_req, orgId) => ({
    tenantId: orgId || "org-test-123",
  })),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(() => Promise.resolve({
    collection: mockCollection,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(() => ({
    data: { bedrooms: 3, bathrooms: 2 },
    error: null,
  })),
}));

import { GET, PATCH } from "@/app/api/fm/properties/[id]/units/[unitId]/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockParseBodySafe = vi.mocked(parseBodySafe);

const validPropertyId = new ObjectId().toString();
const validUnitId = new ObjectId().toString();
const testUnit = {
  _id: new ObjectId(validUnitId),
  unitNumber: "101",
  type: "apartment",
  bedrooms: 2,
  bathrooms: 1,
  area: 120,
};
const testProperty = {
  _id: new ObjectId(validPropertyId),
  name: "Test Property",
  orgId: "org-test-123",
  units: [testUnit],
};

describe("Property Unit [unitId] Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockRequireFmPermission.mockResolvedValue({
      userId: "user-123",
      id: "user-123",
      email: "user@test.com",
      orgId: "org-test-123",
      tenantId: "org-test-123",
      role: "PROPERTY_OWNER",
      isSuperAdmin: false,
    });
  });

  describe("GET /api/fm/properties/[id]/units/[unitId]", () => {
    it("returns 400 for invalid property ID", async () => {
      const req = new NextRequest(`http://localhost/api/fm/properties/invalid-id/units/${validUnitId}`);
      const res = await GET(req, { params: { id: "invalid-id", unitId: validUnitId } });

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`);
      const res = await GET(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(429);
    });

    it("returns 401/403 when unauthorized", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`);
      const res = await GET(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(401);
    });

    it("returns 404 when property not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`);
      const res = await GET(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(404);
    });

    it("returns 404 when unit not found", async () => {
      mockFindOne.mockResolvedValue({ ...testProperty, units: [] });

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`);
      const res = await GET(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(404);
    });

    it("returns unit data on success", async () => {
      mockFindOne.mockResolvedValue(testProperty);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`);
      const res = await GET(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.unitNumber).toBe("101");
    });

    it("enforces tenant isolation", async () => {
      mockFindOne.mockResolvedValue(testProperty);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`);
      await GET(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(mockFindOne).toHaveBeenCalled();
      const filter = mockFindOne.mock.calls[0][0];
      expect(filter.orgId).toBeDefined();
    });
  });

  describe("PATCH /api/fm/properties/[id]/units/[unitId]", () => {
    beforeEach(() => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
      mockParseBodySafe.mockReturnValue({
        data: { bedrooms: 3, bathrooms: 2 },
        error: null,
      });
    });

    it("returns 400 for invalid property ID", async () => {
      const req = new NextRequest(`http://localhost/api/fm/properties/invalid-id/units/${validUnitId}`, {
        method: "PATCH",
        body: JSON.stringify({ bedrooms: 3 }),
      });
      const res = await PATCH(req, { params: { id: "invalid-id", unitId: validUnitId } });

      expect(res.status).toBe(400);
    });

    it("returns 401/403 when unauthorized", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`, {
        method: "PATCH",
        body: JSON.stringify({ bedrooms: 3 }),
      });
      const res = await PATCH(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(401);
    });

    it("returns 403 for non-privileged roles", async () => {
      mockRequireFmPermission.mockResolvedValue({
        userId: "user-123",
        email: "user@test.com",
        orgId: "org-test-123",
        tenantId: "org-test-123",
        role: "TENANT", // Not allowed to update
        isSuperAdmin: false,
      });

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`, {
        method: "PATCH",
        body: JSON.stringify({ bedrooms: 3 }),
      });
      const res = await PATCH(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid body", async () => {
      mockParseBodySafe.mockReturnValue({
        data: null,
        error: new Error("Invalid JSON"),
      });

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`, {
        method: "PATCH",
        body: "invalid json",
      });
      const res = await PATCH(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(400);
    });

    it("returns 404 when property not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`, {
        method: "PATCH",
        body: JSON.stringify({ bedrooms: 3 }),
      });
      const res = await PATCH(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(404);
    });

    it("returns 404 when unit not found", async () => {
      mockFindOne.mockResolvedValue({ ...testProperty, units: [] });

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`, {
        method: "PATCH",
        body: JSON.stringify({ bedrooms: 3 }),
      });
      const res = await PATCH(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(404);
    });

    it("updates unit on success", async () => {
      const updatedProperty = {
        ...testProperty,
        units: [{ ...testUnit, bedrooms: 3, bathrooms: 2 }],
      };
      mockFindOne
        .mockResolvedValueOnce(testProperty) // First find
        .mockResolvedValueOnce(updatedProperty); // After update

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/units/${validUnitId}`, {
        method: "PATCH",
        body: JSON.stringify({ bedrooms: 3, bathrooms: 2 }),
      });
      const res = await PATCH(req, { params: { id: validPropertyId, unitId: validUnitId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
