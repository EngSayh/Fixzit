import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth to return an org-scoped session
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { orgId: "org-123" } }),
}));

// Mock getAllCounters to return shaped data
vi.mock("@/lib/queries", () => ({
  getAllCounters: vi.fn().mockResolvedValue({
    approvals: { pending: 2, overdue: 1 },
    rfqs: { open: 5 },
    hrApplications: { pending: 3 },
  }),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Ensure offline flag is false
vi.mock("@/lib/utils/env", async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    isTruthy: () => false,
  };
});

import { GET } from "@/app/api/counters/route";

describe("/api/counters contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns approvals, rfqs, and hrApplications counters", async () => {
    const req = new NextRequest("http://localhost:3000/api/counters");
    const resp = await GET(req);
    const data = await resp.json();

    expect(data).toMatchObject({
      approvals: { pending: 2, overdue: 1 },
      rfqs: { open: 5 },
      hrApplications: { pending: 3 },
    });
  });
});
