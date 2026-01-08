/**
 * @fileoverview Tests for FM Work Order Timeline Route
 * @route GET /api/fm/work-orders/[id]/timeline
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

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/server/models/workorder/WorkOrderTimeline", () => ({
  WorkOrderTimeline: {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/app/api/fm/work-orders/utils", () => ({
  buildWorkOrderUser: vi.fn(() => ({ id: "user-1", name: "Test User" })),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    invalidId: vi.fn(() => NextResponse.json({ error: "Invalid ID" }, { status: 400 })),
    internalError: vi.fn(() => NextResponse.json({ error: "Internal error" }, { status: 500 })),
  },
}));

import { GET } from "@/app/api/fm/work-orders/[id]/timeline/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { WorkOrderTimeline } from "@/server/models/workorder/WorkOrderTimeline";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockWorkOrderTimeline = vi.mocked(WorkOrderTimeline);

const testWorkOrderId = new ObjectId().toString();

describe("GET /api/fm/work-orders/[id]/timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockRequireFmAbility.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      orgId: "org-test-123",
    });
  });

  it("returns 400 for invalid work order ID", async () => {
    const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id/timeline");
    const res = await GET(req, { params: { id: "invalid-id" } });

    expect(res.status).toBe(400);
  });

  it("returns paginated timeline entries for valid work order", async () => {
    const timeline = [
      {
        _id: new ObjectId(),
        action: "created",
        description: "Work order created",
        performedAt: new Date(),
        performedBy: "user-1",
      },
      {
        _id: new ObjectId(),
        action: "status_changed",
        description: "Status changed to In Progress",
        performedAt: new Date(),
        performedBy: "user-1",
      },
    ];

    mockWorkOrderTimeline.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(timeline),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof WorkOrderTimeline.find>);
    mockWorkOrderTimeline.countDocuments.mockResolvedValue(2);

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/timeline`);
    const res = await GET(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("returns 403 when user lacks VIEW permission", async () => {
    mockRequireFmAbility.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/timeline`);
    const res = await GET(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(403);
  });

  it("enforces rate limiting", async () => {
    mockEnforceRateLimit.mockReturnValue(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    );

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/timeline`);
    const res = await GET(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(429);
  });

  it("respects pagination parameters", async () => {
    mockWorkOrderTimeline.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof WorkOrderTimeline.find>);
    mockWorkOrderTimeline.countDocuments.mockResolvedValue(50);

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/timeline?page=2&limit=10`);
    const res = await GET(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
