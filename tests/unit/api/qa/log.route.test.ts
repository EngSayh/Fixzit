/**
 * Unit tests for api/qa/log route.
 * Validates RBAC, org isolation, input validation, and DB failure handling.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// MOCK STATE - must be declared BEFORE vi.mock calls that reference it
// =============================================================================
const mockState = {
  authResult: null as any,
  authError: null as Error | Response | null,
  dbResult: null as any,
  dbError: null as Error | null,
  indexError: null as Error | null,
};

// =============================================================================
// MOCKS - vi.mock hoists, but factory functions run at import time
// =============================================================================
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(async () => {
    if (mockState.dbError) throw mockState.dbError;
    return mockState.dbResult;
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(async () => {
    if (mockState.authError) throw mockState.authError;
    return mockState.authResult;
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "test-rate-limit-key"),
}));

vi.mock("@/lib/db/collections", () => ({
  ensureQaIndexes: vi.fn(async () => {
    if (mockState.indexError) throw mockState.indexError;
    return undefined;
  }),
}));

// =============================================================================
// IMPORTS - must come AFTER mocks
// =============================================================================
import { POST, GET } from "@/app/api/qa/log/route";
import { logger } from "@/lib/logger";

// =============================================================================
// TEST UTILITIES
// =============================================================================
const LOG_URL = "http://localhost:3000/api/qa/log";

function makePostRequest(
  body: unknown,
  opts?: { cookies?: string; authHeader?: string },
): NextRequest {
  return new NextRequest(LOG_URL, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(opts?.authHeader ? { authorization: opts.authHeader } : {}),
      ...(opts?.cookies ? { cookie: opts.cookies } : {}),
    },
  });
}

function makeGetRequest(query?: Record<string, string>): NextRequest {
  const url = query
    ? `${LOG_URL}?${new URLSearchParams(query).toString()}`
    : LOG_URL;
  return new NextRequest(url, {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

function createDbMock(overrides?: { insertOne?: Mock; find?: Mock; createIndex?: Mock }) {
  const insertOne = overrides?.insertOne ?? vi.fn().mockResolvedValue({ acknowledged: true });
  const createIndex = overrides?.createIndex ?? vi.fn().mockResolvedValue({ ok: 1 });
  const toArray = vi.fn().mockResolvedValue([]);
  const limit = vi.fn().mockReturnValue({ toArray });
  const sort = vi.fn().mockReturnValue({ limit });
  const find = overrides?.find ?? vi.fn().mockReturnValue({ sort });
  const collection = vi.fn().mockReturnValue({ insertOne, find, createIndex });
  return { insertOne, find, sort, limit, toArray, collection, db: { collection } };
}

function resetMocks() {
  vi.clearAllMocks();
  mockState.authError = null;
  mockState.authResult = {
    id: "test-user",
    tenantId: "test-org",
    role: "SUPER_ADMIN",
    email: "admin@test.com",
  };
  mockState.dbError = null;
  mockState.dbResult = createDbMock().db;
  mockState.indexError = null;
}

beforeEach(() => {
  resetMocks();
});

// =============================================================================
// TESTS
// =============================================================================
describe("api/qa/log - RBAC", () => {
  it("returns 401 when auth missing", async () => {
    mockState.authError = new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(makePostRequest({ event: "e1", data: {} }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("returns 403 when not SUPER_ADMIN", async () => {
    mockState.authError = new Response(JSON.stringify({ error: "FORBIDDEN" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("returns 400 when tenantId missing", async () => {
    mockState.authResult = { id: "test-user", tenantId: "", role: "SUPER_ADMIN", email: "a@b.com" };

    const res = await POST(makePostRequest({ event: "e1", data: {} }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing organization context" });
  });
});

describe("api/qa/log - POST", () => {
  it("persists with org/user tags and hashed sessionId", async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const db = createDbMock({ insertOne });
    mockState.dbResult = db.db;

    const res = await POST(
      makePostRequest({ event: "click", data: { a: 1 } }, { cookies: "sessionId=secret-token" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(db.collection).toHaveBeenCalledWith("qa_logs");
    const doc = insertOne.mock.calls[0][0];
    expect(doc.orgId).toBe("test-org");
    expect(doc.userId).toBe("test-user");
    expect(doc.sessionIdHash).toBeDefined();
    expect(doc.sessionIdHash).toHaveLength(16);
    expect(doc.sessionId).toBeUndefined();
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(makePostRequest("{ bad json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when body is not object", async () => {
    const res = await POST(makePostRequest(123));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Body must be an object" });
  });

  it("rejects payload larger than 10KB", async () => {
    const res = await POST(makePostRequest({ event: "e1", data: "x".repeat(11 * 1024) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Payload too large" });
  });

  it("caps event length to 128 chars", async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    mockState.dbResult = createDbMock({ insertOne }).db;

    const res = await POST(makePostRequest({ event: "a".repeat(200), data: {} }));
    expect(res.status).toBe(200);
    expect(insertOne.mock.calls[0][0].event.length).toBe(128);
  });

  it("returns 503 when DB unavailable", async () => {
    mockState.dbError = new Error("db down");

    const res = await POST(makePostRequest({ event: "e1", data: {} }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Service temporarily unavailable" });
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns 503 when ensureQaIndexes fails", async () => {
    mockState.indexError = new Error("index bootstrap failed");

    const res = await POST(makePostRequest({ event: "e1", data: {} }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Service temporarily unavailable" });
    expect(logger.error).toHaveBeenCalledWith(
      "[QA Log] DB unavailable during index bootstrap",
      expect.objectContaining({ error: "index bootstrap failed" })
    );
  });
});

describe("api/qa/log - GET", () => {
  it("scopes to org and omits data by default", async () => {
    const find = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ event: "e1", orgId: "test-org" }]),
        }),
      }),
    });
    mockState.dbResult = createDbMock({ find }).db;

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ logs: [{ event: "e1", orgId: "test-org" }] });
    expect(find).toHaveBeenCalledWith({ orgId: "test-org" }, { projection: { data: 0 } });
  });

  it("applies event filter and includeData", async () => {
    const find = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockState.dbResult = createDbMock({ find }).db;

    const res = await GET(makeGetRequest({ event: "click", includeData: "true" }));
    expect(res.status).toBe(200);
    expect(find).toHaveBeenCalledWith({ orgId: "test-org", event: "click" }, { projection: {} });
  });

  it("caps limit at 200", async () => {
    let capturedLimit: number | undefined;
    const limit = vi.fn().mockImplementation((n: number) => {
      capturedLimit = n;
      return { toArray: vi.fn().mockResolvedValue([]) };
    });
    const sort = vi.fn().mockReturnValue({ limit });
    const find = vi.fn().mockReturnValue({ sort });
    const collection = vi.fn().mockReturnValue({ find, insertOne: vi.fn(), createIndex: vi.fn() });
    mockState.dbResult = { collection };

    await GET(makeGetRequest({ limit: "5000" }));
    expect(capturedLimit).toBe(200);
  });

  it("returns 503 when DB unavailable", async () => {
    mockState.dbError = new Error("db down");

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Service temporarily unavailable" });
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns 503 when ensureQaIndexes fails on GET", async () => {
    mockState.indexError = new Error("index bootstrap failed");

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Service temporarily unavailable" });
    expect(logger.error).toHaveBeenCalledWith(
      "[QA Log] DB unavailable during index bootstrap",
      expect.objectContaining({ error: "index bootstrap failed" })
    );
  });
});
