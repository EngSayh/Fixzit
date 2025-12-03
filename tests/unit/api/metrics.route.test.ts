import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({ id: "admin", tenantId: "org-1" }),
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "rl-key"),
}));
vi.mock("@/lib/monitoring/metrics-registry", () => ({
  getMetricsRegistry: vi.fn(() => ({
    metrics: vi.fn().mockResolvedValue("metrics-body"),
    contentType: "text/plain",
  })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "@/app/api/metrics/route";
import { requireSuperAdmin } from "@/lib/authz";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getMetricsRegistry } from "@/lib/monitoring/metrics-registry";

type NextRequestLike = {
  url: string;
  headers: { get: (key: string) => string | null };
};

function createRequest(): NextRequestLike {
  return {
    url: "http://localhost/api/metrics",
    headers: { get: () => null },
  };
}

describe("api/metrics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "admin", tenantId: "org-1" });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(getMetricsRegistry).mockReturnValue({
      metrics: vi.fn().mockResolvedValue("metrics-body"),
      contentType: "text/plain",
    } as any);
  });

  it("rejects when unauthorized", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 }),
    );
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(401);
  });

  it("rejects when tenant is missing", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "admin", tenantId: "" } as any);
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing organization context");
  });

  it("rate limits when not allowed", async () => {
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(429);
  });

  it("returns metrics when allowed", async () => {
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("metrics-body");
  });

  it("returns 500 on registry failure", async () => {
    vi.mocked(getMetricsRegistry).mockReturnValue({
      metrics: vi.fn().mockRejectedValue(new Error("boom")),
      contentType: "text/plain",
    } as any);
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(500);
  });
});
