import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
    const resp = await GET();
    const data = await resp.json();

    expect(data).toMatchObject({
      approvals: { pending: 2, overdue: 1 },
      rfqs: { open: 5 },
      hrApplications: { pending: 3 },
    });
  });
});
