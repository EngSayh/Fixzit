/**
 * @fileoverview PM Plans API Tests
 * Tests for GET/POST /api/pm/plans endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetSessionUser = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockFMPMPlanFind = vi.fn();
const mockFMPMPlanCreate = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((data, status) =>
    new Response(JSON.stringify(data), { status })
  ),
}));

vi.mock("@/server/models/FMPMPlan", () => ({
  FMPMPlan: {
    find: (...args: unknown[]) => mockFMPMPlanFind(...args),
    create: (...args: unknown[]) => mockFMPMPlanCreate(...args),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockImplementation(async (req) => {
    try {
      const body = await req.json();
      return { data: body, error: null };
    } catch {
      return { data: null, error: "Invalid JSON" };
    }
  }),
}));

describe("PM Plans API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock returns
    mockEnforceRateLimit.mockReturnValue(null);
    mockGetSessionUser.mockResolvedValue({
      id: "user-123",
      orgId: "org-123",
      role: "admin",
    });
    mockFMPMPlanFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: "plan-1", title: "HVAC Quarterly Check", status: "active" },
      ]),
    });
    mockFMPMPlanCreate.mockResolvedValue({
      _id: "plan-new",
      title: "New PM Plan",
      status: "active",
    });
  });

  describe("GET /api/pm/plans", () => {
    it("should return PM plans list for authenticated user", async () => {
      const { GET } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.count).toBe(1);
    });

    it("should return 401 for unauthenticated request", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthorized"));

      const { GET } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should filter by propertyId when provided", async () => {
      const { GET } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans?propertyId=prop-123");

      await GET(req);

      expect(mockFMPMPlanFind).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-123", propertyId: "prop-123" })
      );
    });

    it("should filter by status when provided", async () => {
      const { GET } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans?status=active");

      await GET(req);

      expect(mockFMPMPlanFind).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-123", status: "active" })
      );
    });

    it("should always include orgId in query for tenant isolation", async () => {
      const { GET } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans");

      await GET(req);

      expect(mockFMPMPlanFind).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-123" })
      );
    });
  });

  describe("POST /api/pm/plans", () => {
    const validPlanData = {
      title: "HVAC Monthly Check",
      propertyId: "prop-123",
      recurrencePattern: "monthly",
      description: "Regular HVAC maintenance",
    };

    it("should create a PM plan for authenticated user", async () => {
      const { POST } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans", {
        method: "POST",
        body: JSON.stringify(validPlanData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it("should return 401 for unauthenticated request", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthorized"));

      const { POST } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans", {
        method: "POST",
        body: JSON.stringify(validPlanData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for missing required fields", async () => {
      const { POST } = await import("@/app/api/pm/plans/route");
      const req = new NextRequest("http://localhost/api/pm/plans", {
        method: "POST",
        body: JSON.stringify({ title: "Incomplete plan" }), // Missing propertyId and recurrencePattern
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
