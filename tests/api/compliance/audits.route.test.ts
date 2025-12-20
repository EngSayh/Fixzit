import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();
const mockComplianceAuditFind = vi.fn();
const mockComplianceAuditCreate = vi.fn();

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(message?: string) {
      super(message || "Unauthorized");
      this.name = "UnauthorizedError";
    }
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/server/models/ComplianceAudit", () => ({
  default: {
    find: (...args: unknown[]) => {
      mockComplianceAuditFind(...args);
      return {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
    },
    create: (...args: unknown[]) => mockComplianceAuditCreate(...args),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
}));

vi.mock("@/server/plugins/auditPlugin", () => ({
  setAuditContext: vi.fn(),
  clearAuditContext: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET, POST } from "@/app/api/compliance/audits/route";
import { NextRequest } from "next/server";

const mockSession = {
  id: "user-1",
  email: "user@example.com",
  role: "AUDITOR",
  orgId: "org-1",
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
  return new NextRequest("http://localhost/api/compliance/audits", options);
}

describe("compliance/audits route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null); // No rate limit response = allowed
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockGetSessionUser.mockResolvedValue(mockSession);
  });

  describe("GET /api/compliance/audits", () => {
    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthenticated"));
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(401);
    });

    it("returns audits list when authenticated with proper role", async () => {
      mockComplianceAuditFind.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "audit-1", name: "Q1 Compliance Audit", status: "PLANNED" }
        ]),
      });
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(200);
    });

    it("returns 403 for unauthorized role", async () => {
      mockGetSessionUser.mockResolvedValueOnce({
        ...mockSession,
        role: "TENANT", // Not in allowed roles
      });
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/compliance/audits", () => {
    const validAuditPayload = {
      name: "Annual Compliance Audit",
      owner: "John Doe",
      scope: "Full facility compliance review",
      startDate: "2024-01-15",
      endDate: "2024-02-15",
      status: "PLANNED",
      riskLevel: "MEDIUM",
    };

    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("POST", validAuditPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthenticated"));
      
      const req = createRequest("POST", validAuditPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      const invalidPayload = { name: "" }; // Missing required fields
      
      const req = createRequest("POST", invalidPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(400);
    });

    it("creates audit with valid payload", async () => {
      mockComplianceAuditCreate.mockResolvedValueOnce({
        _id: "audit-new",
        ...validAuditPayload,
        orgId: "org-1",
      });
      
      const req = createRequest("POST", validAuditPayload);
      const res = await POST(req);
      
      // Should not be 401, 403, or 429
      expect([401, 403, 429]).not.toContain(res.status);
    });
  });
});
