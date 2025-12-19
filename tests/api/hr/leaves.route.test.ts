/**
 * @fileoverview Tests for /api/hr/leaves routes
 * Tests HR leave request management including CRUD operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: SessionUser | null = null;

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock role guards
vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: vi.fn(),
}));

// Mock LeaveService
vi.mock("@/server/services/hr/leave.service", () => ({
  LeaveService: {
    list: vi.fn(),
    request: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { hasAllowedRole } from "@/lib/auth/role-guards";
import { LeaveService } from "@/server/services/hr/leave.service";
import type { SessionUser } from "@/types/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/hr/leaves/route");
  } catch {
    return null;
  }
};

describe("API /api/hr/leaves", () => {
  const mockOrgId = "507f1f77bcf86cd799439013";
  const mockUser: SessionUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "HR",
    subRole: null,
    email: "hr@test.com",
    isSuperAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    sessionUser = mockUser;
    vi.mocked(hasAllowedRole).mockReturnValue(true);
    vi.mocked(LeaveService.list).mockResolvedValue([]);
    vi.mocked(LeaveService.request).mockResolvedValue({
      _id: "leave_123",
      orgId: mockOrgId,
      employeeId: "emp_123",
      leaveTypeId: "type_123",
      startDate: new Date(),
      endDate: new Date(),
      numberOfDays: 3,
      status: "PENDING",
    });
    vi.mocked(LeaveService.updateStatus).mockResolvedValue({
      _id: "leave_123",
      orgId: mockOrgId,
      employeeId: "emp_123",
      leaveTypeId: "type_123",
      startDate: new Date(),
      endDate: new Date(),
      numberOfDays: 3,
      status: "APPROVED",
      approvalHistory: [],
    });
  });

  describe("GET /api/hr/leaves", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/hr/leaves");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when user lacks HR role", async () => {
      vi.mocked(hasAllowedRole).mockReturnValue(false);
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/hr/leaves");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(403);
    });

    it("should return leave requests list for authorized HR user", async () => {
      vi.mocked(LeaveService.list).mockResolvedValue([
        {
          _id: "leave_1",
          employeeId: "emp_1",
          status: "PENDING",
          numberOfDays: 5,
        },
      ]);
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/hr/leaves");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.requests).toHaveLength(1);
    });

    it("should filter by status when provided", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest(
        "http://localhost/api/hr/leaves?status=APPROVED"
      );
      await routeModule.GET(request);
      expect(LeaveService.list).toHaveBeenCalledWith(mockOrgId, "APPROVED");
    });
  });

  describe("POST /api/hr/leaves", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when user lacks HR role", async () => {
      vi.mocked(hasAllowedRole).mockReturnValue(false);
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 400 for invalid request body", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "POST",
        body: JSON.stringify({ invalidField: true }),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(400);
    });

    it("should create leave request with valid data", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const validLeaveData = {
        employeeId: "507f1f77bcf86cd799439011",
        leaveTypeId: "507f1f77bcf86cd799439012",
        startDate: "2025-01-01",
        endDate: "2025-01-03",
        numberOfDays: 3,
        reason: "Family vacation",
      };

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "POST",
        body: JSON.stringify(validLeaveData),
        headers: { "Content-Type": "application/json" },
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(201);
      expect(LeaveService.request).toHaveBeenCalled();
    });

    it("should enforce rate limiting on POST", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
        }) as unknown as null
      );
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(429);
    });
  });

  describe("PUT /api/hr/leaves", () => {
    it("should return 400 for invalid leaveRequestId", async () => {
      const routeModule = await importRoute();

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveRequestId: "invalid-id", status: "APPROVED" }),
      });

      const response = await routeModule.PUT(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Invalid request body");
    });

    it("should return 404 when leave request is not found", async () => {
      vi.mocked(LeaveService.updateStatus).mockResolvedValueOnce(null);
      const routeModule = await importRoute();

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveRequestId: "507f1f77bcf86cd799439011",
          status: "APPROVED",
        }),
      });

      const response = await routeModule.PUT(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Leave request not found");
    });

    it("should enforce rate limiting on PUT", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
        }) as unknown as null
      );
      const routeModule = await importRoute();

      const request = new NextRequest("http://localhost/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveRequestId: "507f1f77bcf86cd799439011",
          status: "APPROVED",
        }),
      });
      const response = await routeModule.PUT(request);
      expect(response.status).toBe(429);
    });
  });
});
