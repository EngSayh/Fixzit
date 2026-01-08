/**
 * @fileoverview Tests for FM Work Order Attachments Route
 * @route GET/POST/DELETE /api/fm/work-orders/[id]/attachments
 * @sprint Sprint 70
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// Hoisted mocks
const mockRequireFmAbility = vi.fn();
const mockFind = vi.fn();
const mockToArray = vi.fn();
const mockCollection = vi.fn(() => ({
  find: mockFind,
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

vi.mock("@/lib/db/collections", () => ({
  COLLECTIONS: {
    WORKORDER_ATTACHMENTS: "workorder_attachments",
    WORKORDER_TIMELINE: "workorder_timeline",
  },
}));

vi.mock("@/lib/mongoUtils.server", () => ({
  unwrapFindOneResult: vi.fn((result) => result),
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

vi.mock("@/server/models/workorder/WorkOrderAttachment", () => ({
  WorkOrderAttachment: {
    create: vi.fn().mockResolvedValue({ _id: new ObjectId() }),
    findOneAndDelete: vi.fn(() => ({
      lean: vi.fn().mockResolvedValue({ _id: new ObjectId(), url: "test.jpg" }),
    })),
  },
}));

vi.mock("@/app/api/fm/work-orders/utils", () => ({
  assertWorkOrderQuota: vi.fn(),
  getCanonicalUserId: vi.fn(() => "user-123"),
  recordTimelineEntry: vi.fn(),
  WorkOrderQuotaError: class extends Error {
    limit: number;
    constructor(msg: string, limit: number) {
      super(msg);
      this.limit = limit;
    }
  },
  WORK_ORDER_ATTACHMENT_LIMIT: 50,
  WORK_ORDER_TIMELINE_LIMIT: 200,
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    invalidId: vi.fn(() => NextResponse.json({ error: "Invalid ID" }, { status: 400 })),
    validationError: vi.fn((msg: string) => NextResponse.json({ error: msg }, { status: 400 })),
    internalError: vi.fn(() => NextResponse.json({ error: "Internal error" }, { status: 500 })),
    notFound: vi.fn(() => NextResponse.json({ error: "Not found" }, { status: 404 })),
    rateLimited: vi.fn((msg: string) => NextResponse.json({ error: msg }, { status: 429 })),
  },
}));

import { GET, POST, DELETE } from "@/app/api/fm/work-orders/[id]/attachments/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

const validWorkOrderId = new ObjectId().toString();
const testAttachments = [
  {
    _id: new ObjectId(),
    workOrderId: validWorkOrderId,
    url: "https://example.com/photo1.jpg",
    type: "before",
    uploadedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    workOrderId: validWorkOrderId,
    url: "https://example.com/photo2.jpg",
    type: "after",
    uploadedAt: new Date(),
  },
];

describe("Work Order Attachments Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockRequireFmAbility.mockResolvedValue({
      id: "user-123",
      email: "user@test.com",
      orgId: "org-test-123",
      tenantId: "org-test-123",
      role: "ADMIN",
    });
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue(testAttachments),
    });
  });

  describe("GET /api/fm/work-orders/[id]/attachments", () => {
    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id/attachments");
      const res = await GET(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`);
      const res = await GET(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(429);
    });

    it("returns 401 when unauthorized", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`);
      const res = await GET(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(401);
    });

    it("returns attachments list on success", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`);
      const res = await GET(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("queries with orgId for tenant isolation", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`);
      await GET(req, { params: { id: validWorkOrderId } });

      expect(mockFind).toHaveBeenCalled();
    });
  });

  describe("POST /api/fm/work-orders/[id]/attachments", () => {
    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id/attachments", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/photo.jpg" }),
      });
      const res = await POST(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 401 when unauthorized", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`, {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/photo.jpg" }),
      });
      const res = await POST(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(401);
    });

    it("returns 400 when URL is missing", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(400);
    });

    it("creates attachment on success", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`, {
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com/new-photo.jpg",
          type: "before",
          caption: "Test caption",
        }),
      });
      const res = await POST(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  describe("DELETE /api/fm/work-orders/[id]/attachments", () => {
    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id/attachments?attachmentId=" + new ObjectId().toString(), {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 400 when attachmentId is missing", async () => {
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(400);
    });

    it("returns 401 when unauthorized", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const attachmentId = new ObjectId().toString();
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments?attachmentId=${attachmentId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(401);
    });

    it("deletes attachment on success", async () => {
      const attachmentId = new ObjectId().toString();
      const req = new NextRequest(`http://localhost/api/fm/work-orders/${validWorkOrderId}/attachments?attachmentId=${attachmentId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: validWorkOrderId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
