/**
 * @fileoverview Tests for Admin Billing Annual Discount API
 * @route PATCH /api/admin/billing/annual-discount
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { requireSuperAdmin } from "@/lib/authz";

const mockFindOneAndUpdate = vi.fn();
let parseBodyResult: { data: unknown; error: string | null } = {
  data: { percentage: 10 },
  error: null,
};
let mockAuthError: unknown = null;

vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("mongoose", () => ({
  default: {
    isValidObjectId: vi.fn(() => true),
    Types: { ObjectId: { isValid: vi.fn(() => true) } },
  },
  isValidObjectId: vi.fn(() => true),
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(async () => {
    if (mockAuthError) throw mockAuthError;
    return { id: "admin-1", role: "SUPER_ADMIN", tenantId: "507f1f77bcf86cd799439011" };
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(async () => parseBodyResult),
}));

vi.mock("@/server/models/DiscountRule", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/billing/annual-discount", {
    method: "PATCH",
  });
}

describe("/api/admin/billing/annual-discount", () => {
  let PATCH: typeof import("@/app/api/admin/billing/annual-discount/route").PATCH;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthError = null;
    parseBodyResult = { data: { percentage: 10 }, error: null };
    mockFindOneAndUpdate.mockResolvedValue({ percentage: 10 });
    vi.mocked(enforceRateLimit).mockReturnValue(null);

    const mod = await import("@/app/api/admin/billing/annual-discount/route");
    PATCH = mod.PATCH;
  });

  it("returns 400 when JSON parsing fails", async () => {
    parseBodyResult = { data: null, error: "parse_error" };

    const res = await PATCH(createRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when percentage is invalid", async () => {
    parseBodyResult = { data: { percentage: 200 }, error: null };

    const res = await PATCH(createRequest());
    expect(res.status).toBe(400);
  });

  it("updates annual discount when percentage is valid", async () => {
    parseBodyResult = { data: { percentage: 15 }, error: null };

    const res = await PATCH(createRequest());
    expect(res.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { key: "ANNUAL_PREPAY", orgId: "507f1f77bcf86cd799439011" },
      { percentage: 15 },
      { upsert: true, new: true },
    );
  });

  it("returns 400 when org context is missing", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValueOnce({
      id: "admin-1",
      role: "SUPER_ADMIN",
      tenantId: "",
    });

    const res = await PATCH(createRequest());
    expect(res.status).toBe(400);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
