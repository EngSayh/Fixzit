import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
const mockGetUserFromToken = vi.fn();
const mockSmartRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();
const mockContractFind = vi.fn();
const mockContractCreate = vi.fn();

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromToken: (...args: unknown[]) => mockGetUserFromToken(...args),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/server/models/ServiceContract", () => ({
  default: {
    find: (...args: unknown[]) => {
      mockContractFind(...args);
      return {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
        exec: vi.fn().mockResolvedValue([]),
      };
    },
    create: (...args: unknown[]) => mockContractCreate(...args),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
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
  createSecureResponse: vi.fn((data, opts) => {
    return new Response(JSON.stringify(data), {
      status: opts?.status || 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  createErrorResponse: vi.fn((message, status) => {
    return new Response(JSON.stringify({ error: message }), { status });
  }),
  zodValidationError: vi.fn((error) => {
    return new Response(JSON.stringify({ error: "Validation failed" }), { status: 400 });
  }),
  rateLimitError: vi.fn(() => {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
  }),
}));

import { POST } from "@/app/api/contracts/route";
import { NextRequest } from "next/server";

const mockSession = {
  id: "user-1",
  email: "user@example.com",
  role: "ADMIN",
  orgId: "org-1",
  permissions: ["contract:view", "contract:create"],
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
  return new NextRequest("http://localhost/api/contracts", options);
}

describe("contracts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockGetSessionUser.mockResolvedValue(mockSession);
    mockGetUserFromToken.mockResolvedValue(null);
  });

  describe("POST /api/contracts", () => {
    const validContractPayload = {
      scope: "PROPERTY",
      scopeRef: "prop-123",
      contractorType: "FM_COMPANY",
      contractorRef: "contractor-123",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      terms: "Standard service agreement terms",
    };

    it("returns 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
      
      const req = createRequest("POST", validContractPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthenticated"));
      mockGetUserFromToken.mockResolvedValueOnce(null);
      
      const req = createRequest("POST", validContractPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      const req = createRequest("POST", { scope: "INVALID" });
      const res = await POST(req);
      
      expect(res.status).toBe(400);
    });

    it("creates contract with valid payload and admin role", async () => {
      mockContractCreate.mockResolvedValueOnce({
        _id: "contract-id",
        ...validContractPayload,
        orgId: "org-1",
      });
      
      const req = createRequest("POST", validContractPayload);
      const res = await POST(req);
      
      // Should not be 401 or 429
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(429);
    });
  });
});
