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
import { Types } from "mongoose";

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

const mockFinanceUser = {
  id: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role: "FINANCE_MANAGER",
  permissions: ["finance.reports.owner-statement"],
};

// Mock data matching the actual service response format
const mockOwnerStatementData = {
  propertyId: TEST_PROPERTY_ID,
  from: new Date("2024-01-01"),
  to: new Date("2024-01-31"),
  opening: 0n, // bigint opening balance
  charges: 5300n, // Revenue credits (in minor units scaled by route)
  receipts: 1000n, // Asset receipts
  ending: 6300n, // opening + charges + receipts
  lines: [
    {
      accountId: new Types.ObjectId(),
      code: "4001",
      accountCode: "4001",
      name: "Rental Income",
      accountName: "Rental Income",
      type: "REVENUE",
      debit: Types.Decimal128.fromString("0"),
      credit: Types.Decimal128.fromString("5300"),
    },
    {
      accountId: new Types.ObjectId(),
      code: "1101",
      accountCode: "1101",
      name: "Cash",
      accountName: "Cash",
      type: "ASSET",
      debit: Types.Decimal128.fromString("1000"),
      credit: Types.Decimal128.fromString("0"),
    },
  ],
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
    expect(data.error).toContain("Authentication required");
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
    expect(data.opening).toBeDefined();
    expect(data.charges).toBeDefined();
    expect(data.receipts).toBeDefined();
    expect(data.ending).toBeDefined();
    expect(data.lines).toBeDefined();
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
    // ownerStatement is called with context, propertyId, from, to
    expect(ownerStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: TEST_ORG_ID,
      }),
      TEST_PROPERTY_ID,
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("should include line items with account details", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lines).toBeDefined();
    expect(Array.isArray(data.lines)).toBe(true);
    expect(data.lines.length).toBeGreaterThan(0);
    expect(data.lines[0].accountCode).toBeDefined();
    expect(data.lines[0].accountName).toBeDefined();
  });

  it("should include opening and ending balances", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.opening).toBe("number");
    expect(typeof data.ending).toBe("number");
  });

  it("should include charges and receipts", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.charges).toBe("number");
    expect(typeof data.receipts).toBe("number");
  });

  it("should return date range in response", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (ownerStatement as Mock).mockResolvedValue(mockOwnerStatementData);

    const { GET } = await importRoute();
    const req = createRequest({ propertyId: TEST_PROPERTY_ID });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.from).toBeDefined();
    expect(data.to).toBeDefined();
  });
});
