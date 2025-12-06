import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

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

// Import after mocks
import { auth } from "@/auth";
import { getAllCounters } from "@/lib/queries";
import { GET } from "@/app/api/counters/route";

describe("GET /api/counters", () => {
  const mockCounters = {
    workOrders: { total: 10, open: 4, inProgress: 3, overdue: 1 },
    approvals: { pending: 2, overdue: 1 },
    rfqs: { open: 5 },
    hrApplications: { pending: 7 },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns counters including approvals, rfqs, and hrApplications for authenticated org", async () => {
    (auth as vi.Mock).mockResolvedValue({
      user: { id: "u1", orgId: "org1" },
    });
    (getAllCounters as vi.Mock).mockResolvedValue(mockCounters);

    const res = (await GET()) as NextResponse;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(getAllCounters).toHaveBeenCalledWith("org1");
    expect(json.approvals).toEqual(mockCounters.approvals);
    expect(json.rfqs).toEqual(mockCounters.rfqs);
    expect(json.hrApplications).toEqual(mockCounters.hrApplications);
    expect(json.workOrders).toEqual(mockCounters.workOrders);
  });

  it("returns empty object for guests", async () => {
    (auth as vi.Mock).mockResolvedValue(null);

    const res = (await GET()) as NextResponse;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({});
    expect(getAllCounters).not.toHaveBeenCalled();
  });
});
