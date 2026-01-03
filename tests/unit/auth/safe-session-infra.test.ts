/**
 * @fileoverview Negative-path tests for Auth Infrastructure Failure Scenarios
 * Tests that getSessionOrNull and getSessionOrError properly distinguish
 * infrastructure failures (503) from authentication failures (401).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock the auth module to simulate failures
const mockGetSessionUser = vi.fn();

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "UnauthorizedError";
    }
  },
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
  createSecureResponse: vi.fn(
    (data: unknown, status: number) =>
      NextResponse.json(data, { status }),
  ),
}));

function createRequest(path = "/api/test"): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe("lib/auth/safe-session", () => {
  let getSessionOrError: typeof import("@/lib/auth/safe-session").getSessionOrError;
  let getSessionOrNull: typeof import("@/lib/auth/safe-session").getSessionOrNull;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    const mod = await import("@/lib/auth/safe-session");
    getSessionOrError = mod.getSessionOrError;
    getSessionOrNull = mod.getSessionOrNull;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getSessionOrError", () => {
    describe("Success Cases", () => {
      it("returns ok: true with session on successful auth", async () => {
        const mockSession = {
          id: "user_123",
          orgId: "org_123",
          role: "ADMIN",
        };
        mockGetSessionUser.mockResolvedValue(mockSession);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.session).toEqual(mockSession);
        }
      });
    });

    describe("Authentication Failures (401)", () => {
      it("returns 401 for UnauthorizedError", async () => {
        const { UnauthorizedError } = await import(
          "@/server/middleware/withAuthRbac"
        );
        mockGetSessionUser.mockRejectedValue(
          new UnauthorizedError("Invalid token"),
        );

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(401);
          expect(result.isInfraError).toBe(false);
        }
      });

      it("returns 401 for token expired error", async () => {
        mockGetSessionUser.mockRejectedValue(new Error("Token expired"));

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(401);
        }
      });

      it("returns 401 for invalid credentials", async () => {
        mockGetSessionUser.mockRejectedValue(
          new Error("Invalid credentials"),
        );

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(401);
        }
      });
    });

    describe("Infrastructure Failures (503)", () => {
      it("returns 503 for ECONNREFUSED (database down)", async () => {
        const dbError = new Error("connect ECONNREFUSED 127.0.0.1:27017");
        mockGetSessionUser.mockRejectedValue(dbError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
          expect(result.isInfraError).toBe(true);
          const body = await result.response.json();
          expect(body.retryable).toBe(true);
          expect(body.correlationId).toBeDefined();
        }
      });

      it("returns 503 for ETIMEDOUT (network timeout)", async () => {
        const timeoutError = new Error("connect ETIMEDOUT");
        mockGetSessionUser.mockRejectedValue(timeoutError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
          expect(result.isInfraError).toBe(true);
        }
      });

      it("returns 503 for ECONNRESET (connection reset)", async () => {
        const resetError = new Error("read ECONNRESET");
        mockGetSessionUser.mockRejectedValue(resetError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
          expect(result.isInfraError).toBe(true);
        }
      });

      it("returns 503 for MongoNetworkError", async () => {
        const mongoError = new Error("MongoNetworkError");
        mongoError.name = "MongoNetworkError";
        mockGetSessionUser.mockRejectedValue(mongoError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
          expect(result.isInfraError).toBe(true);
        }
      });

      it("returns 503 for cache connection error", async () => {
        const cacheError = new Error("Cache connection refused");
        mockGetSessionUser.mockRejectedValue(cacheError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
          expect(result.isInfraError).toBe(true);
        }
      });

      it("returns 503 for DNS resolution failure", async () => {
        const dnsError = new Error("getaddrinfo ENOTFOUND auth.example.com");
        mockGetSessionUser.mockRejectedValue(dnsError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
          expect(result.isInfraError).toBe(true);
        }
      });

      it("includes correlationId in 503 response", async () => {
        const dbError = new Error("Database connection timeout");
        mockGetSessionUser.mockRejectedValue(dbError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          const body = await result.response.json();
          expect(body.correlationId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          );
        }
      });

      it("marks 503 response as retryable", async () => {
        const dbError = new Error("Socket hang up");
        mockGetSessionUser.mockRejectedValue(dbError);

        const result = await getSessionOrError(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          const body = await result.response.json();
          expect(body.retryable).toBe(true);
        }
      });
    });

    describe("Route Logging", () => {
      it("includes route identifier in error logging context", async () => {
        const { logger } = await import("@/lib/logger");
        const dbError = new Error("connect ECONNREFUSED");
        mockGetSessionUser.mockRejectedValue(dbError);

        await getSessionOrError(createRequest(), {
          route: "souq:settlements",
        });

        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining("souq:settlements"),
          expect.any(Object),
        );
      });
    });
  });

  describe("getSessionOrNull", () => {
    describe("Success Cases", () => {
      it("returns ok: true with session on successful auth", async () => {
        const mockSession = {
          id: "user_123",
          orgId: "org_123",
          role: "ADMIN",
        };
        mockGetSessionUser.mockResolvedValue(mockSession);

        const result = await getSessionOrNull(createRequest());

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.session).toEqual(mockSession);
        }
      });

      it("returns ok: true with null session for auth failure", async () => {
        const { UnauthorizedError } = await import(
          "@/server/middleware/withAuthRbac"
        );
        mockGetSessionUser.mockRejectedValue(
          new UnauthorizedError("No token"),
        );

        const result = await getSessionOrNull(createRequest());

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.session).toBeNull();
        }
      });
    });

    describe("Infrastructure Failures (503)", () => {
      it("returns 503 for database connection error", async () => {
        const dbError = new Error("connect ECONNREFUSED 127.0.0.1:27017");
        mockGetSessionUser.mockRejectedValue(dbError);

        const result = await getSessionOrNull(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
        }
      });

      it("returns 503 for network timeout", async () => {
        const timeoutError = new Error("ETIMEDOUT");
        mockGetSessionUser.mockRejectedValue(timeoutError);

        const result = await getSessionOrNull(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
        }
      });

      it("does NOT return 503 for normal auth failures", async () => {
        mockGetSessionUser.mockRejectedValue(new Error("Token invalid"));

        const result = await getSessionOrNull(createRequest());

        // Should return ok: true with null session, not 503
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.session).toBeNull();
        }
      });
    });

    describe("Anonymous Access", () => {
      it("allows anonymous access when auth fails normally", async () => {
        mockGetSessionUser.mockRejectedValue(
          new Error("No session found"),
        );

        const result = await getSessionOrNull(createRequest());

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.session).toBeNull();
        }
      });

      it("blocks anonymous access during infra outage", async () => {
        const dbError = new Error("MongoNetworkError: connection refused");
        mockGetSessionUser.mockRejectedValue(dbError);

        const result = await getSessionOrNull(createRequest());

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(503);
        }
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles non-Error thrown values", async () => {
      mockGetSessionUser.mockRejectedValue("String error");

      const result = await getSessionOrError(createRequest());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should treat unknown errors as auth failures
        expect(result.response.status).toBe(401);
      }
    });

    it("handles null thrown values", async () => {
      mockGetSessionUser.mockRejectedValue(null);

      const result = await getSessionOrError(createRequest());

      expect(result.ok).toBe(false);
    });

    it("handles undefined thrown values", async () => {
      mockGetSessionUser.mockRejectedValue(undefined);

      const result = await getSessionOrError(createRequest());

      expect(result.ok).toBe(false);
    });
  });
});
