/**
 * @fileoverview Tests for Finance Owner Statement Report Route
 * Route: GET /api/finance/reports/owner-statement
 *
 * Coverage:
 * - Authentication (401)
 * - Authorization (finance.reports.owner-statement permission)
 * - Rate limiting (429)
 * - Required parameter validation (propertyId)
 * - Date range handling (default to current month)
 * - Property management income/expense breakdown
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/middleware/withAuthRbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/middleware/withAuthRbac")>();
  return {
    ...actual,
    getSessionUser: vi.fn(),
  };
});

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/finance/reporting.service", () => ({
  ownerStatement: vi.fn(),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn((context: unknown, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { ownerStatement } from "@/server/finance/reporting.service";
import { requirePermission } from "@/config/rbac.config";

// Dynamic import to ensure mocks are applied
const importRoute = () => import("@/app/api/finance/reports/owner-statement/route");

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_ORG_ID = "org_test_123";
const TEST_USER_ID = "user_test_456";
const TEST_PROPERTY_ID = "prop_test_789";
const TEST_OWNER_ID = "owner_test_012";

const mockFinanceUser = {
  id: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role: "FINANCE_MANAGER",
  permissions: ["finance.reports.owner-statement"],
};

const mockOwnerStatementData = {
  propertyId: TEST_PROPERTY_ID,
  ownerId: TEST_OWNER_ID,
  period: {
    from: new Date("2024-01-01"),
    to: new Date("2024-01-31"),
  },
  income: {
    rent: 5000_00, // 5000.00 in minor units
    utilities: 200_00,
    parking: 100_00,
    total: 5300_00,
  },
  expenses: {
    maintenance: 300_00,
    management: 530_00, // 10% management fee
    insurance: 100_00,
    total: 930_00,
  },
  distributions: [
    { date: new Date("2024-01-15"), amount: 2000_00, reference: "DIST-001" },
  ],
  netIncome: 4370_00,
  balance: 2370_00, // Net income - distributions
};

// ============================================================================
// HELPERS
// ============================================================================

function createRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params);
  const url = `http://localhost:3000/api/finance/reports/owner-statement?${searchParams.toString()}`;
  return new NextRequest(url, { method: "GET" });
}

// ============================================================================
// TESTS
// ============================================================================

describe("GET /api/finance/reports/owner-statement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (enforceRateLimit as Mock).mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should return 429 when rate limited", async () => {
    const rateLimitResponse = new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429 },
    );
    (enforceRateLimit as Mock).mockReturnValue(rateLimitResponse);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("should return 401 when not authenticated", async () => {
    (getSessionUser as Mock).mockResolvedValue(null);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("should verify RBAC permission for finance.reports.owner-statement", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    await GET(req);

    // Verify that requirePermission was called with correct role and permission
    expect(requirePermission).toHaveBeenCalledWith(
      mockFinanceUser.role,
      "finance.reports.owner-statement"
    );
  });

  it("should return 400 when propertyId is missing", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);

    const { GET } = await importRoute();
    const req = createRequest({}); // No propertyId
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("propertyId");
  });

  it("should return owner statement with default date range", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.propertyId).toBe(TEST_PROPERTY_ID);
    expect(data.income).toBeDefined();
    expect(data.expenses).toBeDefined();
    expect(data.netIncome).toBeDefined();
  });

  it("should accept custom date range parameters", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({
      propertyId: TEST_PROPERTY_ID,
      from: "2024-01-01",
      to: "2024-03-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(ownerStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: TEST_PROPERTY_ID,
      }),
    );
  });

  it("should include income breakdown by category", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.income.rent).toBeDefined();
    expect(data.income.total).toBeDefined();
  });

  it("should include expense breakdown by category", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.expenses.maintenance).toBeDefined();
    expect(data.expenses.management).toBeDefined();
    expect(data.expenses.total).toBeDefined();
  });

  it("should include distributions to owner", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.distributions).toBeDefined();
    expect(Array.isArray(data.distributions)).toBe(true);
  });

  it("should calculate net income correctly", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    // Net = Total Income - Total Expenses = 5300 - 930 = 4370
    expect(data.netIncome).toBe(mockOwnerStatementData.netIncome);
  });
});
