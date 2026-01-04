/**
 * @fileoverview Tests for Admin Billing Pricebooks API
 * @route POST /api/admin/billing/pricebooks
 * @route PATCH /api/admin/billing/pricebooks/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockCreate = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
let rateLimitAllowed = true;
let parseBodyResult: { data: unknown; error: string | null } = {
  data: { name: "Default" },
  error: null,
};
let mockAuthError: unknown = null;

vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(async () => {
    if (mockAuthError) throw mockAuthError;
    return { id: "admin-1", role: "SUPER_ADMIN", tenantId: "org-1" };
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: rateLimitAllowed })),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data: unknown, status: number) =>
    new Response(JSON.stringify(data), { status }),
  ),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(async () => parseBodyResult),
}));

vi.mock("@/server/models/PriceBook", () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

function createPostRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/billing/pricebooks", {
    method: "POST",
  });
}

function createPatchRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/billing/pricebooks/${id}`, {
    method: "PATCH",
  });
}

describe("/api/admin/billing/pricebooks", () => {
  let POST: typeof import("@/app/api/admin/billing/pricebooks/route").POST;
  let PATCH: typeof import("@/app/api/admin/billing/pricebooks/[id]/route").PATCH;

  beforeEach(async () => {
    vi.clearAllMocks();
    rateLimitAllowed = true;
    mockAuthError = null;
    parseBodyResult = { data: { name: "Default" }, error: null };
    mockCreate.mockResolvedValue({ id: "pb-1" });
    mockFindByIdAndUpdate.mockResolvedValue({ id: "pb-1" });
    vi.mocked(enforceRateLimit).mockReturnValue(null);

    const postMod = await import("@/app/api/admin/billing/pricebooks/route");
    const patchMod = await import("@/app/api/admin/billing/pricebooks/[id]/route");
    POST = postMod.POST;
    PATCH = patchMod.PATCH;
  });

  describe("POST", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      rateLimitAllowed = false;

      const res = await POST(createPostRequest());
      expect(res.status).toBe(429);
    });

    it("returns 400 when JSON parsing fails", async () => {
      parseBodyResult = { data: null, error: "parse_error" };

      const res = await POST(createPostRequest());
      expect(res.status).toBe(400);
    });

    it("creates a pricebook when payload is valid", async () => {
      parseBodyResult = { data: { name: "Enterprise" }, error: null };

      const res = await POST(createPostRequest());
      expect(res.status).toBe(200);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Enterprise" })
      );
    });

    // Security test: ensure prohibited fields are not passed to create
    // DEFERRED: Route sanitization tracked in Issue #293
    it.skip("rejects prohibited fields (isActive, adminOverride) in POST payload - requires route sanitization");
  });

  describe("PATCH", () => {
    it("returns 400 when id is invalid", async () => {
      const res = await PATCH(createPatchRequest("invalid-id"), { params: { id: "invalid-id" } });
      expect(res.status).toBe(400);
    });

    it("returns 400 when JSON parsing fails", async () => {
      parseBodyResult = { data: null, error: "parse_error" };

      const res = await PATCH(createPatchRequest("507f1f77bcf86cd799439011"), {
        params: { id: "507f1f77bcf86cd799439011" },
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 when pricebook is not found", async () => {
      mockFindByIdAndUpdate.mockResolvedValueOnce(null);

      const res = await PATCH(createPatchRequest("507f1f77bcf86cd799439011"), {
        params: { id: "507f1f77bcf86cd799439011" },
      });
      expect(res.status).toBe(404);
    });

    it("updates pricebook when payload is valid", async () => {
      parseBodyResult = { data: { name: "Updated" }, error: null };

      const res = await PATCH(createPatchRequest("507f1f77bcf86cd799439011"), {
        params: { id: "507f1f77bcf86cd799439011" },
      });
      expect(res.status).toBe(200);
      expect(mockFindByIdAndUpdate).toHaveBeenCalled();
    });

    it("rejects prohibited fields (adminOverride, tenantId) in PATCH payload", async () => {
      // Security test: ensure fields NOT in allowedFields are filtered out
      // Route allowedFields: ['name', 'description', 'prices', 'currency', 'effectiveDate', 'expiryDate', 'isActive', 'metadata']
      parseBodyResult = {
        data: { name: "Updated", isActive: false, adminOverride: true, tenantId: "hacked", _id: "injected" },
        error: null,
      };

      const res = await PATCH(createPatchRequest("507f1f77bcf86cd799439011"), {
        params: { id: "507f1f77bcf86cd799439011" },
      });
      expect(res.status).toBe(200);
      // Assert prohibited fields are NOT in the update call (name and isActive ARE allowed)
      expect(mockFindByIdAndUpdate).toHaveBeenCalled();
      const updateArgs = mockFindByIdAndUpdate.mock.calls[0] as unknown[];
      const updatePayload = updateArgs[1] as Record<string, unknown>;
      // These fields should be allowed
      expect(updatePayload).toHaveProperty("name", "Updated");
      expect(updatePayload).toHaveProperty("isActive", false);
      // These fields should be filtered out
      expect(updatePayload).not.toHaveProperty("adminOverride");
      expect(updatePayload).not.toHaveProperty("tenantId");
      expect(updatePayload).not.toHaveProperty("_id");
    });
  });
});
