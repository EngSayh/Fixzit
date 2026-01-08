/**
 * @fileoverview Tests for FM Support Escalations API route
 * @module tests/api/fm/support/escalations
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

import { POST } from "@/app/api/fm/support/escalations/route";

describe("FM Support Escalations API", () => {
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

  // Note: This route only has POST, no GET endpoint
  describe("POST /api/fm/support/escalations", () => {
    it("should return 401 when permission check fails", async () => {
      mockRequireFmPermission.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify({ incidentId: "INC-001" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should create a new escalation with valid data", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-escalation-id" });

      const escalationData = {
        incidentId: "INC-003",
        service: "Fire Suppression System",
        severity: "P1",
        summary: "Fire suppression system malfunction in warehouse section C",
        symptoms: "System showing false positives and not responding to tests",
        preferredChannel: "phone",
      };

      const req = new NextRequest("http://localhost/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify(escalationData),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.id).toBeDefined();
    });

    it("should return 400 for missing incident ID", async () => {
      const req = new NextRequest("http://localhost/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify({
          service: "Test Service",
          severity: "P1",
          summary: "Test summary text here",
          symptoms: "Test symptoms",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 for short summary", async () => {
      const req = new NextRequest("http://localhost/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify({
          incidentId: "INC-001",
          service: "Test",
          severity: "P1",
          summary: "Too short", // Must be at least 20 chars
          symptoms: "Test symptoms",
          preferredChannel: "email",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing severity", async () => {
      const req = new NextRequest("http://localhost/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify({
          incidentId: "INC-001",
          service: "Test Service",
          summary: "This is a valid summary with enough characters",
          symptoms: "These are the symptoms",
          preferredChannel: "email",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should set default status to submitted", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "new-escalation-id" });

      const escalationData = {
        incidentId: "INC-004",
        service: "Security System",
        severity: "P2",
        summary: "Security camera system offline in parking garage",
        symptoms: "Multiple cameras showing no signal, control room alerts",
        preferredChannel: "slack",
      };

      const req = new NextRequest("http://localhost/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify(escalationData),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ status: "submitted" })
      );
    });

    it("should return 400 for missing preferred channel", async () => {
      const req = new NextRequest("http://localhost/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify({
          incidentId: "INC-001",
          service: "Test Service",
          severity: "P1",
          summary: "This is a valid summary with enough characters",
          symptoms: "These are the symptoms",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
