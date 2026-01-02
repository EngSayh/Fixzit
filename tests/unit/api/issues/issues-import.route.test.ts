/**
 * Tests for Issues Import API route
 * @module tests/unit/api/issues/issues-import.route.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoisted mock state and mock function - must be hoisted to work with vi.mock()
const { mockState, getSessionOrNullMock } = vi.hoisted(() => ({
  mockState: { sessionResult: null as any },
  getSessionOrNullMock: vi.fn(),
}));

// Mock NextResponse
vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      const status = init?.status ?? 200;
      return { status, body, async json() { return body; } };
    },
  },
}));

// Mock mongoose (TG-005: ObjectId constructor and isValidObjectId must work for orgId)
vi.mock("mongoose", () => ({
  default: {
    Types: {
      ObjectId: vi.fn().mockImplementation((id: string) => ({ toString: () => id })),
    },
    isValidObjectId: vi.fn().mockReturnValue(true),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/models/IssueEvent", () => ({
  __esModule: true,
  default: { create: vi.fn().mockResolvedValue({}) },
}));

// Mock auth - use hoisted state so tests can mutate it
const mockSession = {
  session: {
    id: "user-1",
    role: "super_admin",
    orgId: "507f1f77bcf86cd799439011", // Valid MongoDB ObjectId
  },
  ok: true,
};

// Use the hoisted mock function in the vi.mock() factory
vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: getSessionOrNullMock,
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));
import { mockSuperadmin } from "@/tests/helpers/superadminAuth";

// Mock parse body
vi.mock("@/lib/api/parse-body", () => ({}));

// Mock Issue model (TG-005: Complete mock for import success path)
vi.mock("@/server/models/Issue", () => {
  // TG-005: All mocks must be self-contained inside factory (can't reference outer scope)
  const saveMock = vi.fn().mockResolvedValue({
    _id: "new-issue-1",
    title: "Test Issue",
    key: "bug-1",
    issueId: "BUG-0001",
  });

  // TG-005: Issue constructor returns an object with _id and save method
  const IssueMock: any = vi.fn().mockImplementation((data: any) => ({
    _id: "new-issue-1",
    ...data,
    save: saveMock,
  }));

  // TG-005: findOne returns chainable with lean() that resolves to null (no existing issue)
  IssueMock.findOne = vi.fn().mockImplementation(() => ({
    lean: vi.fn().mockResolvedValue(null),
  }));

  IssueMock.updateOne = vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  IssueMock.generateIssueId = vi.fn().mockResolvedValue("BUG-0001");

  return {
    Issue: IssueMock,
  IssueCategory: {
    BUG: "BUG",
    LOGIC_ERROR: "LOGIC_ERROR",
    MISSING_TEST: "MISSING_TEST",
    EFFICIENCY: "EFFICIENCY",
    SECURITY: "SECURITY",
    FEATURE: "FEATURE",
    REFACTOR: "REFACTOR",
    DOCUMENTATION: "DOCUMENTATION",
    NEXT_STEP: "NEXT_STEP",
  },
  IssuePriority: {
    P0_CRITICAL: "P0_CRITICAL",
    P1_HIGH: "P1_HIGH",
    P2_MEDIUM: "P2_MEDIUM",
    P3_LOW: "P3_LOW",
  },
  IssueStatus: {
    OPEN: "OPEN",
    IN_PROGRESS: "IN_PROGRESS",
    IN_REVIEW: "IN_REVIEW",
    BLOCKED: "BLOCKED",
    RESOLVED: "RESOLVED",
    CLOSED: "CLOSED",
    WONT_FIX: "WONT_FIX",
  },
  IssueEffort: {
    XS: "XS",
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
  },
    IssueSource: {
      MANUAL: "MANUAL",
      IMPORT: "IMPORT",
    },
  };
});

const defaultPayload = {
  issues: [
    {
      key: "bug-1",
      title: "Test Issue 1",
      sourcePath: "docs/PENDING_MASTER.md",
      sourceRef: "row1",
      evidenceSnippet: "Sample evidence snippet for testing",
    },
  ],
};

const makeRequest = (body?: any) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? defaultPayload),
  }) as any;

describe("Issues Import API Route", () => {
  let POST: typeof import("@/app/api/issues/import/route").POST;

  beforeEach(async () => {
    // Test hygiene: clear mocks and reset to defaults (no resetModules - preserves static vi.mock())
    vi.clearAllMocks();
    
    // Reset default session state - use the hoisted mock state pattern
    mockState.sessionResult = mockSession;
    getSessionOrNullMock.mockReset();
    getSessionOrNullMock.mockImplementation(() => Promise.resolve(mockState.sessionResult));
    
    // Reset rate limit mock to allow requests
    const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
    vi.mocked(enforceRateLimit).mockReset();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    
    // Reset superadmin session mock
    const { getSuperadminSession } = await import("@/lib/superadmin/auth");
    vi.mocked(getSuperadminSession).mockReset();
    vi.mocked(getSuperadminSession).mockResolvedValue(null);
    
    // Import route (static import since mocks are stable)
    const routeModule = await import("@/app/api/issues/import/route");
    POST = routeModule.POST;
  });

  describe("POST /api/issues/import", () => {
    it("returns 401 when not authenticated", async () => {
      // Override session state for this test
      mockState.sessionResult = { ok: true, session: null };

      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when role is not allowed", async () => {
      // Override session state for this test
      mockState.sessionResult = {
        ok: true,
        session: { id: "user-1", role: "viewer", orgId: "507f1f77bcf86cd799439011" },
      };

      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("imports issues successfully", async () => {
      mockSuperadmin();

      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("returns 400 when body parsing fails", async () => {
      mockSuperadmin();

      const req = { json: vi.fn().mockResolvedValue(null) } as any;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("validates required fields", async () => {
      mockSuperadmin();

      const req = makeRequest({
        issues: [
          { key: "", title: "", sourcePath: "", sourceRef: "", evidenceSnippet: "" },
        ],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("skips duplicates when option is enabled", async () => {
      mockSuperadmin();

      // Mock finding existing issue - use the lean() chainable pattern
      const { Issue } = await import("@/server/models/Issue");
      vi.mocked(Issue.findOne).mockImplementationOnce(() => ({
        lean: vi.fn().mockResolvedValue({
          _id: "existing-1",
          title: "Test Issue 1",
          status: "OPEN",
          externalId: "EXT-001",
          action: "Fix: Test Issue 1",
          location: { filePath: "docs/test.md" },
        }),
      }) as any);

      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("handles dry run mode", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);
      mockSuperadmin();

      const req = makeRequest({ ...defaultPayload, dryRun: true });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("handles dry run mode", async () => {
      mockSuperadmin();

      const req = makeRequest({
        dryRun: true,
        issues: [defaultPayload.issues[0]],
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("propagates Retry-After when rate limited", async () => {
      const routeModule = await import("@/lib/middleware/rate-limit");
      mockSuperadmin();

      const retryResp = new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Retry-After": "60" },
      }) as any;
      vi.mocked(routeModule.enforceRateLimit).mockReturnValue(retryResp);

      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(429);
      expect((res as any).headers?.get?.("Retry-After") || (res as any).headers?.["Retry-After"]).toBeDefined();
    });
  });
});
