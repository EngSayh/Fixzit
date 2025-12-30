/**
 * @fileoverview Tests for /api/finance/reports/balance-sheet route
 * Tests balance sheet report generation with date filtering
 * FINANCIAL TAG: Critical for accounting reports and compliance
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/middleware/withAuthRbac")>();
  return {
    ...actual,
    getSessionUser: vi.fn(),
  };
});

// Mock auth context
vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn((_user, fn) => fn()),
}));

// Mock RBAC
vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock balance sheet service
vi.mock("@/server/finance/reporting.service", () => ({
  balanceSheet: vi.fn(),
}));

// Mock error responses
vi.mock("@/server/utils/errorResponses", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/utils/errorResponses")>();
  return {
    ...actual,
    forbiddenError: vi.fn(() => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })),
    unauthorizedError: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
    isForbidden: vi.fn().mockReturnValue(false),
  };
});

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { requirePermission } from "@/config/rbac.config";
import { balanceSheet } from "@/server/finance/reporting.service";

const importRoute = () => import("@/app/api/finance/reports/balance-sheet/route");

describe("GET /api/finance/reports/balance-sheet", () => {
  const mockOrgId = "507f1f77bcf86cd799439011";
  const mockUser = {
    id: "507f1f77bcf86cd799439012",
    orgId: mockOrgId,
    role: "FINANCE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(requirePermission).mockReturnValue(undefined);
    vi.mocked(balanceSheet).mockResolvedValue({
      assets: BigInt(10000000), // 100000.00 in minor units
      liab: BigInt(5000000),    // 50000.00
      equity: BigInt(5000000),  // 50000.00
    } as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null as never);

    const req = new NextRequest("http://localhost/api/finance/reports/balance-sheet");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 }) as never
    );

    const req = new NextRequest("http://localhost/api/finance/reports/balance-sheet");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns balance sheet with default date (today)", async () => {
    const req = new NextRequest("http://localhost/api/finance/reports/balance-sheet");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.assets).toBe(100000);
    expect(data.liabilities).toBe(50000);
    expect(data.equity).toBe(50000);
    expect(data.asOf).toBeDefined();
  });

  it("returns balance sheet for specific asOf date", async () => {
    const req = new NextRequest("http://localhost/api/finance/reports/balance-sheet?asOf=2025-12-31");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(balanceSheet).toHaveBeenCalled();
    // Verify asOf parameter was passed to the service
    const callArgs = vi.mocked(balanceSheet).mock.calls[0];
    expect(callArgs).toBeDefined();
    // The service should receive a Date object for asOf
    const asOfArg = callArgs?.[1];
    // Assert type first, then value - fail explicitly if not a Date
    expect(asOfArg).toBeInstanceOf(Date);
    expect((asOfArg as Date).toISOString().startsWith("2025-12-31")).toBe(true);
  });

  it("verifies permission check is called", async () => {
    const req = new NextRequest("http://localhost/api/finance/reports/balance-sheet");
    const { GET } = await importRoute();
    await GET(req);

    expect(requirePermission).toHaveBeenCalledWith("FINANCE", "finance.reports.balance-sheet");
  });

  it("handles zero balances correctly", async () => {
    vi.mocked(balanceSheet).mockResolvedValue({
      assets: BigInt(0),
      liab: BigInt(0),
      equity: BigInt(0),
    } as never);

    const req = new NextRequest("http://localhost/api/finance/reports/balance-sheet");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.assets).toBe(0);
    expect(data.liabilities).toBe(0);
    expect(data.equity).toBe(0);
  });

  it("handles large monetary values correctly", async () => {
    // 10 million SAR in minor units (halalas)
    vi.mocked(balanceSheet).mockResolvedValue({
      assets: BigInt(1000000000), // 10,000,000.00
      liab: BigInt(400000000),    // 4,000,000.00
      equity: BigInt(600000000),  // 6,000,000.00
    } as never);

    const req = new NextRequest("http://localhost/api/finance/reports/balance-sheet");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.assets).toBe(10000000);
    expect(data.liabilities).toBe(4000000);
    expect(data.equity).toBe(6000000);
  });
});
