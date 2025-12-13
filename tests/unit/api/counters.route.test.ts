import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mocks
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/queries", () => ({
  getAllCounters: vi.fn(),
}));

vi.mock("@/lib/utils/env", () => ({
  isTruthy: vi.fn().mockReturnValue(false),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

let auth: typeof import("@/auth").auth;
let getAllCounters: typeof import("@/lib/queries").getAllCounters;
let isTruthy: typeof import("@/lib/utils/env").isTruthy;
let GET: typeof import("@/app/api/counters/route").GET;

describe("GET /api/counters", () => {
  const mockCounters = {
    workOrders: { total: 10, open: 4, inProgress: 3, overdue: 1 },
    approvals: { pending: 2, overdue: 1 },
    rfqs: { open: 5 },
    hrApplications: { pending: 7 },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env.ALLOW_OFFLINE_MONGODB = "false";
    ({ auth } = await import("@/auth"));
    ({ getAllCounters } = await import("@/lib/queries"));
    ({ isTruthy } = await import("@/lib/utils/env"));
    const route = await import("@/app/api/counters/route");
    GET = route.GET;
    (isTruthy as vi.Mock).mockReturnValue(false);
  });

  it("returns counters including approvals, rfqs, and hrApplications for authenticated org", async () => {
    (auth as vi.Mock).mockResolvedValue({
      user: { id: "u1", orgId: "org1" },
    });
    (getAllCounters as vi.Mock).mockResolvedValue(mockCounters);

    const req = new NextRequest("http://localhost:3000/api/counters");
    const res = (await GET(req)) as NextResponse;
    const json = await res.json();

    // Debug assertion path visibility during development
    // console.log({ status: res.status, json });

    expect(res.status).toBe(200);
    expect(getAllCounters).toHaveBeenCalledWith("org1");
    expect(json.approvals).toEqual(mockCounters.approvals);
    expect(json.rfqs).toEqual(mockCounters.rfqs);
    expect(json.hrApplications).toEqual(mockCounters.hrApplications);
    expect(json.workOrders).toEqual(mockCounters.workOrders);
  });

  it("returns empty object for guests", async () => {
    (auth as vi.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/counters");
    const res = (await GET(req)) as NextResponse;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({});
    expect(getAllCounters).not.toHaveBeenCalled();
  });
});
