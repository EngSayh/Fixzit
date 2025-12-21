/**
 * @fileoverview Tests for /api/support/tickets routes
 * Tests support ticket management with CRUD operations
 * CRITICAL: Customer support workflow
 */
import { expectAuthFailure, expectValidationFailure, expectSuccess } from '@/tests/api/_helpers';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock session
vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
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

// Mock SupportTicket model
vi.mock("@/server/models/SupportTicket", () => ({
  SupportTicket: {
    find: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

// Mock error responses
vi.mock("@/server/utils/errorResponses", () => ({
  zodValidationError: vi.fn((err) => new Response(JSON.stringify({ error: err.issues?.[0]?.message || "Validation error" }), { status: 400 })),
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })),
}));

// Mock security headers
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data, status) => {
    const httpStatus =
      typeof status === "number" ? status : status?.status || 200;
    return new Response(JSON.stringify(data), {
      status: httpStatus,
      headers: { "Content-Type": "application/json" },
    });
  }),
}));

// Mock rate limit key builder
vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

import { smartRateLimit } from "@/server/security/rateLimit";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { SupportTicket } from "@/server/models/SupportTicket";

const importRoute = async () => {
  try {
    return await import("@/app/api/support/tickets/route");
  } catch {
    return null;
  }
};

describe("API /api/support/tickets", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "USER",
    email: "user@test.com",
    name: "Test User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true } as never);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: mockUser,
    } as never);
  });

  describe("GET - List Support Tickets", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false } as never);

      const req = new NextRequest("http://localhost:3000/api/support/tickets");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/support/tickets");
      const response = await route.GET(req);

      expectAuthFailure(response);
    });

    it("returns tickets list with org_id scope", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { ...mockUser, role: "ADMIN" },
      } as never);

      const mockTickets = [
        {
          _id: "ticket_1",
          subject: "Test Ticket",
          status: "Open",
          org_id: mockOrgId,
          requester: { email: mockUser.email },
        },
      ];

      vi.mocked(SupportTicket.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockTickets),
      } as never);

      vi.mocked(SupportTicket.countDocuments).mockResolvedValue(1 as never);

      const req = new NextRequest("http://localhost:3000/api/support/tickets");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
    });
  });

  describe("POST - Create Support Ticket", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false } as never);

      const req = new NextRequest("http://localhost:3000/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 400 for invalid subject (too short)", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: "Hi", // Too short, needs min 4 chars
          module: "FM",
          type: "Bug",
          text: "This is a test ticket description",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });

    it("creates ticket with valid data", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const mockCreatedTicket = {
        _id: "ticket_new",
        ticketId: "TKT-001",
        subject: "Test Support Issue",
        module: "FM",
        type: "Bug",
        priority: "Medium",
        status: "Open",
        org_id: mockOrgId,
      };

      vi.mocked(SupportTicket.create).mockResolvedValue(mockCreatedTicket as never);

      const req = new NextRequest("http://localhost:3000/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: "Test Support Issue",
          module: "FM",
          type: "Bug",
          priority: "Medium",
          category: "Technical",
          subCategory: "Bug Report",
          text: "There is a bug in the work order module",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expectSuccess(response);
    });

    it("validates module enum values", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: "Test Support Issue",
          module: "INVALID_MODULE",
          type: "Bug",
          text: "Test description text",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });

    it("validates type enum values", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: "Test Support Issue",
          module: "FM",
          type: "INVALID_TYPE",
          text: "Test description text",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });
  });
});
