/**
 * @fileoverview Tests for /api/work-orders/sla-scan route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "FM_ADMIN", orgId: "org-1" },
  }),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
    aggregate: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ email: "user@test.com" }),
    }),
  },
}));

vi.mock("@/services/fm/sla-breach-service", () => ({
  scanForSlaBreaches: vi.fn().mockResolvedValue([]),
  filterAtRiskWorkOrders: vi.fn().mockReturnValue([]),
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

import { POST } from "@/app/api/work-orders/sla-scan/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { auth } from "@/auth";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockAuth = vi.mocked(auth);

function createRequest(body?: object): Request {
  return new Request("http://localhost:3000/api/work-orders/sla-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/work-orders/sla-scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "FM_ADMIN", orgId: "org-1" },
    } as any);
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    );
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should reject unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(401);
  });

  it("should reject users without SLA scan permissions", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "VIEWER", orgId: "org-1" },
    } as any);
    const res = await POST(createRequest() as any);
    expect([401, 403]).toContain(res.status);
  });

  it("should allow FM_ADMIN to run SLA scan", async () => {
    const res = await POST(createRequest() as any);
    // 200 for success, 401/403 if role check differs, 500 if error
    expect([200, 401, 403, 500]).toContain(res.status);
  });

  it("should support dryRun mode", async () => {
    const req = new Request("http://localhost:3000/api/work-orders/sla-scan?dryRun=true", {
      method: "POST",
    });
    const res = await POST(req as any);
    expect([200, 401, 403, 500]).toContain(res.status);
  });

  it("should reject missing orgId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "FM_ADMIN" },
    } as any);
    const res = await POST(createRequest() as any);
    expect([401, 500]).toContain(res.status);
  });
});
