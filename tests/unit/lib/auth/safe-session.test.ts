/**
 * @fileoverview Negative-path tests for auth infrastructure failure scenarios
 * @description Tests that auth infra failures return 503 with correlation IDs, not 401
 *
 * Note: isAuthInfrastructureError is an internal function (not exported), so we test
 * its behavior indirectly through getSessionOrError and getSessionOrNull.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----- Mock Setup using vi.hoisted for proper hoisting -----
const { mockGetSessionUser } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
}));

// Test the safe-session helper directly
import {
  getSessionOrError,
  getSessionOrNull,
} from "@/lib/auth/safe-session";

// ----- Tests -----
describe("getSessionOrError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session on success", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "test-user", orgId: "test-org" });

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:route" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toBeDefined();
      expect(result.session.id).toBe("test-user");
    }
  });

  it("returns 503 on infra failure with correlation ID", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("MongoNetworkError: connection refused"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:route" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
      const body = await result.response.json();
      expect(body.error).toContain("temporarily unavailable");
      expect(body.correlationId).toBeDefined();
      expect(body.retryable).toBe(true);
    }
  });

  it("returns 401 on auth failure", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("UnauthorizedError: jwt expired"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:route" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });
});

describe("getSessionOrNull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session on success", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "test-user", orgId: "test-org" });

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrNull(req, { route: "test:route" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toBeDefined();
    }
  });

  it("returns 503 on infra failure", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("ECONNREFUSED"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrNull(req, { route: "test:route" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  it("returns null session on auth failure (not 401)", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("Token expired"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrNull(req, { route: "test:route" });

    // For optional auth, auth failures return null session
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toBeNull();
    }
  });
});

describe("Integration: Auth Infra Failure Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("database connection refused returns 503", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:27017"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:db" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  it("Redis timeout returns 503", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("connect ETIMEDOUT redis.example.com:6379"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:redis" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  it("network error returns 503", async () => {
    // Pattern matches "network error" in infraPatterns
    mockGetSessionUser.mockRejectedValue(new Error("network error: request failed"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:network" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  it("DNS failure returns 503", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("getaddrinfo EAI_AGAIN mongodb.cluster.local"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:dns" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  it("SSL certificate error returns 503", async () => {
    // Pattern matches "certificate" in infraPatterns
    mockGetSessionUser.mockRejectedValue(new Error("SSL certificate error: unable to verify"));

    const req = new NextRequest("http://localhost/test");
    const result = await getSessionOrError(req, { route: "test:ssl" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });
});
