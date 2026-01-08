/**
 * @fileoverview Tests for Lead Activities Route
 * @route GET/POST /api/leads/[id]/activities
 * @sprint Sprint 71
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

// Hoisted mocks
const mockAuth = vi.fn();
const mockLeadFindOne = vi.fn();
const mockActivityFind = vi.fn();
const mockActivityCount = vi.fn();
const mockActivityCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/souq/Lead", () => ({
  SouqLead: {
    findOne: () => ({
      lean: () => mockLeadFindOne(),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/server/models/souq/LeadActivity", () => ({
  LeadActivity: {
    find: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => ({
              lean: () => mockActivityFind(),
            }),
          }),
        }),
      }),
    }),
    countDocuments: () => mockActivityCount(),
    create: (data: unknown) => mockActivityCreate(data),
  },
}));

import { GET, POST } from "@/app/api/leads/[id]/activities/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

const validLeadId = new Types.ObjectId().toString();
const testLead = {
  _id: new Types.ObjectId(validLeadId),
  org_id: "org-123",
  name: "Test Lead",
};

const testActivities = [
  {
    _id: new Types.ObjectId(),
    type: "call",
    title: "Initial contact",
    outcome: "positive",
    created_at: new Date(),
  },
  {
    _id: new Types.ObjectId(),
    type: "email",
    title: "Follow-up email",
    outcome: "neutral",
    created_at: new Date(),
  },
];

describe("Lead Activities Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  describe("GET /api/leads/[id]/activities", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`);
      const res = await GET(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(401);
    });

    it("returns 401 when user has no tenantId", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
        expires: new Date().toISOString(),
      });

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`);
      const res = await GET(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`);
      const res = await GET(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(429);
    });

    it("returns 404 when lead not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockLeadFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`);
      const res = await GET(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(404);
    });

    it("returns activities list on success", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockLeadFindOne.mockResolvedValue(testLead);
      mockActivityFind.mockResolvedValue(testActivities);
      mockActivityCount.mockResolvedValue(2);

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`);
      const res = await GET(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.activities).toBeDefined();
      expect(Array.isArray(body.activities)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it("supports pagination", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockLeadFindOne.mockResolvedValue(testLead);
      mockActivityFind.mockResolvedValue([testActivities[0]]);
      mockActivityCount.mockResolvedValue(10);

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities?page=2&limit=5`);
      const res = await GET(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(5);
    });
  });

  describe("POST /api/leads/[id]/activities", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type: "call", title: "Test" }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limited" }, { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type: "call", title: "Test" }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(429);
    });

    it("returns 404 when lead not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockLeadFindOne.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type: "call", title: "Test" }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid activity type", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123" },
        expires: new Date().toISOString(),
      });
      mockLeadFindOne.mockResolvedValue(testLead);

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type: "invalid_type", title: "Test" }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(400);
    });

    it("creates activity on success", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", tenantId: "org-123", name: "Test User" },
        expires: new Date().toISOString(),
      });
      mockLeadFindOne.mockResolvedValue(testLead);
      mockActivityCreate.mockResolvedValue({
        _id: new Types.ObjectId(),
        type: "call",
        title: "Initial call",
        outcome: "positive",
      });

      const req = new NextRequest(`http://localhost/api/leads/${validLeadId}/activities`, {
        method: "POST",
        body: JSON.stringify({
          type: "call",
          title: "Initial call",
          outcome: "positive",
        }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: validLeadId }) });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.created).toBe(true);
    });
  });
});
