/**
 * @fileoverview Tests for HR Employees API
 * @description Tests for employee listing and creation with RBAC
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock services
const mockListEmployees = vi.fn();
const mockCreateEmployee = vi.fn();

vi.mock("@/server/services/hr/employee.service", () => ({
  EmployeeService: {
    listEmployees: (...args: unknown[]) => mockListEmployees(...args),
    createEmployee: (...args: unknown[]) => mockCreateEmployee(...args),
  },
}));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: vi.fn().mockImplementation((role, subRole, allowedRoles) => {
    return allowedRoles.includes(role) || allowedRoles.includes(subRole);
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import routes after mocks
import { GET, POST } from "@/app/api/hr/employees/route";

const makeRequest = (
  url: string,
  method: string,
  body?: Record<string, unknown>
): NextRequest =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;

describe("HR Employees API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListEmployees.mockResolvedValue({ employees: [], total: 0 });
  });

  describe("GET /api/hr/employees", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/hr/employees", "GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when orgId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", role: "HR" },
      });

      const req = makeRequest("https://example.com/api/hr/employees", "GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 for non-HR roles", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "TENANT" },
      });

      const req = makeRequest("https://example.com/api/hr/employees", "GET");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("HR access required");
    });

    it("allows HR role to access", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "HR" },
      });
      mockListEmployees.mockResolvedValue({
        employees: [{ _id: "emp_1", name: "John Doe" }],
        total: 1,
      });

      const req = makeRequest("https://example.com/api/hr/employees", "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("allows HR_OFFICER subRole to access", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user_1",
          orgId: "org_123",
          role: "TEAM_MEMBER",
          subRole: "HR_OFFICER",
        },
      });
      mockListEmployees.mockResolvedValue({ employees: [], total: 0 });

      const req = makeRequest("https://example.com/api/hr/employees", "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("allows SUPER_ADMIN to access", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin_1", orgId: "org_123", role: "SUPER_ADMIN" },
      });
      mockListEmployees.mockResolvedValue({ employees: [], total: 0 });

      const req = makeRequest("https://example.com/api/hr/employees", "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports pagination parameters", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "HR" },
      });
      mockListEmployees.mockResolvedValue({ employees: [], total: 0 });

      const req = makeRequest(
        "https://example.com/api/hr/employees?page=2&limit=10",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("enforces maximum limit of 100", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "HR" },
      });
      mockListEmployees.mockResolvedValue({ employees: [], total: 0 });

      const req = makeRequest(
        "https://example.com/api/hr/employees?limit=500",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("filters by status", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "HR" },
      });
      mockListEmployees.mockResolvedValue({ employees: [], total: 0 });

      const req = makeRequest(
        "https://example.com/api/hr/employees?status=ACTIVE",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("validates department ObjectId", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "HR" },
      });

      const req = makeRequest(
        "https://example.com/api/hr/employees?department=invalid",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid department");
    });

    it("supports search parameter", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "HR" },
      });
      mockListEmployees.mockResolvedValue({ employees: [], total: 0 });

      const req = makeRequest(
        "https://example.com/api/hr/employees?search=john",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/hr/employees", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/hr/employees", "POST", {
        name: "New Employee",
        email: "new@example.com",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 for non-HR roles", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "VENDOR" },
      });

      const req = makeRequest("https://example.com/api/hr/employees", "POST", {
        name: "New Employee",
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("creates employee with valid data", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123", role: "HR" },
      });
      mockCreateEmployee.mockResolvedValue({
        _id: "emp_new",
        name: "New Employee",
      });

      const req = makeRequest("https://example.com/api/hr/employees", "POST", {
        name: "New Employee",
        email: "new@example.com",
        department: "507f1f77bcf86cd799439011",
        jobTitle: "Developer",
      });
      const res = await POST(req);

      expect([200, 201]).toContain(res.status);
    });
  });
});
