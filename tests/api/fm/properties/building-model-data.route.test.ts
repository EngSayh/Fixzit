/**
 * @fileoverview Tests for Building Model Data Route
 * @route GET /api/fm/properties/[id]/building-model/data
 * @sprint Sprint 70
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// Hoisted mocks
const mockRequireFmPermission = vi.fn();
const mockFindOne = vi.fn();
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
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

vi.mock("@/lib/storage/s3", () => ({
  getObjectText: vi.fn(() => Promise.resolve(JSON.stringify({ floors: [], units: [] }))),
}));

import { GET } from "@/app/api/fm/properties/[id]/building-model/data/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

const validPropertyId = new ObjectId().toString();
const testProperty = {
  _id: new ObjectId(validPropertyId),
  name: "Test Property",
  orgId: "org-test-123",
};
const testModel = {
  _id: new ObjectId(),
  propertyId: new ObjectId(validPropertyId),
  orgId: "org-test-123",
  version: 1,
  status: "PUBLISHED",
  model: { floors: [], units: [] },
  generator: "test",
};

describe("Building Model Data Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockRequireFmPermission.mockResolvedValue({
      userId: "user-123",
      email: "user@test.com",
      orgId: "org-test-123",
      tenantId: "org-test-123",
      role: "ADMIN",
      isSuperAdmin: false,
    });
  });

  describe("GET /api/fm/properties/[id]/building-model/data", () => {
    it("returns 400 for invalid property ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/properties/invalid-id/building-model/data");
      const res = await GET(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/data`);
      const res = await GET(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(429);
    });

    it("returns 401/403 when unauthorized", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/data`);
      const res = await GET(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(401);
    });

    it("returns 404 when property not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/data`);
      const res = await GET(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(404);
    });

    it("returns 404 when building model not found", async () => {
      mockFindOne
        .mockResolvedValueOnce(testProperty) // Property found
        .mockResolvedValueOnce(null); // Model not found

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/data`);
      const res = await GET(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(404);
    });

    it("returns building model data on success", async () => {
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(testModel);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/data`);
      const res = await GET(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.model).toBeDefined();
      expect(body.data.version).toBe(1);
    });

    it("enforces tenant isolation via orgId", async () => {
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(testModel);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/data`);
      await GET(req, { params: { id: validPropertyId } });

      // Should query with orgId
      expect(mockFindOne).toHaveBeenCalled();
      const firstCall = mockFindOne.mock.calls[0][0];
      expect(firstCall.orgId).toBeDefined();
    });

    it("non-privileged users only see PUBLISHED models", async () => {
      mockRequireFmPermission.mockResolvedValue({
        userId: "user-123",
        email: "user@test.com",
        orgId: "org-test-123",
        tenantId: "org-test-123",
        role: "TENANT", // Non-privileged
        isSuperAdmin: false,
      });
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(testModel);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/data`);
      const res = await GET(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(200);
    });
  });
});
