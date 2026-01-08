/**
 * @fileoverview Tests for Project ID Route
 * @route GET/PATCH/DELETE /api/projects/[id]
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
const mockFindByIdAndUpdate = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Project", () => ({
  Project: {
    findOne: vi.fn(() => ({
      lean: () => mockFindOne(),
    })),
    findOneAndUpdate: vi.fn(() => mockFindByIdAndUpdate()),
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

import { GET, PATCH, DELETE } from "@/app/api/projects/[id]/route";

const validProjectId = new mongoose.Types.ObjectId().toString();
const testProject = {
  _id: validProjectId,
  name: "Test Project",
  description: "Test description",
  type: "RENOVATION",
  status: "IN_PROGRESS",
  tenantId: "org-123",
  orgId: "org-123",
  progress: { overall: 50 },
};

describe("Project [id] Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetIn: 60000 });
    mockGetSessionUser.mockResolvedValue({ id: "user-123", orgId: "org-123", tenantId: "org-123" });
  });

  describe("GET /api/projects/[id]", () => {
    it("returns 400 for invalid project ID", async () => {
      const req = new NextRequest("http://localhost/api/projects/invalid-id");
      const res = await GET(req, { params: Promise.resolve({ id: "invalid-id" }) });

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30000 });

      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`);
      const res = await GET(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(429);
    });

    it("returns 404 when project not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`);
      const res = await GET(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(404);
    });

    it("returns project on success", async () => {
      mockFindOne.mockResolvedValue(testProject);

      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`);
      const res = await GET(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBeDefined();
    });
  });

  describe("PATCH /api/projects/[id]", () => {
    it("returns 400 for invalid project ID", async () => {
      const req = new NextRequest("http://localhost/api/projects/invalid-id", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "invalid-id" }) });

      expect(res.status).toBe(400);
    });

    it("returns 404 when project not found", async () => {
      mockFindByIdAndUpdate.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(404);
    });

    it("updates project on success", async () => {
      mockFindByIdAndUpdate.mockResolvedValue({ ...testProject, name: "Updated Project" });

      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Project" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBeDefined();
    });

    it("validates update schema", async () => {
      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "INVALID_STATUS" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/projects/[id]", () => {
    it("returns 400 for invalid project ID", async () => {
      const req = new NextRequest("http://localhost/api/projects/invalid-id", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "invalid-id" }) });

      expect(res.status).toBe(400);
    });

    it("returns 404 when project not found", async () => {
      mockFindByIdAndUpdate.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(404);
    });

    it("deletes project on success", async () => {
      mockFindByIdAndUpdate.mockResolvedValue({ ...testProject, status: "CANCELLED" });

      const req = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: validProjectId }) });

      expect(res.status).toBe(200);
    });
  });
});
