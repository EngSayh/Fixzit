import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(),
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "rl-key"),
}));
vi.mock("@/server/models/Module", () => ({
  __esModule: true,
  default: { findOne: vi.fn() },
}));
vi.mock("@/server/models/PriceTier", () => ({
  __esModule: true,
  default: {
    find: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    findOneAndUpdate: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/admin/price-tiers/route";
import { getUserFromToken } from "@/lib/auth";
import Module from "@/server/models/Module";
import PriceTier from "@/server/models/PriceTier";

function makeRequest(method: "GET" | "POST", body?: any, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/admin/price-tiers", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      authorization: "Bearer token",
      "content-type": "application/json",
      ...headers,
    },
  });
}

describe("admin/price-tiers route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromToken).mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      role: "SUPER_ADMIN",
      orgId: "org1",
    } as any);
  });

  it("GET scopes by orgId when present", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    expect(PriceTier.find).toHaveBeenCalledWith({ orgId: "org1" });
  });

  it("POST upserts with orgId", async () => {
    vi.mocked(Module.findOne).mockResolvedValue({ _id: "mod1" } as any);
    vi.mocked(PriceTier.findOneAndUpdate).mockResolvedValue({ _id: "tier1", orgId: "org1" } as any);

    const res = await POST(
      makeRequest("POST", {
        moduleCode: "MOD",
        seatsMin: 1,
        seatsMax: 10,
        pricePerSeatMonthly: 5,
        currency: "USD",
      }),
    );

    expect(res.status).toBe(201);
    expect(PriceTier.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org1" }),
      expect.objectContaining({ orgId: "org1" }),
      expect.any(Object),
    );
  });
});
