/**
 * @fileoverview Tests for Building Model Publish Route
 * @route POST /api/fm/properties/[id]/building-model/publish
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
const mockUpdateMany = vi.fn();
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
  updateMany: mockUpdateMany,
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

import { POST } from "@/app/api/fm/properties/[id]/building-model/publish/route";
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
  status: "DRAFT",
};

describe("Building Model Publish Route", () => {
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
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  });

  describe("POST /api/fm/properties/[id]/building-model/publish", () => {
    it("returns 400 for invalid property ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/properties/invalid-id/building-model/publish", {
        method: "POST",
      });
      const res = await POST(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      const res = await POST(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(429);
    });

    it("returns 401/403 when unauthorized", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      const res = await POST(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(401);
    });

    it("returns 403 for non-privileged roles", async () => {
      mockRequireFmPermission.mockResolvedValue({
        userId: "user-123",
        email: "user@test.com",
        orgId: "org-test-123",
        tenantId: "org-test-123",
        role: "TENANT", // Not allowed
        isSuperAdmin: false,
      });

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      const res = await POST(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(403);
    });

    it("returns 404 when property not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      const res = await POST(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(404);
    });

    it("returns 404 when no building model exists", async () => {
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(null);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      const res = await POST(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(404);
    });

    it("returns success when model already published", async () => {
      const publishedModel = { ...testModel, status: "PUBLISHED" };
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(publishedModel);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      const res = await POST(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toContain("already published");
    });

    it("publishes draft model successfully", async () => {
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(testModel);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      const res = await POST(req, { params: { id: validPropertyId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("PUBLISHED");
    });

    it("archives previously published models", async () => {
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(testModel);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      await POST(req, { params: { id: validPropertyId } });

      // Should call updateMany to archive old models
      expect(mockUpdateMany).toHaveBeenCalled();
    });

    it("enforces tenant isolation", async () => {
      mockFindOne
        .mockResolvedValueOnce(testProperty)
        .mockResolvedValueOnce(testModel);

      const req = new NextRequest(`http://localhost/api/fm/properties/${validPropertyId}/building-model/publish`, {
        method: "POST",
      });
      await POST(req, { params: { id: validPropertyId } });

      expect(mockFindOne).toHaveBeenCalled();
      const firstCall = mockFindOne.mock.calls[0][0];
      expect(firstCall.orgId).toBeDefined();
    });
  });
});
