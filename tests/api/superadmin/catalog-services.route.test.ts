/**
 * @fileoverview Tests for Superadmin Catalog Services API
 * @route GET/POST /api/superadmin/catalog/services
 * @agent [AGENT-001-A]
 */
import { expectAuthFailure } from '@/tests/api/_helpers';
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing the route
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/server/models/FMService", () => ({
  FMService: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(10), // Return > 0 to skip seeding
    insertMany: vi.fn(),
    distinct: vi.fn().mockResolvedValue(["HVAC", "Plumbing", "Electrical"]),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Dynamic imports AFTER mocks
const { GET, POST } = await import("@/app/api/superadmin/catalog/services/route");
const { FMService } = await import("@/server/models/FMService");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Catalog Services API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
      orgId: "org-123",
    } as any);
  });

  describe("GET /api/superadmin/catalog/services", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/catalog/services");
      const response = await GET(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/catalog/services");
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it("should return list of services", async () => {
      const mockServices = [
        { _id: "svc-1", name: "AC Maintenance", category: "HVAC", isActive: true },
        { _id: "svc-2", name: "Plumbing", category: "Plumbing", isActive: true },
      ];

      vi.mocked(FMService.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockServices),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/catalog/services");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.services).toHaveLength(2);
      expect(data.services[0].name).toBe("AC Maintenance");
    });

    it("should filter services by category", async () => {
      vi.mocked(FMService.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "svc-1", name: "AC Maintenance", category: "HVAC" },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        "http://localhost/api/superadmin/catalog/services?category=HVAC"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(FMService.find).toHaveBeenCalledWith(expect.objectContaining({ category: "HVAC" }));
    });

    it("should filter by isActive status", async () => {
      vi.mocked(FMService.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const request = new NextRequest(
        "http://localhost/api/superadmin/catalog/services?isActive=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(FMService.find).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
    });
  });

  describe("POST /api/superadmin/catalog/services", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/catalog/services", {
        method: "POST",
        body: JSON.stringify({ name: "Test Service" }),
      });
      const response = await POST(request);

      expectAuthFailure(response);
    });

    it("should create a new service with valid data", async () => {
      const newService = {
        name: "Electrical Repair",
        nameAr: "إصلاح كهربائي",
        category: "Electrical",
        pricing: { type: "fixed", basePrice: 100, currency: "SAR" },
      };

      vi.mocked(FMService.create).mockResolvedValue({
        _id: "new-svc-id",
        ...newService,
        isActive: true,
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/catalog/services", {
        method: "POST",
        body: JSON.stringify(newService),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.service.name).toBe("Electrical Repair");
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/catalog/services", {
        method: "POST",
        body: JSON.stringify({ name: "Missing Fields" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should handle invalid JSON body", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/catalog/services", {
        method: "POST",
        body: "invalid-json",
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
