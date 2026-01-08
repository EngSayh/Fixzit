/**
 * @fileoverview Tests for FM Work Order ID Route
 * @route GET/PATCH/DELETE /api/fm/work-orders/[id]
 * @sprint Sprint 70
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// Hoisted mocks
const mockRequireFmAbility = vi.fn();
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
  findOneAndUpdate: mockFindOneAndUpdate,
}));

vi.mock("@/app/api/fm/utils/fm-auth", () => ({
  requireFmAbility: vi.fn(() => mockRequireFmAbility),
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

vi.mock("@/lib/mongoUtils.server", () => ({
  unwrapFindOneResult: vi.fn((result) => result?.value ?? result),
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

vi.mock("@/app/api/fm/work-orders/utils", () => ({
  getCanonicalUserId: vi.fn(() => "user-123"),
  mapWorkOrderDocument: vi.fn((doc) => ({
    id: doc._id?.toString?.() ?? doc.id,
    title: doc.title,
    status: doc.status,
    orgId: doc.orgId,
  })),
  recordTimelineEntry: vi.fn(),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    invalidId: vi.fn(() => NextResponse.json({ error: "Invalid ID" }, { status: 400 })),
    notFound: vi.fn(() => NextResponse.json({ error: "Not found" }, { status: 404 })),
    validationError: vi.fn((msg: string) => NextResponse.json({ error: msg }, { status: 400 })),
    internalError: vi.fn(() => NextResponse.json({ error: "Internal error" }, { status: 500 })),
  },
}));

import { GET, PATCH, DELETE } from "@/app/api/fm/work-orders/[id]/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

const validWorkOrderId = new ObjectId().toString();
const testWorkOrder = {
  _id: new ObjectId(validWorkOrderId),
  title: "Test Work Order",
  status: "OPEN",
  orgId: "org-test-123",
};

describe("Work Order [id] Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockRequireFmAbility.mockResolvedValue({
      id: "user-123",
      email: "user@test.com",
      orgId: "org-test-123",
      role: "ADMIN",
    });
  });

  describe("GET /api/fm/work-orders/[id]", () => {
    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id");
      const res = await GET(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`);
      const res = await GET(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(429);
    });

    it("returns 401 when unauthorized", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`);
      const res = await GET(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(401);
    });

    it("returns 404 when work order not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`);
      const res = await GET(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(404);
    });

    it("returns work order on success", async () => {
      mockFindOne.mockResolvedValue(testWorkOrder);

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`);
      const res = await GET(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("enforces tenant isolation via orgId", async () => {
      mockFindOne.mockResolvedValue(testWorkOrder);

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`);
      await GET(req, { params: { id: validWorkOrderId } });

      expect(mockCollection).toHaveBeenCalledWith("workorders");
      expect(mockFindOne).toHaveBeenCalled();
      const filter = mockFindOne.mock.calls[0][0];
      expect(filter.orgId).toBeDefined();
    });
  });

  describe("PATCH /api/fm/work-orders/[id]", () => {
    beforeEach(() => {
      mockFindOne.mockResolvedValue(testWorkOrder);
      mockFindOneAndUpdate.mockResolvedValue({ value: { ...testWorkOrder, title: "Updated" } });
    });

    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });
      const res = await PATCH(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 401 when unauthorized", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });
      const res = await PATCH(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(401);
    });

    it("returns 404 when work order not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });
      const res = await PATCH(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(404);
    });

    it("updates work order on success", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title" }),
      });
      const res = await PATCH(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("DELETE /api/fm/work-orders/[id]", () => {
    beforeEach(() => {
      mockFindOneAndUpdate.mockResolvedValue({ value: { ...testWorkOrder, status: "CLOSED" } });
    });

    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/invalid-id`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 401 when unauthorized", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(401);
    });

    it("returns 404 when work order not found", async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(404);
    });

    it("soft deletes work order on success", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
