import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();
const mockLeaveList = vi.fn();
const mockLeaveRequest = vi.fn();
const mockHasAllowedRole = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/server/services/hr/leave.service", () => ({
  LeaveService: {
    list: (...args: unknown[]) => mockLeaveList(...args),
    request: (...args: unknown[]) => mockLeaveRequest(...args),
  },
}));

vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: (...args: unknown[]) => mockHasAllowedRole(...args),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn().mockImplementation(async (req) => {
    try {
      return await req.json();
    } catch {
      return null;
    }
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/hr/leaves/route";
import { NextRequest } from "next/server";

const mockSession = {
  user: {
    id: "user-1",
    email: "hr@example.com",
    role: "HR",
    subRole: null,
    orgId: "org-1",
  },
};

function createRequest(method: string, body?: unknown): NextRequest {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/hr/leaves", options);
}

describe("hr/leaves route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockAuth.mockResolvedValue(mockSession);
    mockHasAllowedRole.mockReturnValue(true);
    mockLeaveList.mockResolvedValue([]);
    mockLeaveRequest.mockResolvedValue({
      _id: "leave-1",
      status: "PENDING",
      employeeId: "emp-1",
    });
  });

  describe("GET /api/hr/leaves", () => {
    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks HR role", async () => {
      mockHasAllowedRole.mockReturnValueOnce(false);
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(403);
    });

    it("returns leave requests list when authenticated with proper role", async () => {
      mockLeaveList.mockResolvedValueOnce([
        { _id: "leave-1", status: "PENDING", employeeId: "emp-1" }
      ]);
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/hr/leaves", () => {
    const validLeavePayload = {
      employeeId: "507f1f77bcf86cd799439011",
      leaveTypeId: "507f1f77bcf86cd799439012",
      startDate: "2024-03-01",
      endDate: "2024-03-05",
      numberOfDays: 5,
      reason: "Annual vacation",
    };

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("POST", validLeavePayload);
      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);
      
      const req = createRequest("POST", validLeavePayload);
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks HR role", async () => {
      mockHasAllowedRole.mockReturnValueOnce(false);
      
      const req = createRequest("POST", validLeavePayload);
      const res = await POST(req);
      
      expect(res.status).toBe(403);
    });
  });
});
