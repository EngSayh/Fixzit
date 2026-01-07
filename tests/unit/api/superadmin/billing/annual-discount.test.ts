/**
 * @fileoverview Tests for Superadmin Billing Annual Discount API
 * @route GET/PATCH /api/superadmin/billing/annual-discount
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";

const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/server/models/DiscountRule", () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => ({
      lean: () => mockFindOne(...args),
    }),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const { GET, PATCH } = await import("@/app/api/superadmin/billing/annual-discount/route");

const VALID_ORG_ID = "507f1f77bcf86cd799439011";

function createRequest(method: "GET" | "PATCH", body?: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/superadmin/billing/annual-discount", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

describe("/api/superadmin/billing/annual-discount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockResolvedValue(null);
    mockFindOneAndUpdate.mockResolvedValue({ percentage: 15 });
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "super_admin",
      orgId: VALID_ORG_ID,
    } as any);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null);

    const res = await GET(createRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when orgId is invalid", async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "super_admin",
      orgId: "invalid",
    } as any);

    const res = await GET(createRequest("GET"));
    expect(res.status).toBe(400);
  });

  it("queries discount rule with org scope", async () => {
    mockFindOne.mockResolvedValue({ percentage: 10 });

    const res = await GET(createRequest("GET"));
    expect(res.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({
      key: "ANNUAL_PREPAY",
      orgId: expect.any(Object),
    });
  });

  it("updates discount rule with org scope", async () => {
    const res = await PATCH(createRequest("PATCH", { percentage: 20 }));
    expect(res.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { key: "ANNUAL_PREPAY", orgId: expect.any(Object) },
      {
        $set: {
          percentage: 20,
          updatedAt: expect.any(Date),
        },
      },
      { upsert: true, new: true },
    );
  });
});
