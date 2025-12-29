/**
 * @fileoverview Tests for /api/export-jobs route
 * Tests authentication, authorization, rate limiting, and export job CRUD
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setMockUser,
  clearMockUser,
} from "@/tests/helpers/mockAuth";

// Mock session via getSessionUser
// Note: Use a runtime getter pattern to avoid hoisting issues
vi.mock("@/server/middleware/withAuthRbac", async () => {
  // Define the error class inside the factory to avoid hoisting issues
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }
  
  return {
    getSessionUser: vi.fn(async () => {
      // Re-import to get current value
      const { mockSessionUser: currentUser } = await import("@/tests/helpers/mockAuth");
      if (!currentUser) {
        throw new UnauthorizedError("Authentication required");
      }
      return currentUser;
    }),
    UnauthorizedError,
  };
});

// Deterministic rate limit mock
let rateLimitResponse: Response | null = null;
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => rateLimitResponse),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock ExportJob model
vi.mock("@/server/models/ExportJob", () => ({
  ExportJob: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([
              {
                _id: "job-1",
                org_id: "org-123",
                user_id: "user-123",
                entity_type: "work-orders",
                format: "csv",
                status: "completed",
                created_at: new Date(),
              },
            ]),
          }),
        }),
      }),
    }),
    create: vi.fn().mockResolvedValue({ _id: "new-job-123" }),
  },
}));

// Mock export queue
vi.mock("@/lib/export/export-queue", () => ({
  enqueueExportJob: vi.fn().mockResolvedValue({ jobId: "queued-job-123" }),
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

import { GET, POST } from "@/app/api/export-jobs/route";

describe("API /api/export-jobs", () => {
  beforeEach(() => {
    rateLimitResponse = null;
    clearMockUser();
    vi.clearAllMocks();
  });

  describe("GET /api/export-jobs", () => {
    describe("Authentication", () => {
      it("returns 401 when user is not authenticated", async () => {
        setMockUser(null);

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "GET",
        });
        const res = await GET(req);

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe("Authentication required");
      });

      it("returns 403 when user has no orgId", async () => {
        setMockUser({
          id: "user-123",
          orgId: undefined,
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "GET",
        });
        const res = await GET(req);

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toBe("Organization context required");
      });
    });

    describe("Rate Limiting", () => {
      it("returns 429 when rate limited", async () => {
        rateLimitResponse = new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429 }
        );
        setMockUser({
          id: "user-123",
          orgId: "org-123",
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "GET",
        });
        const res = await GET(req);

        expect(res.status).toBe(429);
      });
    });

    describe("Success Cases", () => {
      it("returns list of export jobs for authenticated user", async () => {
        setMockUser({
          id: "user-123",
          orgId: "org-123",
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "GET",
        });
        const res = await GET(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("jobs");
        expect(Array.isArray(data.jobs)).toBe(true);
      });

      it("filters by entity_type when provided", async () => {
        setMockUser({
          id: "user-123",
          orgId: "org-123",
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest(
          "http://localhost:3000/api/export-jobs?entity_type=work-orders",
          { method: "GET" }
        );
        const res = await GET(req);

        expect(res.status).toBe(200);
      });
    });
  });

  describe("POST /api/export-jobs", () => {
    describe("Authentication", () => {
      it("returns 401 when user is not authenticated", async () => {
        setMockUser(null);

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "POST",
          body: JSON.stringify({
            entity_type: "work-orders",
            format: "csv",
          }),
          headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);

        expect(res.status).toBe(401);
      });

      it("returns 403 when user has no orgId", async () => {
        setMockUser({
          id: "user-123",
          orgId: undefined,
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "POST",
          body: JSON.stringify({
            entity_type: "work-orders",
            format: "csv",
          }),
          headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);

        expect(res.status).toBe(403);
      });
    });

    describe("Rate Limiting", () => {
      it("returns 429 when rate limited", async () => {
        rateLimitResponse = new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429 }
        );
        setMockUser({
          id: "user-123",
          orgId: "org-123",
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "POST",
          body: JSON.stringify({
            entity_type: "work-orders",
            format: "csv",
          }),
          headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);

        expect(res.status).toBe(429);
      });
    });

    describe("Validation", () => {
      it("returns 400 for invalid entity_type", async () => {
        setMockUser({
          id: "user-123",
          orgId: "org-123",
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "POST",
          body: JSON.stringify({
            entity_type: "invalid-type",
            format: "csv",
          }),
          headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);

        expect(res.status).toBe(400);
      });

      it("returns 400 for invalid format", async () => {
        setMockUser({
          id: "user-123",
          orgId: "org-123",
          role: "ADMIN",
          email: "test@example.com",
        });

        const req = new NextRequest("http://localhost:3000/api/export-jobs", {
          method: "POST",
          body: JSON.stringify({
            entity_type: "work-orders",
            format: "pdf", // Only csv/xlsx allowed
          }),
          headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);

        expect(res.status).toBe(400);
      });
    });
  });
});
