/**
 * @fileoverview Tests for /api/finance/reports/income-statement route
 * Tests income statement (P&L) report generation with date filtering
 * FINANCIAL TAG: Critical for accounting reports and compliance
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

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

// Mock income statement service
vi.mock("@/server/finance/reporting.service", () => ({
  incomeStatement: vi.fn(),
}));

// Mock money utilities
vi.mock("@/server/lib/money", () => ({
  decimal128ToMinor: vi.fn((val) => BigInt(val?.toString() || "0")),
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
import { incomeStatement } from "@/server/finance/reporting.service";

const importRoute = () => import("@/app/api/finance/reports/income-statement/route");

describe("GET /api/finance/reports/income-statement", () => {
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
    // Mock data must match the service return format: { revenue, expense, net, rows }
    vi.mocked(incomeStatement).mockResolvedValue({
      revenue: 50000000n,  // 500,000.00 in minor units (bigint)
      expense: 30000000n,  // 300,000.00
      net: 20000000n,      // 200,000.00
      rows: [
        {
          accountId: new Types.ObjectId(),
          code: "4001",
          accountCode: "4001",
          name: "Revenue",
          accountName: "Revenue",
          type: "REVENUE",
          debit: Types.Decimal128.fromString("0"),
          credit: Types.Decimal128.fromString("50000000"),
        },
        {
          accountId: new Types.ObjectId(),
          code: "5001",
          accountCode: "5001",
          name: "Expenses",
          accountName: "Expenses",
          type: "EXPENSE",
          debit: Types.Decimal128.fromString("30000000"),
          credit: Types.Decimal128.fromString("0"),
        },
      ],
    } as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null as never);

    const req = new NextRequest("http://localhost/api/finance/reports/income-statement");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/finance/reports/income-statement");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns income statement with default year", async () => {
    const req = new NextRequest("http://localhost/api/finance/reports/income-statement");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(incomeStatement).toHaveBeenCalled();
  });

  it("returns income statement for specific year", async () => {
    const req = new NextRequest("http://localhost/api/finance/reports/income-statement?year=2024");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(incomeStatement).toHaveBeenCalled();
  });

  it("returns income statement for date range", async () => {
    const req = new NextRequest("http://localhost/api/finance/reports/income-statement?from=2025-01-01&to=2025-06-30");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(incomeStatement).toHaveBeenCalled();
  });

  it("verifies permission check is called", async () => {
    const req = new NextRequest("http://localhost/api/finance/reports/income-statement");
    const { GET } = await importRoute();
    await GET(req);

    expect(requirePermission).toHaveBeenCalledWith("FINANCE", "finance.reports.income-statement");
  });

  it("handles zero revenue and expenses correctly", async () => {
    vi.mocked(incomeStatement).mockResolvedValue({
      revenue: 0n,
      expense: 0n,
      net: 0n,
      rows: [],
    } as never);

    const req = new NextRequest("http://localhost/api/finance/reports/income-statement");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it("handles negative net income (loss) correctly", async () => {
    vi.mocked(incomeStatement).mockResolvedValue({
      revenue: 20000000n,   // 200,000.00
      expense: 30000000n,   // 300,000.00
      net: -10000000n,      // -100,000.00 (loss)
      rows: [],
    } as never);

    const req = new NextRequest("http://localhost/api/finance/reports/income-statement");
    const { GET } = await importRoute();
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
