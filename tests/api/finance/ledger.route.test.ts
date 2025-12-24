/**
 * @fileoverview Tests for /api/finance/ledger route
 * @description Finance ledger access with FINANCE:VIEW permission
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE (read by mock factories via closures)
// Pattern: Vitest pool:forks requires mutable state for mock configuration
// ============================================================================
type SessionUser = { id: string; org_id: string; role: string } | null;
let mockSessionUser: SessionUser = null;
let mockRateLimitResponse: Response | null = null;

// Mock dependencies before import
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => mockSessionUser),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn((_, fn) => fn()),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(() => true),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/finance/LedgerEntry", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
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

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  ),
  forbiddenError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  ),
  handleApiError: vi.fn((err) =>
    new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  ),
  isForbidden: vi.fn(() => false),
}));

// Static import AFTER vi.mock declarations (Vitest hoists mocks)
import { GET } from "@/app/api/finance/ledger/route";

function createRequest(
  method: string,
  searchParams?: Record<string, string>,
): NextRequest {
  const url = new URL("http://localhost:3000/api/finance/ledger");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API /api/finance/ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    // Reset mutable state to defaults
    mockSessionUser = null;
    mockRateLimitResponse = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/finance/ledger", () => {
    it("returns 401 when not authenticated", async () => {
      mockSessionUser = null;

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("enforces rate limiting", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    // Pending integration tests tracked in SSOT:
    // - FINANCE permission, pagination, accountId filter, date range filter
  });
});
