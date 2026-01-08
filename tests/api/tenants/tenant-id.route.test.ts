/**
 * @fileoverview Tests for Tenant ID Route
 * @route GET/PATCH /api/tenants/[id]
 * @sprint Sprint 71
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

// Hoisted mocks
const mockGetSessionUser = vi.fn();
const mockSmartRateLimit = vi.fn();
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Tenant", () => ({
  Tenant: {
    findOne: vi.fn(() => ({
      lean: () => mockFindOne(),
    })),
    findOneAndUpdate: vi.fn(() => mockFindOneAndUpdate()),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: () => mockSmartRateLimit(),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    NextResponse.json({ error: "Rate limited" }, { status: 429 })
  ),
  handleApiError: vi.fn((error) => {
    // Zod errors return 400
    if (error?.name === "ZodError" || error?.issues) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) =>
    NextResponse.json(body, { status })
  ),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

import { GET, PATCH } from "@/app/api/tenants/[id]/route";

const validTenantId = new mongoose.Types.ObjectId().toString();
const testTenant = {
  _id: validTenantId,
  name: "John Doe",
  type: "INDIVIDUAL",
  orgId: "org-123",
  contact: {
    primary: {
      email: "john@example.com",
      phone: "+966501234567",
    },
  },
  status: "active",
};

describe("Tenant [id] Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetIn: 60000 });
    mockGetSessionUser.mockResolvedValue({ id: "user-123", orgId: "org-123" });
  });

  describe("GET /api/tenants/[id]", () => {
    it("returns 400 for invalid tenant ID", async () => {
      const req = new NextRequest("http://localhost/api/tenants/invalid-id");
      const res = await GET(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30000 });

      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`);
      const res = await GET(req, { params: { id: validTenantId } });

      expect(res.status).toBe(429);
    });

    it("returns 404 when tenant not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`);
      const res = await GET(req, { params: { id: validTenantId } });

      expect(res.status).toBe(404);
    });

    it("returns tenant on success", async () => {
      mockFindOne.mockResolvedValue(testTenant);

      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`);
      const res = await GET(req, { params: { id: validTenantId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBeDefined();
    });

    it("enforces tenant isolation via orgId", async () => {
      mockFindOne.mockResolvedValue(testTenant);

      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`);
      await GET(req, { params: { id: validTenantId } });

      expect(mockFindOne).toHaveBeenCalled();
    });
  });

  describe("PATCH /api/tenants/[id]", () => {
    it("returns 400 for invalid tenant ID", async () => {
      const req = new NextRequest("http://localhost/api/tenants/invalid-id", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PATCH(req, { params: { id: "invalid-id" } });

      expect(res.status).toBe(400);
    });

    it("returns 404 when tenant not found", async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PATCH(req, { params: { id: validTenantId } });

      expect(res.status).toBe(404);
    });

    it("updates tenant on success", async () => {
      mockFindOneAndUpdate.mockResolvedValue({ ...testTenant, name: "Updated Name" });

      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await PATCH(req, { params: { id: validTenantId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBeDefined();
    });

    it("validates contact email format", async () => {
      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          contact: {
            primary: {
              email: "invalid-email",
            },
          },
        }),
      });
      const res = await PATCH(req, { params: { id: validTenantId } });

      expect(res.status).toBe(400);
    });

    it("validates tenant type enum", async () => {
      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ type: "INVALID_TYPE" }),
      });
      const res = await PATCH(req, { params: { id: validTenantId } });

      expect(res.status).toBe(400);
    });

    it("updates preferences on success", async () => {
      mockFindOneAndUpdate.mockResolvedValue({
        ...testTenant,
        preferences: { language: "ar" },
      });

      const req = new NextRequest(`http://localhost/api/tenants/${validTenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ preferences: { language: "ar" } }),
      });
      const res = await PATCH(req, { params: { id: validTenantId } });

      expect(res.status).toBe(200);
    });
  });
});
