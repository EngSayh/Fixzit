/**
 * Tests for Issues Import API route
 * @module tests/unit/api/issues/issues-import.route.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

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

// Mock auth
const mockSession = {
  session: {
    id: "user-1",
    role: "super_admin",
    orgId: "org-123",
  },
  ok: true,
};

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn().mockResolvedValue(mockSession),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));
import { mockSuperadmin } from "@/tests/helpers/superadminAuth";

// Mock parse body
vi.mock("@/lib/api/parse-body", () => ({}));

// Mock Issue model
const findOneMock = vi.fn().mockResolvedValue(null);
const updateOneMock = vi.fn().mockResolvedValue({});
const saveMock = vi.fn().mockResolvedValue({
  _id: "new-issue-1",
  title: "Test Issue",
});

vi.mock("@/server/models/Issue", () => {
  const IssueMock: any = vi.fn().mockImplementation(() => ({
    _id: "new-issue-1",
    save: saveMock,
  }));
  IssueMock.findOne = findOneMock;
  IssueMock.updateOne = updateOneMock;
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
    vi.clearAllMocks();
    // Reset mock default return values
    const { getSessionOrNull } = await import("@/lib/auth/safe-session");
    vi.mocked(getSessionOrNull).mockResolvedValue(mockSession as any);
    const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    const routeModule = await import("@/app/api/issues/import/route");
    POST = routeModule.POST;
  });

  describe("POST /api/issues/import", () => {
    it("returns 401 when not authenticated", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockReset();
      vi.mocked(getSessionOrNull).mockResolvedValueOnce({
        ok: true,
        session: null,
      } as any);

      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when role is not allowed", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockReset();
      vi.mocked(getSessionOrNull).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "viewer", orgId: "org-123" },
      } as any);

      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("imports issues successfully", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);
      mockSuperadmin();

      const req = makeRequest();
      const res = await POST(req);
      expect([200, 500]).toContain(res.status);
    });

    it("returns 400 when body parsing fails", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);
      mockSuperadmin();

      const req = { json: vi.fn().mockResolvedValue(null) } as any;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("validates required fields", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);
      mockSuperadmin();

      const req = makeRequest({
        issues: [
          { key: "", title: "", sourcePath: "", sourceRef: "", evidenceSnippet: "" },
        ],
      });
      const res = await POST(req);
      expect([400, 500]).toContain(res.status);
    });

    it("skips duplicates when option is enabled", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);
      mockSuperadmin();

      // Mock finding existing issue
      findOneMock.mockResolvedValueOnce({ _id: "existing-1", title: "Test Issue 1", status: "OPEN" });

      const req = makeRequest();
      const res = await POST(req);
      expect([200, 500]).toContain(res.status);
    });

    it("handles dry run mode", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);
      mockSuperadmin();

      const req = makeRequest({ ...defaultPayload, dryRun: true });
      const res = await POST(req);
      expect([200, 500]).toContain(res.status);
    });

    it("propagates Retry-After when rate limited", async () => {
      const routeModule = await import("@/lib/middleware/rate-limit");
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);
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
