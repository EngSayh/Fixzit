/**
 * @fileoverview Tests for /api/admin/billing/annual-discount route
 * @description SUPER_ADMIN only access to annual discount percentage management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/admin/billing/annual-discount/route";

// Mock dependencies
vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/server/models/DiscountRule", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("mongoose", () => ({
  default: {
    isValidObjectId: vi.fn((id) => {
      // Accept test IDs and real ObjectId format
      return typeof id === "string" && id.length > 0;
    }),
  },
}));

import { requireSuperAdmin } from "@/lib/authz";
import { parseBodySafe } from "@/lib/api/parse-body";
import DiscountRule from "@/server/models/DiscountRule";

describe("PATCH /api/admin/billing/annual-discount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      tenantId: "org-123",
      userId: "user-123",
      roles: ["SUPER_ADMIN"],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should update annual discount percentage", async () => {
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { percentage: 15 },
      error: null,
    });
    vi.mocked(DiscountRule.findOneAndUpdate).mockResolvedValue({
      key: "ANNUAL_PREPAY",
      percentage: 15,
      orgId: "org-123",
    });

    const req = new NextRequest("http://localhost/api/admin/billing/annual-discount", {
      method: "PATCH",
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.discount).toBe(15);
  });

  it("should reject invalid percentage (over 100)", async () => {
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { percentage: 150 },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/admin/billing/annual-discount", {
      method: "PATCH",
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Percentage");
  });

  it("should reject invalid percentage (negative)", async () => {
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { percentage: -5 },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/admin/billing/annual-discount", {
      method: "PATCH",
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid request body", async () => {
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: null,
      error: new Error("Invalid JSON"),
    });

    const req = new NextRequest("http://localhost/api/admin/billing/annual-discount", {
      method: "PATCH",
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    // Returns "Invalid request body" when parseBodySafe fails
    expect(data.error).toBeDefined();
  });
});
