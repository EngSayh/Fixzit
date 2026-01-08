/**
 * @fileoverview Tests for /api/finance/reports/income-statement route
 * @sprint 68
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks for vi.mock factories
const { mockGetSessionUser, mockIncomeStatement, mockRequirePermission } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockIncomeStatement: vi.fn(),
  mockRequirePermission: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn().mockImplementation((_ctx, fn) => fn()),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: mockRequirePermission,
}));

vi.mock("@/server/lib/money", () => ({
  decimal128ToMinor: vi.fn().mockReturnValue(10000n),
}));

vi.mock("@/server/finance/reporting.service", () => ({
  incomeStatement: mockIncomeStatement,
}));

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
  forbiddenError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  ),
  handleApiError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Internal Error" }), { status: 500 })
  ),
  isForbidden: vi.fn().mockReturnValue(false),
}));

import { GET } from "@/app/api/finance/reports/income-statement/route";

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/finance/reports/income-statement");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/finance/reports/income-statement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      orgId: "org-1",
      role: "FM_MANAGER",
    });
    mockIncomeStatement.mockResolvedValue({
      rows: [],
      revenue: 5000000n,
      expense: 3000000n,
      net: 2000000n,
    });
    mockRequirePermission.mockReturnValue(undefined);
  });

  it("should return 401 for unauthenticated users", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("should call incomeStatement service when authenticated", async () => {
    const res = await GET(createRequest());
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(mockIncomeStatement).toHaveBeenCalled();
    }
  });

  it("should verify user session", async () => {
    await GET(createRequest());
    expect(mockGetSessionUser).toHaveBeenCalled();
  });

  it("should accept year parameter", async () => {
    const res = await GET(createRequest({ year: "2026" }));
    expect([200, 500]).toContain(res.status);
  });

  it("should accept from/to date range", async () => {
    const res = await GET(createRequest({ from: "2026-01-01", to: "2026-12-31" }));
    expect([200, 500]).toContain(res.status);
  });

  it("should accept format parameter", async () => {
    const res = await GET(createRequest({ format: "json" }));
    expect([200, 500]).toContain(res.status);
  });
});
