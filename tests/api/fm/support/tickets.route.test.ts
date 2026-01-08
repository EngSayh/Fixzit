/**
 * @fileoverview Tests for FM Support Tickets API route
 * @module tests/api/fm/support/tickets
 * Sprint 69 - FM Domain Coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Hoisted mocks for FM routes
const {
  mockRequireFmPermission,
  mockResolveTenantId,
  mockBuildTenantFilter,
  mockGetDatabase,
  mockEnforceRateLimit,
} = vi.hoisted(() => ({
  mockRequireFmPermission: vi.fn(),
  mockResolveTenantId: vi.fn(),
  mockBuildTenantFilter: vi.fn(),
  mockGetDatabase: vi.fn(),
  mockEnforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: mockGetDatabase,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: mockRequireFmPermission,
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: mockResolveTenantId,
  buildTenantFilter: mockBuildTenantFilter,
  isCrossTenantMode: vi.fn().mockReturnValue(false),
  CROSS_TENANT_MARKER: "__CROSS_TENANT__",
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    unauthorized: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    ),
    forbidden: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    ),
    badRequest: vi.fn().mockImplementation((msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 400 })
    ),
    notFound: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    ),
    internalError: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })
    ),
    validationError: vi.fn().mockImplementation((msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 400 })
    ),
    missingTenant: vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ error: "Missing tenant" }), { status: 400 })
    ),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
}));

import { GET, POST } from "@/app/api/fm/support/tickets/route";

describe("FM Support Tickets API", () => {
  const mockCollection = {
    find: vi.fn(),
    insertOne: vi.fn(),
    countDocuments: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb);
    mockResolveTenantId.mockReturnValue({ tenantId: "org-123", source: "session" });
    mockBuildTenantFilter.mockReturnValue({ orgId: "org-123" });
    mockRequireFmPermission.mockResolvedValue({
      userId: "user-123",
      orgId: "org-123",
      tenantId: "org-123",
      isSuperAdmin: false,
    });
    mockEnforceRateLimit.mockReturnValue(undefined);
  });

  describe("GET /api/fm/support/tickets", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/support/tickets");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return tickets list with pagination", async () => {
      const mockTickets = [
        {
          _id: "ticket-1",
          requesterName: "John Doe",
          requesterEmail: "john@example.com",
          module: "HVAC",
          priority: "high",
          subject: "AC not working",
          status: "open",
        },
        {
          _id: "ticket-2",
          requesterName: "Jane Smith",
          requesterEmail: "jane@example.com",
          module: "Plumbing",
          priority: "medium",
          subject: "Leak in bathroom",
          status: "acknowledged",
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockTickets),
      });
      mockCollection.countDocuments.mockResolvedValue(2);

      const req = new NextRequest("http://localhost/api/fm/support/tickets?page=1&limit=10");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it("should filter tickets by status", async () => {
      const mockTickets = [
        { _id: "ticket-1", subject: "Open ticket", status: "open" },
      ];

      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockTickets),
      });
      mockCollection.countDocuments.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/fm/support/tickets?status=open");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it("should handle rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/fm/support/tickets");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/fm/support/tickets", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/support/tickets", {
        method: "POST",
        body: JSON.stringify({ subject: "Test" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should create a new ticket with valid data", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-ticket-id" });

      const ticketData = {
        requesterName: "Alice Johnson",
        requesterEmail: "alice@example.com",
        module: "Electrical",
        priority: "high",
        subject: "Power outage in building A",
        summary: "Complete power failure affecting floors 3-5 since 9am today.",
      };

      const req = new NextRequest("http://localhost/api/fm/support/tickets", {
        method: "POST",
        body: JSON.stringify(ticketData),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.id).toBeDefined();
    });

    it("should return 400 for missing requester name", async () => {
      const req = new NextRequest("http://localhost/api/fm/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          requesterEmail: "test@example.com",
          subject: "Test",
          summary: "Test summary text",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid email format", async () => {
      const req = new NextRequest("http://localhost/api/fm/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          requesterName: "Test User",
          requesterEmail: "invalid-email",
          subject: "Test",
          summary: "Test summary",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing subject", async () => {
      const req = new NextRequest("http://localhost/api/fm/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          requesterName: "Test User",
          requesterEmail: "test@example.com",
          summary: "Test summary",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should set default status to open", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-ticket-id" });

      const ticketData = {
        requesterName: "Bob Smith",
        requesterEmail: "bob@example.com",
        module: "General",
        priority: "low",
        subject: "General inquiry",
        summary: "This is a general inquiry about facility services.",
      };

      const req = new NextRequest("http://localhost/api/fm/support/tickets", {
        method: "POST",
        body: JSON.stringify(ticketData),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ status: "open" })
      );
    });
  });
});
