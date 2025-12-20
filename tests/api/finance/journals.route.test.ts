/**
import { expectAuthFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for /api/finance/journals routes
 * Tests journal entry management for double-entry bookkeeping
 * FINANCIAL TAG: Critical for accurate accounting and ledger posting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

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
    debug: vi.fn(),
  },
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock Journal model
vi.mock("@/server/models/finance/Journal", () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

// Mock posting service
vi.mock("@/server/services/finance/postingService", () => ({
  default: {
    createJournal: vi.fn(),
    postJournal: vi.fn(),
    voidJournal: vi.fn(),
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
import Journal from "@/server/models/finance/Journal";
import postingService from "@/server/services/finance/postingService";
import { ApiError } from "@/server/utils/errorResponses";

const importRoute = () => import("@/app/api/finance/journals/route");

describe("API /api/finance/journals", () => {
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
    vi.mocked(Journal.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(Journal.countDocuments).mockResolvedValue(0 as never);
    vi.mocked(postingService.createJournal).mockResolvedValue({
      _id: "jnl_default",
      status: "DRAFT",
      org_id: mockOrgId,
    } as never);
  });

  describe("GET - List Journal Entries", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/finance/journals");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/finance/journals");
      const response = await route.GET(req);

      expectAuthFailure(response);
    });

    it("returns journals list with org_id scope", async () => {
      const route = await importRoute();

      const mockJournals = [
        {
          _id: "jnl_1",
          date: new Date(),
          description: "Test Journal",
          status: "DRAFT",
          org_id: mockOrgId,
          lines: [
            { accountId: "acc_1", debit: 100, credit: 0 },
            { accountId: "acc_2", debit: 0, credit: 100 },
          ],
        },
      ];

      vi.mocked(Journal.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockJournals),
      } as never);

      vi.mocked(Journal.countDocuments).mockResolvedValue(1 as never);

      const req = new NextRequest("http://localhost:3000/api/finance/journals");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("filters journals by status", async () => {
      const route = await importRoute();

      vi.mocked(Journal.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.mocked(Journal.countDocuments).mockResolvedValue(0 as never);

      const req = new NextRequest("http://localhost:3000/api/finance/journals?status=POSTED");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
    });
  });

  describe("POST - Create Journal Entry", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: new Date().toISOString(),
          description: "Test Journal",
          lines: [
            { accountId: "507f1f77bcf86cd799439011", description: "Debit", debit: 100 },
            { accountId: "507f1f77bcf86cd799439012", description: "Credit", credit: 100 },
          ],
        }),
      });
      const response = await route.POST(req);

      expectAuthFailure(response);
    });

    it("requires balanced journal entry (debits = credits)", async () => {
      const route = await importRoute();

      vi.mocked(postingService.createJournal).mockRejectedValueOnce(
        new ApiError("Journal entries must balance", 400, "VALIDATION_ERROR") as never,
      );

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: new Date().toISOString(),
          description: "Unbalanced Journal",
          lines: [
            { accountId: "507f1f77bcf86cd799439011", description: "Debit", debit: 100 },
            { accountId: "507f1f77bcf86cd799439012", description: "Credit", credit: 50 },
          ],
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
    });

    it("creates journal entry with org_id scope", async () => {
      const route = await importRoute();

      const mockCreatedJournal = {
        _id: "jnl_new",
        date: new Date(),
        description: "Test Journal",
        status: "DRAFT",
        org_id: mockOrgId,
        lines: [
          { accountId: "507f1f77bcf86cd799439011", debit: 100, credit: 0 },
          { accountId: "507f1f77bcf86cd799439012", debit: 0, credit: 100 },
        ],
      };

      vi.mocked(postingService.createJournal).mockResolvedValueOnce(
        mockCreatedJournal as never,
      );

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: new Date().toISOString(),
          description: "Test Journal",
          lines: [
            { accountId: "507f1f77bcf86cd799439011", description: "Debit", debit: 100 },
            { accountId: "507f1f77bcf86cd799439012", description: "Credit", credit: 100 },
          ],
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
