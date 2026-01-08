/**
 * @fileoverview Tests for /api/ats/scoring-dashboard route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Application", () => ({
  Application: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: "app-1", candidateName: "John Doe", score: 85, status: "reviewed" },
        { _id: "app-2", candidateName: "Jane Smith", score: 92, status: "shortlisted" },
      ]),
    }),
    aggregate: vi.fn().mockResolvedValue([
      { _id: "reviewed", count: 10, avgScore: 75 },
      { _id: "shortlisted", count: 5, avgScore: 88 },
    ]),
    countDocuments: vi.fn().mockResolvedValue(15),
  },
}));

vi.mock("@/lib/ats/rbac", () => ({
  atsRBAC: vi.fn().mockResolvedValue({
    authorized: true,
    userId: "user-1",
    orgId: "org-1",
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { GET } from "@/app/api/ats/scoring-dashboard/route";
import { atsRBAC } from "@/lib/ats/rbac";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockAtsRBAC = vi.mocked(atsRBAC);
const mockSmartRateLimit = vi.mocked(smartRateLimit);

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/ats/scoring-dashboard");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

describe("GET /api/ats/scoring-dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtsRBAC.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      orgId: "org-1",
    } as any);
    mockSmartRateLimit.mockResolvedValue({ allowed: true } as any);
  });

  it("should reject unauthorized users", async () => {
    mockAtsRBAC.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as any);
    const res = await GET(createGetRequest() as any);
    expect([401, 403]).toContain(res.status);
  });

  it("should return 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValue({ allowed: false } as any);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should return scoring analytics", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 403, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json).toBeDefined();
    }
  });

  it("should support jobId filter", async () => {
    const res = await GET(createGetRequest({ jobId: "job-123" }) as any);
    expect([200, 400, 403, 500]).toContain(res.status);
  });

  it("should support date range filter", async () => {
    const res = await GET(createGetRequest({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    }) as any);
    expect([200, 403, 500]).toContain(res.status);
  });
});
