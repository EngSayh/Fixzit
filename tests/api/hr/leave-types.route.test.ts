import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();
const mockLeaveTypeService = vi.fn();
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

vi.mock("@/server/services/hr/leave-type.service", () => ({
  LeaveTypeService: {
    list: (...args: unknown[]) => mockLeaveTypeService(...args),
    create: (...args: unknown[]) => mockLeaveTypeService(...args),
  },
}));

vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: (...args: unknown[]) => mockHasAllowedRole(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/hr/leave-types/route";
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
  return new NextRequest("http://localhost/api/hr/leave-types", options);
}

describe("hr/leave-types route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockAuth.mockResolvedValue(mockSession);
    mockHasAllowedRole.mockReturnValue(true);
    mockLeaveTypeService.mockResolvedValue([]);
  });

  describe("GET /api/hr/leave-types", () => {
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

    it("returns leave types list when authenticated with proper role", async () => {
      mockLeaveTypeService.mockResolvedValueOnce([
        { _id: "lt-1", code: "ANNUAL", name: "Annual Leave" }
      ]);
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/hr/leave-types", () => {
    const validLeaveTypePayload = {
      code: "ANNUAL",
      name: "Annual Leave",
      description: "Standard annual leave",
      isPaid: true,
      annualEntitlementDays: 21,
    };

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("POST", validLeaveTypePayload);
      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);
      
      const req = createRequest("POST", validLeaveTypePayload);
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });
  });
});
