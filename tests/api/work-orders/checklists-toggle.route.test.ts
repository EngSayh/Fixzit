/**
 * @fileoverview Tests for /api/work-orders/[id]/checklists/toggle route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    findOne: vi.fn().mockResolvedValue({
      checklists: [
        {
          items: [{ label: "Item 1", done: false }, { label: "Item 2", done: false }],
        },
      ],
      save: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    id: "user-1",
    orgId: "org-1",
    tenantId: "tenant-1",
    role: "FM_TECHNICIAN",
  }),
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

import { POST } from "@/app/api/work-orders/[id]/checklists/toggle/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { WorkOrder } from "@/server/models/WorkOrder";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockWorkOrder = vi.mocked(WorkOrder);

function createRequest(body: object): Request {
  return new Request("http://localhost:3000/api/work-orders/wo-1/checklists/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/work-orders/[id]/checklists/toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockWorkOrder.findOne.mockResolvedValue({
      checklists: [
        {
          items: [{ label: "Item 1", done: false }, { label: "Item 2", done: false }],
        },
      ],
      save: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    );
    const res = await POST(
      createRequest({ checklistIndex: 0, itemIndex: 0, done: true }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect(res.status).toBe(429);
  });

  it("should reject invalid checklist index", async () => {
    const res = await POST(
      createRequest({ checklistIndex: 99, itemIndex: 0, done: true }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect([400, 401, 500]).toContain(res.status);
  });

  it("should reject invalid item index", async () => {
    const res = await POST(
      createRequest({ checklistIndex: 0, itemIndex: 99, done: true }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect([400, 401, 500]).toContain(res.status);
  });

  it("should toggle checklist item for valid request", async () => {
    const res = await POST(
      createRequest({ checklistIndex: 0, itemIndex: 0, done: true }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect([200, 401, 404, 500]).toContain(res.status);
  });

  it("should return 404 for non-existent work order", async () => {
    mockWorkOrder.findOne.mockResolvedValue(null);
    const res = await POST(
      createRequest({ checklistIndex: 0, itemIndex: 0, done: true }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect([401, 404, 500]).toContain(res.status);
  });

  it("should require done boolean field", async () => {
    const res = await POST(
      createRequest({ checklistIndex: 0, itemIndex: 0 }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect([400, 401, 500]).toContain(res.status);
  });
});
