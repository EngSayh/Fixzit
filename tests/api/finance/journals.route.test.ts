/**
 * @fileoverview Tests for /api/finance/journals route
 * Tests journal entry CRUD operations, validation, and posting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  email?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;

// Mock auth
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => sessionUser),
}));

// Mock authContext
vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn(async (_ctx, fn) => fn()),
}));

// Mock RBAC
vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn((role, perm) => {
    if (role !== "FINANCE_MANAGER" && role !== "SUPER_ADMIN") {
      const error = new Error("Forbidden");
      (error as any).statusCode = 403;
      throw error;
    }
  }),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock Journal model
const mockJournals = [
  {
    _id: "jrn-1",
    orgId: "org-123",
    date: new Date("2025-12-15"),
    description: "Monthly rent collection",
    status: "POSTED",
    lines: [
      { accountId: "acc-1", debit: 10000_00, credit: 0, description: "Cash" },
      { accountId: "acc-2", debit: 0, credit: 10000_00, description: "Revenue" },
    ],
    totalDebit: 10000_00,
    totalCredit: 10000_00,
  },
];

vi.mock("@/server/models/finance/Journal", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockJournals),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({
      _id: "jrn-new",
      orgId: "org-123",
      status: "DRAFT",
      lines: [],
    }),
  },
}));

// Mock posting service
vi.mock("@/server/services/finance/postingService", () => ({
  default: {
    validateJournal: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
  },
}));

import { GET, POST } from "@/app/api/finance/journals/route";

describe("API /api/finance/journals", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
  });

  describe("GET - List Journals", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/journals");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks FINANCE permission", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "user@test.com",
        role: "PROPERTY_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/journals");
      
      await expect(GET(req)).rejects.toThrow("Forbidden");
    });

    it("returns paginated journals when authenticated", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/journals");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.journals).toBeDefined();
      expect(Array.isArray(data.journals)).toBe(true);
      expect(data.total).toBe(1);
    });

    it("accepts status filter", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/journals?status=POSTED"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("accepts date range filters", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/journals?startDate=2025-12-01&endDate=2025-12-31"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports pagination", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/finance/journals?page=2&limit=25"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST - Create Journal", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-12-15",
          description: "Test journal",
          lines: [],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks FINANCE permission", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "user@test.com",
        role: "PROPERTY_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-12-15",
          description: "Test journal",
          lines: [],
        }),
      });
      
      await expect(POST(req)).rejects.toThrow("Forbidden");
    });

    it("creates draft journal when valid", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-12-15",
          description: "Test journal entry",
          sourceType: "MANUAL",
          lines: [
            {
              accountId: "acc-1",
              description: "Cash",
              debit: 10000_00,
              credit: 0,
            },
            {
              accountId: "acc-2",
              description: "Revenue",
              debit: 0,
              credit: 10000_00,
            },
          ],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.journal).toBeDefined();
      expect(data.journal.status).toBe("DRAFT");
    });

    it("validates journal entry balances", async () => {
      const postingService = (await import("@/server/services/finance/postingService")).default;
      vi.mocked(postingService.validateJournal).mockReturnValueOnce({
        isValid: false,
        errors: ["Debits and credits must balance"],
      });

      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-12-15",
          description: "Unbalanced entry",
          lines: [
            { accountId: "acc-1", debit: 10000_00, credit: 0, description: "Cash" },
            { accountId: "acc-2", debit: 0, credit: 5000_00, description: "Revenue" },
          ],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("requires at least 2 lines", async () => {
      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-12-15",
          description: "Invalid entry",
          lines: [
            { accountId: "acc-1", debit: 10000_00, credit: 0, description: "Cash" },
          ],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("enforces rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      sessionUser = {
        id: "user-123",
        orgId: "org-123",
        email: "finance@test.com",
        role: "FINANCE_MANAGER",
      };

      const req = new NextRequest("http://localhost:3000/api/finance/journals", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-12-15",
          description: "Test",
          lines: [],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });
});
