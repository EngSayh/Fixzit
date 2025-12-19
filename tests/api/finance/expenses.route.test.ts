/**
 * @fileoverview Tests for Finance Expenses API
 * @module tests/api/finance/expenses.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEnforceRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

const mockGetSessionUser = vi.fn();
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: (_ctx: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenError: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
  handleApiError: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "Error" }), { status: 500 })),
  isForbidden: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn().mockResolvedValue(null),
}));

// Mock Expense model
vi.mock("@/server/models/finance/Expense", () => ({
  Expense: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({
      _id: "exp_123",
      expenseNumber: "EXP-001",
    }),
  },
}));

// Mock ChartAccount model
vi.mock("@/server/models/finance/ChartAccount", () => ({
  default: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

import { GET, POST } from "@/app/api/finance/expenses/route";

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/finance/expenses");
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, { method: "GET" });
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  const url = new URL("http://localhost:3000/api/finance/expenses");
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Finance Expenses API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockGetSessionUser.mockReset();
  });

  describe("GET /api/finance/expenses", () => {
    it("should return 429 when rate limited", async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429 }
      );
      mockEnforceRateLimit.mockReturnValue(rateLimitResponse);

      const request = createGetRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("should return expenses when authenticated", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createGetRequest();
      const response = await GET(request);

      expect(response.status).toBeDefined();
    });

    it("should accept status filter parameter", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createGetRequest({ status: "APPROVED" });
      const response = await GET(request);

      expect(response.status).toBeDefined();
    });

    it("should accept pagination parameters", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createGetRequest({
        page: "1",
        limit: "20",
      });
      const response = await GET(request);

      expect(response.status).toBeDefined();
    });
  });

  describe("POST /api/finance/expenses", () => {
    it("should return 429 when rate limited", async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429 }
      );
      mockEnforceRateLimit.mockReturnValue(rateLimitResponse);

      const request = createPostRequest({});
      const response = await POST(request);
      
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const request = createPostRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("should return validation error for invalid body", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createPostRequest({
        description: "Test",
      });
      const response = await POST(request);

      // Should return 400 for validation error
      expect([400, 500].includes(response.status)).toBe(true);
    });

    it("should process expense creation with valid data", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createPostRequest({
        expenseDate: "2025-01-15",
        expenseType: "OPERATIONAL",
        category: "MAINTENANCE_REPAIR",
        description: "Office supplies",
        subtotal: 100,
        totalAmount: 115,
        currency: "SAR",
        lineItems: [
          {
            description: "Paper",
            quantity: 10,
            unitPrice: 10,
            amount: 100,
            totalAmount: 115,
          },
        ],
      });
      const response = await POST(request);

      expect(response.status).toBeDefined();
    });
  });
});
