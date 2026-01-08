/**
 * @fileoverview Tests for FM Work Order Comments Route
 * @route GET/POST /api/fm/work-orders/[id]/comments
 * @sprint Sprint 36
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// Mock dependencies before imports
const mockRequireFmAbility = vi.fn();

vi.mock("@/app/api/fm/utils/fm-auth", () => ({
  requireFmAbility: vi.fn(() => mockRequireFmAbility),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((req, orgId) => ({
    tenantId: orgId || "org-test-123",
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

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(() => ({
    data: { comment: "Test comment", type: "comment" },
    error: null,
  })),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(() => Promise.resolve({ allowed: true })),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  ),
}));

vi.mock("@/server/models/workorder/WorkOrderComment", () => ({
  WorkOrderComment: {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
  },
}));

vi.mock("@/app/api/fm/work-orders/utils", () => ({
  assertWorkOrderQuota: vi.fn(),
  buildWorkOrderUser: vi.fn(() => ({ id: "user-1", name: "Test User" })),
  getCanonicalUserId: vi.fn(() => "user-1"),
  recordTimelineEntry: vi.fn(),
  WorkOrderQuotaError: class extends Error {},
  WORK_ORDER_COMMENT_LIMIT: 100,
  WORK_ORDER_TIMELINE_LIMIT: 200,
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    invalidId: vi.fn(() => NextResponse.json({ error: "Invalid ID" }, { status: 400 })),
    validationError: vi.fn((msg: string) => NextResponse.json({ error: msg }, { status: 400 })),
    internalError: vi.fn(() => NextResponse.json({ error: "Internal error" }, { status: 500 })),
  },
}));

import { GET, POST } from "@/app/api/fm/work-orders/[id]/comments/route";
import { smartRateLimit } from "@/server/security/rateLimit";
import { WorkOrderComment } from "@/server/models/workorder/WorkOrderComment";

const mockSmartRateLimit = vi.mocked(smartRateLimit);
const mockWorkOrderComment = vi.mocked(WorkOrderComment);

const testWorkOrderId = new ObjectId().toString();

describe("Work Order Comments Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetIn: 60000 });
    mockRequireFmAbility.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      orgId: "org-test-123",
    });
  });

  describe("GET /api/fm/work-orders/[id]/comments", () => {
    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id/comments");
      const res = await GET(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns paginated comments for valid work order", async () => {
      const comments = [
        { _id: new ObjectId(), comment: "Test 1", type: "comment", createdAt: new Date() },
        { _id: new ObjectId(), comment: "Test 2", type: "internal", createdAt: new Date() },
      ];

      mockWorkOrderComment.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(comments),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof WorkOrderComment.find>);
      mockWorkOrderComment.countDocuments.mockResolvedValue(2);

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/comments`);
      const res = await GET(req, { params: { id: testWorkOrderId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it("returns 403 when user lacks VIEW permission", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/comments`);
      const res = await GET(req, { params: { id: testWorkOrderId } });

      expect(res.status).toBe(403);
    });

    it("enforces rate limiting", async () => {
      mockSmartRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30000 });

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/comments`);
      const res = await GET(req, { params: { id: testWorkOrderId } });

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/fm/work-orders/[id]/comments", () => {
    beforeEach(() => {
      mockRequireFmAbility.mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        orgId: "org-test-123",
      });
    });

    it("returns 400 for invalid work order ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id/comments", {
        method: "POST",
        body: JSON.stringify({ comment: "Test", type: "comment" }),
      });
      const res = await POST(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 403 when user lacks COMMENT permission", async () => {
      mockRequireFmAbility.mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: "Test", type: "comment" }),
      });
      const res = await POST(req, { params: { id: testWorkOrderId } });

      expect(res.status).toBe(403);
    });

    it("enforces rate limiting on POST", async () => {
      mockSmartRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30000 });

      const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: "Test", type: "comment" }),
      });
      const res = await POST(req, { params: { id: testWorkOrderId } });

      expect(res.status).toBe(429);
    });
  });
});
