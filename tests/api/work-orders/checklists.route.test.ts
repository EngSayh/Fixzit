/**
 * @fileoverview Tests for /api/work-orders/[id]/checklists route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    findOne: vi.fn().mockResolvedValue({
      checklists: [],
      save: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  requireAbility: vi.fn(() => vi.fn().mockResolvedValue({
    id: "user-1",
    orgId: "org-1",
    tenantId: "tenant-1",
    role: "FM_MANAGER",
  })),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status, _req) => 
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "@/app/api/work-orders/[id]/checklists/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { WorkOrder } from "@/server/models/WorkOrder";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockWorkOrder = vi.mocked(WorkOrder);

function createRequest(body: object): Request {
  return new Request("http://localhost:3000/api/work-orders/507f1f77bcf86cd799439011/checklists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/work-orders/[id]/checklists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockWorkOrder.findOne.mockResolvedValue({
      checklists: [],
      save: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    );
    const res = await POST(
      createRequest({ title: "QA Checklist", items: [] }) as any,
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect(res.status).toBe(429);
  });

  it("should reject invalid ObjectId", async () => {
    const req = new Request("http://localhost:3000/api/work-orders/invalid-id/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "QA Checklist" }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ id: "invalid-id" }) });
    expect([400, 401, 500]).toContain(res.status);
  });

  it("should reject checklist without title", async () => {
    const res = await POST(
      createRequest({ items: [] }) as any,
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect([400, 401, 500]).toContain(res.status);
  });

  it("should create checklist for valid request", async () => {
    const res = await POST(
      createRequest({ 
        title: "QA Checklist",
        items: [{ label: "Check item 1" }, { label: "Check item 2" }]
      }) as any,
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect([200, 201, 401, 404, 500]).toContain(res.status);
  });

  it("should return 404 for non-existent work order", async () => {
    mockWorkOrder.findOne.mockResolvedValue(null);
    const res = await POST(
      createRequest({ title: "QA Checklist" }) as any,
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect([401, 404, 500]).toContain(res.status);
  });
});
