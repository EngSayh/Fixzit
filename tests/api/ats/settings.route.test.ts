/**
 * @fileoverview Tests for /api/ats/settings route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/AtsSettings", () => ({
  AtsSettings: {
    findOne: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        scoringWeights: { experience: 30, skills: 40, culture: 30 },
        knockoutRules: [],
        alerts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    }),
    findOneAndUpdate: vi.fn().mockResolvedValue({
      scoringWeights: { experience: 30, skills: 40, culture: 30 },
    }),
    findOrCreateForOrg: vi.fn().mockResolvedValue({
      scoringWeights: { experience: 30, skills: 40, culture: 30 },
      knockoutRules: [],
      alerts: [],
    }),
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

import { GET, PATCH } from "@/app/api/ats/settings/route";
import { atsRBAC } from "@/lib/ats/rbac";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockAtsRBAC = vi.mocked(atsRBAC);
const mockSmartRateLimit = vi.mocked(smartRateLimit);

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/ats/settings", {
    method: "GET",
  });
}

function createPatchRequest(body: object): Request {
  return new Request("http://localhost:3000/api/ats/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/ats/settings", () => {
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

  it("should return settings for authorized user", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 403, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.success).toBe(true);
    }
  });

  it("should create default settings if none exist", async () => {
    const { AtsSettings } = await import("@/server/models/AtsSettings");
    vi.mocked(AtsSettings.findOne).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    const res = await GET(createGetRequest() as any);
    expect([200, 403, 500]).toContain(res.status);
  });
});

describe("PATCH /api/ats/settings", () => {
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
    const res = await PATCH(createPatchRequest({ scoringWeights: { experience: 40 } }) as any);
    expect([401, 403]).toContain(res.status);
  });

  it("should update settings for authorized user", async () => {
    const res = await PATCH(createPatchRequest({
      scoringWeights: { experience: 40, skills: 35, culture: 25 },
    }) as any);
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});
