/**
 * @fileoverview Tests for /api/finance/accounts routes
 * Tests Chart of Accounts management with hierarchical structure
 * FINANCIAL TAG: Critical for accounting structure and double-entry bookkeeping
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

// Mock API parsing
vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn(),
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

// Mock ChartAccount model
vi.mock("@/server/models/finance/ChartAccount", () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    findOne: vi.fn(),
  },
}));

// Mock error responses
vi.mock("@/server/utils/errorResponses", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/utils/errorResponses")>();
  return {
    ...actual,
    forbiddenError: vi.fn(() => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })),
    unauthorizedError: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
  };
});

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { requirePermission } from "@/config/rbac.config";
import { parseBodyOrNull } from "@/lib/api/parse-body";
import ChartAccount from "@/server/models/finance/ChartAccount";

const importRoute = () => import("@/app/api/finance/accounts/route");

describe("API /api/finance/accounts", () => {
  const mockOrgId = "507f1f77bcf86cd799439011";
  const mockUser = {
    id: "507f1f77bcf86cd799439012",
    orgId: mockOrgId,
    role: "FINANCE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(requirePermission).mockReturnValue(undefined);
    vi.mocked(ChartAccount.findOne).mockResolvedValue(null as never);
    vi.mocked(parseBodyOrNull).mockResolvedValue(null as never);
  });

  describe("GET - List Chart of Accounts", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/finance/accounts");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/finance/accounts");
      const response = await route.GET(req);

      expect(response.status).toBe(401);
    });

    it("returns accounts list with org_id scope", async () => {
      const route = await importRoute();

      const mockAccounts = [
        { _id: "acc_1", accountCode: "1000", accountName: "Cash", org_id: mockOrgId },
        { _id: "acc_2", accountCode: "2000", accountName: "Accounts Payable", org_id: mockOrgId },
      ];

      vi.mocked(ChartAccount.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockAccounts),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/finance/accounts");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe("POST - Create Account", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/finance/accounts", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/finance/accounts", {
        method: "POST",
        body: JSON.stringify({
          accountCode: "1100",
          accountName: "Checking Account",
          accountType: "ASSET",
          normalBalance: "DEBIT",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid account type", async () => {
      const route = await importRoute();

      vi.mocked(parseBodyOrNull).mockResolvedValue({
        accountCode: "1100",
        accountName: "Checking Account",
        accountType: "INVALID_TYPE",
        normalBalance: "DEBIT",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/finance/accounts", {
        method: "POST",
        body: JSON.stringify({
          accountCode: "1100",
          accountName: "Checking Account",
          accountType: "INVALID_TYPE",
          normalBalance: "DEBIT",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
    });

    it("creates account with org_id scope", async () => {
      const route = await importRoute();

      const mockCreatedAccount = {
        _id: "acc_new",
        accountCode: "1100",
        accountName: "Checking Account",
        accountType: "ASSET",
        normalBalance: "DEBIT",
        org_id: mockOrgId,
      };

      vi.mocked(parseBodyOrNull).mockResolvedValue({
        accountCode: "1100",
        accountName: "Checking Account",
        accountType: "ASSET",
        normalBalance: "DEBIT",
      } as never);

      vi.mocked(ChartAccount.create).mockResolvedValue(mockCreatedAccount as never);

      const req = new NextRequest("http://localhost:3000/api/finance/accounts", {
        method: "POST",
        body: JSON.stringify({
          accountCode: "1100",
          accountName: "Checking Account",
          accountType: "ASSET",
          normalBalance: "DEBIT",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
