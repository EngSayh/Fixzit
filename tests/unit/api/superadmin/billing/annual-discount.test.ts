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

  // Additional tests per CodeRabbit review for comprehensive coverage

  // GET endpoint enhanced tests
  describe("GET enhanced coverage", () => {
    it("returns discount rule data in response body", async () => {
      mockFindOne.mockResolvedValue({ percentage: 10, key: "ANNUAL_PREPAY" });
      
      const res = await GET(createRequest("GET"));
      const json = await res.json();
      
      expect(res.status).toBe(200);
      expect(json).toMatchObject({
        percentage: 10,
        key: "ANNUAL_PREPAY",
      });
    });

    it("handles missing discount rule gracefully", async () => {
      mockFindOne.mockResolvedValue(null);
      
      const res = await GET(createRequest("GET"));
      expect(res.status).toBe(200);
      const json = await res.json();
      // Route returns default discount when none found
      expect(json).toMatchObject({
        key: "ANNUAL_PREPAY",
        percentage: 20,
        description: "Annual prepayment discount",
      });
    });

    it("returns 500 when database query fails", async () => {
      mockFindOne.mockRejectedValue(new Error("DB connection failed"));
      
      const res = await GET(createRequest("GET"));
      expect(res.status).toBe(500);
    });
  });

  // PATCH endpoint error path tests
  describe("PATCH error paths", () => {
    it("returns 400 when percentage is missing", async () => {
      const res = await PATCH(createRequest("PATCH", {}));
      expect(res.status).toBe(400);
    });

    it("returns 400 when percentage is invalid (negative)", async () => {
      const res = await PATCH(createRequest("PATCH", { percentage: -5 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when percentage is invalid (over 100)", async () => {
      const res = await PATCH(createRequest("PATCH", { percentage: 150 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when percentage is not a number", async () => {
      const res = await PATCH(createRequest("PATCH", { percentage: "invalid" }));
      expect(res.status).toBe(400);
    });

    it("returns updated rule in response body", async () => {
      mockFindOneAndUpdate.mockResolvedValue({ 
        percentage: 25, 
        key: "ANNUAL_PREPAY",
        updatedAt: new Date() 
      });
      
      const res = await PATCH(createRequest("PATCH", { percentage: 25 }));
      const json = await res.json();
      
      expect(res.status).toBe(200);
      // Response is wrapped: { success: true, discount: {...} }
      expect(json.success).toBe(true);
      expect(json.discount).toMatchObject({
        percentage: 25,
        key: "ANNUAL_PREPAY",
      });
    });

    it("returns 500 when database update fails", async () => {
      mockFindOneAndUpdate.mockRejectedValue(new Error("DB write failed"));
      
      const res = await PATCH(createRequest("PATCH", { percentage: 15 }));
      expect(res.status).toBe(500);
    });

    // Boundary value tests
    it("accepts percentage at boundary value 0", async () => {
      mockFindOneAndUpdate.mockResolvedValue({ percentage: 0 });
      const res = await PATCH(createRequest("PATCH", { percentage: 0 }));
      expect(res.status).toBe(200);
    });

    it("accepts percentage at boundary value 100", async () => {
      mockFindOneAndUpdate.mockResolvedValue({ percentage: 100 });
      const res = await PATCH(createRequest("PATCH", { percentage: 100 }));
      expect(res.status).toBe(200);
    });
  });
});
