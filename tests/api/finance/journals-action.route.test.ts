/**
 * @fileoverview Tests for Finance Journal Action Routes
 * Routes: POST /api/finance/journals/[id]/post
 *         POST /api/finance/journals/[id]/void
 *
 * Coverage:
 * - Authentication (401)
 * - Authorization (FINANCE:POST, FINANCE:VOID permissions)
 * - Rate limiting (429)
 * - Status validation (draft->post, posted->void)
 * - Audit trail for void operations
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

vi.mock("@/server/models/finance/Journal", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/server/services/finance/postingService", () => ({
  default: {
    postJournal: vi.fn(),
    voidJournal: vi.fn(),
  },
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

// ============================================================================
// IMPORTS
// ============================================================================

import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import Journal from "@/server/models/finance/Journal";
import postingService from "@/server/services/finance/postingService";

// Dynamic imports to ensure mocks are applied
const importPostRoute = () => import("@/app/api/finance/journals/[id]/post/route");
const importVoidRoute = () => import("@/app/api/finance/journals/[id]/void/route");

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_ORG_ID = new Types.ObjectId().toString();
const TEST_USER_ID = new Types.ObjectId().toString();
const TEST_JOURNAL_ID = new Types.ObjectId().toString();

const mockFinanceUser = {
  id: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role: "FINANCE",
};

const mockDraftJournal = {
  _id: TEST_JOURNAL_ID,
  orgId: TEST_ORG_ID,
  status: "DRAFT",
  number: "JE-2024-001",
  date: new Date("2024-01-15"),
  description: "Test journal entry",
  lines: [
    { accountId: "acc1", debit: 1000, credit: 0 },
    { accountId: "acc2", debit: 0, credit: 1000 },
  ],
};

const mockPostedJournal = {
  ...mockDraftJournal,
  status: "POSTED",
  postedAt: new Date(),
  postedBy: TEST_USER_ID,
};

const mockNoPermissionUser = {
  id: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role: "VIEWER",
  permissions: [], // No finance permissions
};

// ============================================================================
// HELPERS
// ============================================================================

function createRequest(
  endpoint: "post" | "void",
  body?: Record<string, unknown>,
): NextRequest {
  const url = `http://localhost:3000/api/finance/journals/${TEST_JOURNAL_ID}/${endpoint}`;
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

function createRouteContext(journalId: string = TEST_JOURNAL_ID) {
  return {
    params: Promise.resolve({ id: journalId }),
  };
}

// ============================================================================
// TESTS: POST /api/finance/journals/[id]/post
// ============================================================================

describe("POST /api/finance/journals/[id]/post", () => {
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

    const { POST } = await importPostRoute();
    const req = createRequest("post");
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(429);
  });

  it("should return 401 when not authenticated", async () => {
    (getSessionUser as Mock).mockResolvedValue(null);

    const { POST } = await importPostRoute();
    const req = createRequest("post");
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Authentication");
  });

  it("should return 403 when user lacks FINANCE:POST permission", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockNoPermissionUser);

    const { POST } = await importPostRoute();
    const req = createRequest("post");
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Access denied");
  });

  it("should return 404 when journal not found", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (Journal.findOne as Mock).mockResolvedValue(null);

    const { POST } = await importPostRoute();
    const req = createRequest("post");
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("not found");
  });

  it("should return 409 when journal is not in DRAFT status", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (Journal.findOne as Mock).mockResolvedValue(mockPostedJournal);

    const { POST } = await importPostRoute();
    const req = createRequest("post");
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("DRAFT");
  });

  it("should post journal successfully", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (Journal.findOne as Mock).mockResolvedValue(mockDraftJournal);
    (postingService.postJournal as Mock).mockResolvedValue({
      journal: mockPostedJournal,
      ledgerEntries: [{ _id: "ledger1" }, { _id: "ledger2" }],
    });

    const { POST } = await importPostRoute();
    const req = createRequest("post");
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.journal).toBeDefined();
    const [postedJournalId] = (postingService.postJournal as Mock).mock.calls[0];
    expect(postedJournalId.toString()).toBe(TEST_JOURNAL_ID);
  });
});

// ============================================================================
// TESTS: POST /api/finance/journals/[id]/void
// ============================================================================

describe("POST /api/finance/journals/[id]/void", () => {
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

    const { POST } = await importVoidRoute();
    const req = createRequest("void", { reason: "Error correction" });
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(429);
  });

  it("should return 401 when not authenticated", async () => {
    (getSessionUser as Mock).mockResolvedValue(null);

    const { POST } = await importVoidRoute();
    const req = createRequest("void", { reason: "Error correction" });
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("should return 403 when user lacks FINANCE:VOID permission", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockNoPermissionUser);

    const { POST } = await importVoidRoute();
    const req = createRequest("void", { reason: "Error correction" });
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Access denied");
  });

  it("should return 400 when void reason is missing", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);

    const { POST } = await importVoidRoute();
    const req = createRequest("void", {});
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Validation");
  });

  it("should return 404 when journal not found", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (Journal.findOne as Mock).mockResolvedValue(null);

    const { POST } = await importVoidRoute();
    const req = createRequest("void", { reason: "Error correction" });
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(404);
  });

  it("should return 409 when journal is not in POSTED status", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (Journal.findOne as Mock).mockResolvedValue(mockDraftJournal); // DRAFT, not POSTED

    const { POST } = await importVoidRoute();
    const req = createRequest("void", { reason: "Error correction" });
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("POSTED");
  });

  it("should void journal with reversal entries", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (Journal.findOne as Mock).mockResolvedValue(mockPostedJournal);

    const voidedJournal = { ...mockPostedJournal, status: "VOIDED" };
    const reversalJournal = {
      _id: new Types.ObjectId().toString(),
      status: "POSTED",
      description: "Reversal of JE-2024-001",
    };

    (postingService.voidJournal as Mock).mockResolvedValue({
      originalJournal: voidedJournal,
      reversingJournal: reversalJournal,
    });

    const { POST } = await importVoidRoute();
    const req = createRequest("void", { reason: "Duplicate entry correction" });
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.originalJournal.status).toBe("VOIDED");
    expect(data.data.reversingJournal).toBeDefined();
    const [voidJournalId, voidUserId, voidReason] = (postingService.voidJournal as Mock).mock.calls[0];
    expect(voidJournalId.toString()).toBe(TEST_JOURNAL_ID);
    expect(voidUserId.toString()).toBe(TEST_USER_ID);
    expect(voidReason).toBe("Duplicate entry correction");
  });

  it("should audit void reason for compliance", async () => {
    (getSessionUser as Mock).mockResolvedValue(mockFinanceUser);
    (Journal.findOne as Mock).mockResolvedValue(mockPostedJournal);

    const voidedJournal = {
      ...mockPostedJournal,
      status: "VOIDED",
      voidedAt: new Date(),
      voidedBy: TEST_USER_ID,
      voidReason: "Vendor refund adjustment",
    };

    (postingService.voidJournal as Mock).mockResolvedValue({
      originalJournal: voidedJournal,
      reversingJournal: { _id: "rev1" },
    });

    const { POST } = await importVoidRoute();
    const req = createRequest("void", { reason: "Vendor refund adjustment" });
    const res = await POST(req, createRouteContext());

    expect(res.status).toBe(200);
    expect(postingService.voidJournal).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
      expect.any(Types.ObjectId),
      "Vendor refund adjustment",
    );
  });
});
