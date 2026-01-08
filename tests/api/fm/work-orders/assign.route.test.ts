/**
 * @fileoverview Tests for /api/fm/work-orders/[id]/assign
 * Sprint 33: FM Core coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/fm/work-orders/[id]/assign/route";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOneAndUpdate: vi.fn().mockResolvedValue({ value: null }),
    }),
  }),
}));

vi.mock("@/lib/mongoUtils.server", () => ({
  unwrapFindOneResult: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("../../utils/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue({ tenantId: "org-1" }),
}));

vi.mock("@/app/api/fm/work-orders/[id]/assign/../../utils/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue({ tenantId: "org-1" }),
}));

vi.mock("../../../utils/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue({ tenantId: "org-1" }),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue({ tenantId: "org-1" }),
}));

vi.mock("../../../utils/fm-auth", () => ({
  requireFmAbility: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@/app/api/fm/utils/fm-auth", () => ({
  requireFmAbility: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("../../../errors", () => ({
  FMErrors: {
    unauthorized: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    ),
    invalidId: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Invalid ID" }), { status: 400 })
    ),
    validationError: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Validation error" }), { status: 400 })
    ),
  },
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    unauthorized: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    ),
    invalidId: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Invalid ID" }), { status: 400 })
    ),
    validationError: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Validation error" }), { status: 400 })
    ),
  },
}));

vi.mock("../../utils", () => ({
  getCanonicalUserId: vi.fn().mockReturnValue("user-1"),
  mapWorkOrderDocument: vi.fn().mockReturnValue({}),
  recordTimelineEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/api/fm/work-orders/utils", () => ({
  getCanonicalUserId: vi.fn().mockReturnValue("user-1"),
  mapWorkOrderDocument: vi.fn().mockReturnValue({}),
  recordTimelineEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("POST /api/fm/work-orders/[id]/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/fm/work-orders/123/assign", {
      method: "POST",
      body: JSON.stringify({ assigneeId: "user-2" }),
    });
    const res = await POST(req, { params: { id: "123" } });

    expect(res.status).toBe(429);
  });
});
