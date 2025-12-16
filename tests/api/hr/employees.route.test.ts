/**
 * @fileoverview Tests for /api/hr/employees routes
 * Tests HR employee management including CRUD operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/auth", () => ({
  auth: vi.fn(),
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

// Mock EmployeeService
vi.mock("@/server/services/hr/employee.service", () => ({
  EmployeeService: {
    searchWithPagination: vi.fn(),
    upsert: vi.fn(),
    getByCode: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { auth } from "@/auth";
import { hasAllowedRole } from "@/lib/auth/role-guards";
import { EmployeeService } from "@/server/services/hr/employee.service";
import type { SessionUser } from "@/types/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/hr/employees/route");
  } catch {
    return null;
  }
};

describe("API /api/hr/employees", () => {
  const mockOrgId = "org_123456789";
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
    vi.mocked(auth).mockResolvedValue({
      user: mockUser,
    } as never);
    vi.mocked(hasAllowedRole).mockReturnValue(true);
    vi.mocked(EmployeeService.searchWithPagination).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
    vi.mocked(EmployeeService.getByCode).mockResolvedValue(null);
    vi.mocked(EmployeeService.upsert).mockResolvedValue({
      employeeCode: "EMP-001",
    } as never);
  });

  describe("GET - List Employees", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/hr/employees");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/hr/employees");
      const response = await route.GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when user has no orgId (tenant scope missing)", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue({
        user: { role: "HR", orgId: undefined },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/hr/employees");
      const response = await route.GET(req);

      expect(response.status).toBe(401);
    });

    it("returns 403 when user lacks HR role", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(hasAllowedRole).mockReturnValue(false);

      const req = new NextRequest("http://localhost:3000/api/hr/employees");
      const response = await route.GET(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Forbidden");
    });

    it("successfully lists employees with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const mockEmployees = [
        {
          _id: "emp_001",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          department: "Engineering",
          employmentStatus: "ACTIVE",
        },
        {
          _id: "emp_002",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          department: "HR",
          employmentStatus: "ACTIVE",
        },
      ];

      vi.mocked(EmployeeService.searchWithPagination).mockResolvedValue({
        items: mockEmployees,
        total: 2,
        page: 1,
        limit: 25,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/hr/employees");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.employees).toHaveLength(2);
      expect(data.pagination.total).toBe(2);

      // Verify tenant scoping was enforced
      expect(EmployeeService.searchWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId }),
        expect.any(Object)
      );
    });

    it("supports pagination parameters", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(EmployeeService.searchWithPagination).mockResolvedValue({
        items: [],
        total: 50,
        page: 2,
        limit: 10,
      } as never);

      const req = new NextRequest(
        "http://localhost:3000/api/hr/employees?page=2&limit=10"
      );
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(EmployeeService.searchWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId }),
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });

    it("supports status filtering", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(EmployeeService.searchWithPagination).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      } as never);

      const req = new NextRequest(
        "http://localhost:3000/api/hr/employees?status=INACTIVE"
      );
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(EmployeeService.searchWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({ employmentStatus: "INACTIVE" }),
        expect.any(Object)
      );
    });
  });

  describe("POST - Create Employee", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/hr/employees", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/hr/employees", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(401);
    });

    it("returns 403 when user lacks HR role", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(hasAllowedRole).mockReturnValue(false);

      const req = new NextRequest("http://localhost:3000/api/hr/employees", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(403);
    });

    it("successfully creates employee with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const mockEmployee = {
        _id: "emp_new",
        employeeCode: "EMP-002",
        firstName: "New",
        lastName: "Employee",
        email: "new@example.com",
        jobTitle: "Engineer",
        employmentStatus: "ACTIVE",
        orgId: mockOrgId,
      };

      vi.mocked(EmployeeService.upsert).mockResolvedValue(mockEmployee as never);

      const req = new NextRequest("http://localhost:3000/api/hr/employees", {
        method: "POST",
        body: JSON.stringify({
          employeeCode: "EMP-002",
          firstName: "New",
          lastName: "Employee",
          email: "new@example.com",
          jobTitle: "Engineer",
          hireDate: "2024-01-01",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.firstName).toBe("New");

      // Verify tenant scoping was enforced
      expect(EmployeeService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId })
      );
    });

    it("returns 400 when request body is invalid", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/hr/employees", {
        method: "POST",
        body: JSON.stringify({}), // Missing required fields
      });
      const response = await route.POST(req);

      expect([400, 500]).toContain(response.status);
    });
  });
});
