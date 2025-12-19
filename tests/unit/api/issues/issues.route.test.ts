/**
 * Tests for Issues API routes
 * @module tests/unit/api/issues/issues.route.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock mongoose before everything else
vi.mock("mongoose", () => ({
  default: {
    Types: {
      ObjectId: class {
        constructor(id: string) {
          return id;
        }
      },
    },
    connect: vi.fn(),
  },
  Types: {
    ObjectId: class {
      constructor(id: string) {
        return id;
      }
    },
  },
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

// Mock superadmin session
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock parse body
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({
    data: {
      title: "Test Issue",
      description: "Test description",
      category: "bug",
      priority: "P1",
      effort: "M",
      location: { filePath: "/test/file.ts" },
      module: "auth",
      action: "Fix the bug",
      definitionOfDone: "Bug is fixed",
    },
    error: null,
  }),
}));

// Mock Issue model
const mockIssues = [
  {
    _id: "issue-1",
    title: "Test Issue 1",
    status: "OPEN",
    priority: "P1_HIGH",
    orgId: "org-123",
  },
];

const findMock = vi.fn().mockReturnValue({
  sort: vi.fn().mockReturnValue({
    skip: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockIssues),
      }),
    }),
  }),
});

const countDocumentsMock = vi.fn().mockResolvedValue(1);
const saveMock = vi.fn().mockResolvedValue({
  _id: "new-issue-1",
  title: "Test Issue",
  status: "OPEN",
  orgId: "org-123",
});
const getStatsMock = vi.fn().mockResolvedValue({
  total: 10,
  open: 5,
  inProgress: 3,
  completed: 2,
});
const findDuplicatesMock = vi.fn().mockResolvedValue([]);
const findByIdAndUpdateMock = vi.fn().mockResolvedValue(null);
const generateIssueIdMock = vi.fn().mockResolvedValue("ISSUE-123");

const IssueMock = vi.fn().mockImplementation((data) => ({
  ...data,
  save: saveMock,
}));

vi.mock("@/server/models/Issue", () => ({
  Issue: Object.assign(IssueMock, {
    find: findMock,
    countDocuments: countDocumentsMock,
    getStats: getStatsMock,
    findDuplicates: findDuplicatesMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
    generateIssueId: generateIssueIdMock,
  }),
  IssueCategory: {
    BUG: "bug",
    LOGIC_ERROR: "logic_error",
    MISSING_TEST: "missing_test",
    EFFICIENCY: "efficiency",
    SECURITY: "security",
    FEATURE: "feature",
    REFACTOR: "refactor",
    DOCUMENTATION: "documentation",
    NEXT_STEP: "next_step",
  },
  IssuePriority: {
    P0_CRITICAL: "P0",
    P1_HIGH: "P1",
    P2_MEDIUM: "P2",
    P3_LOW: "P3",
  },
  IssueStatus: {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    IN_REVIEW: "in_review",
    BLOCKED: "blocked",
    RESOLVED: "resolved",
    CLOSED: "closed",
    WONT_FIX: "wont_fix",
  },
  IssueEffort: {
    XS: "XS",
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
  },
  IssueSource: {
    MANUAL: "manual",
    AUDIT: "audit",
    CI_CD: "ci_cd",
    USER_REPORT: "user_report",
    AUTOMATED_SCAN: "automated_scan",
    CODE_REVIEW: "code_review",
    MONITORING: "monitoring",
    IMPORT: "import",
  },
}));

describe("Issues API Route", () => {
  let GET: typeof import("@/app/api/issues/route").GET;
  let POST: typeof import("@/app/api/issues/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import("@/app/api/issues/route");
    GET = routeModule.GET;
    POST = routeModule.POST;
  });

  describe("GET /api/issues", () => {
    it("returns 401 when not authenticated", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce({
        ok: true,
        session: null,
      } as any);

      const req = {
        url: "http://localhost:3000/api/issues",
      } as any;

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when role is not allowed", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "guest", orgId: "org-123" },
      } as any);

      const req = {
        url: "http://localhost:3000/api/issues",
      } as any;

      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("returns issues with pagination", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);

      const req = {
        url: "http://localhost:3000/api/issues?page=1&limit=10",
      } as any;

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
    });

    it("filters by status", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);

      const req = {
        url: "http://localhost:3000/api/issues?status=OPEN",
      } as any;

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(findMock).toHaveBeenCalled();
    });

    it("filters by priority", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);

      const req = {
        url: "http://localhost:3000/api/issues?priority=P1_HIGH",
      } as any;

      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("filters for quick wins", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);

      const req = {
        url: "http://localhost:3000/api/issues?quickWins=true",
      } as any;

      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/issues", () => {
    it("returns 401 when not authenticated", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce({
        ok: true,
        session: null,
      } as any);

      const req = {} as any;
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when role is not allowed", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce({
        ok: true,
        session: { id: "user-1", role: "viewer", orgId: "org-123" },
      } as any);

      const req = {} as any;
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("creates issue with valid data", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);

      const req = {} as any;
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(IssueMock).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
    });

    it("returns 400 when body parsing fails", async () => {
      const { getSessionOrNull } = await import("@/lib/auth/safe-session");
      vi.mocked(getSessionOrNull).mockResolvedValueOnce(mockSession as any);

      const { parseBodySafe } = await import("@/lib/api/parse-body");
      vi.mocked(parseBodySafe).mockResolvedValueOnce({
        data: null,
        error: "Invalid JSON",
      } as any);

      const req = {} as any;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
