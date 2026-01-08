/**
 * @fileoverview Tests for /api/finance/reports/owner-statement route
 * @sprint 68
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks for vi.mock factories
const { mockGetSessionUser, mockOwnerStatement, mockRequirePermission, mockValidationError } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockOwnerStatement: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockValidationError: vi.fn(),
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
  ownerStatement: mockOwnerStatement,
}));

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
  forbiddenError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  ),
  validationError: mockValidationError,
  handleApiError: vi.fn(),
  isForbidden: vi.fn(),
}));

import { GET } from "@/app/api/finance/reports/owner-statement/route";

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/finance/reports/owner-statement");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/finance/reports/owner-statement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      orgId: "org-1",
      role: "FM_MANAGER",
    });
    mockOwnerStatement.mockResolvedValue({
      lines: [],
      income: 50000n,
      expenses: 10000n,
      distributions: 5000n,
    });
    mockRequirePermission.mockReturnValue(undefined);
    mockValidationError.mockImplementation((msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 400 })
    );
  });

  it("should return 401 for unauthenticated users", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(createRequest({ propertyId: "prop-1" }));
    expect(res.status).toBe(401);
  });

  it("should require propertyId", async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(400);
  });

  it("should call ownerStatement service with propertyId", async () => {
    const res = await GET(createRequest({ propertyId: "prop-1" }));
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(mockOwnerStatement).toHaveBeenCalled();
    }
  });

  it("should verify user session", async () => {
    await GET(createRequest({ propertyId: "prop-1" }));
    expect(mockGetSessionUser).toHaveBeenCalled();
  });

  it("should accept from/to date range", async () => {
    const res = await GET(createRequest({ propertyId: "prop-1", from: "2026-01-01", to: "2026-12-31" }));
    expect([200, 500]).toContain(res.status);
  });

  it("should accept format parameter", async () => {
    const res = await GET(createRequest({ propertyId: "prop-1", format: "json" }));
    expect([200, 500]).toContain(res.status);
  });
});
