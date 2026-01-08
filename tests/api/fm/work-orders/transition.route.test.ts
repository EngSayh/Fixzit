/**
 * @fileoverview Tests for FM Work Order Transition Route
 * @route POST /api/fm/work-orders/[id]/transition
 * @sprint Sprint 36
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// Mock dependencies before imports
const mockRequireFmAbility = vi.fn();
const mockGetSessionUser = vi.fn();

vi.mock("@/app/api/fm/utils/fm-auth", () => ({
  requireFmAbility: vi.fn(() => mockRequireFmAbility),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((req, orgId) => ({
    tenantId: orgId || "org-test-123",
  })),
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
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
    data: { toStatus: "IN_PROGRESS", comment: "Starting work" },
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

vi.mock("@/lib/mongoUtils.server", () => ({
  unwrapFindOneResult: vi.fn((result) => result),
}));

vi.mock("@/domain/fm/fm.behavior", () => ({
  WORK_ORDER_FSM: {},
  canTransition: vi.fn(() => true),
  can: vi.fn(() => true),
  Role: {},
  Plan: {},
  SubmoduleKey: {},
  WOStatus: {
    OPEN: "OPEN",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
  },
}));

vi.mock("@/app/api/fm/work-orders/utils", () => ({
  getCanonicalUserId: vi.fn(() => "user-1"),
  mapWorkOrderDocument: vi.fn((doc) => doc),
  recordTimelineEntry: vi.fn(),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    invalidId: vi.fn(() => NextResponse.json({ error: "Invalid ID" }, { status: 400 })),
    validationError: vi.fn((msg: string) => NextResponse.json({ error: msg }, { status: 400 })),
    notFound: vi.fn(() => NextResponse.json({ error: "Not found" }, { status: 404 })),
    internalError: vi.fn(() => NextResponse.json({ error: "Internal error" }, { status: 500 })),
  },
}));

import { POST } from "@/app/api/fm/work-orders/[id]/transition/route";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockSmartRateLimit = vi.mocked(smartRateLimit);

const testWorkOrderId = new ObjectId().toString();

describe("POST /api/fm/work-orders/[id]/transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 29, resetIn: 60000 });
    mockRequireFmAbility.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      orgId: "org-test-123",
    });
    mockGetSessionUser.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      orgId: "org-test-123",
    });
  });

  it("returns 400 for invalid work order ID", async () => {
    const req = new NextRequest("http://localhost/api/fm/work-orders/invalid-id/transition", {
      method: "POST",
      body: JSON.stringify({ toStatus: "IN_PROGRESS" }),
    });
    const res = await POST(req, { params: { id: "invalid-id" } });

    expect(res.status).toBe(400);
  });

  it("returns 403 when user lacks STATUS permission", async () => {
    mockRequireFmAbility.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/transition`, {
      method: "POST",
      body: JSON.stringify({ toStatus: "IN_PROGRESS" }),
    });
    const res = await POST(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(403);
  });

  it("enforces rate limiting", async () => {
    mockSmartRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30000 });

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/transition`, {
      method: "POST",
      body: JSON.stringify({ toStatus: "IN_PROGRESS" }),
    });
    const res = await POST(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(429);
  });

  it("validates transition request body schema", async () => {
    const { parseBodySafe } = await import("@/lib/api/parse-body");
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { toStatus: "" }, // Invalid - empty status
      error: null,
    });

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/transition`, {
      method: "POST",
      body: JSON.stringify({ toStatus: "" }),
    });
    const res = await POST(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(400);
  });

  it("handles missing tenant context", async () => {
    const { resolveTenantId } = await import("@/app/api/fm/utils/tenant");
    vi.mocked(resolveTenantId).mockReturnValue({
      error: NextResponse.json({ error: "Missing tenant" }, { status: 400 }),
    });

    const req = new NextRequest(`http://localhost/api/fm/work-orders/${testWorkOrderId}/transition`, {
      method: "POST",
      body: JSON.stringify({ toStatus: "IN_PROGRESS" }),
    });
    const res = await POST(req, { params: { id: testWorkOrderId } });

    expect(res.status).toBe(400);
  });
});
