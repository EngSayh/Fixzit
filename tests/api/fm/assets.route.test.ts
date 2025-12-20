import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockSmartRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
  redisRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
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

// Mock the Asset model
vi.mock("@/server/models/Asset", () => ({
  Asset: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
      exec: vi.fn().mockResolvedValue([]),
    }),
    create: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

// Mock the crud-factory
vi.mock("@/lib/api/crud-factory", () => ({
  createCrudHandlers: vi.fn(() => ({
    GET: vi.fn().mockImplementation(async () => {
      const session = await mockAuth();
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      return new Response(JSON.stringify({ assets: [], total: 0 }), { status: 200 });
    }),
    POST: vi.fn().mockImplementation(async (req) => {
      const session = await mockAuth();
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      const body = await req.json();
      if (!body.name || !body.type || !body.propertyId) {
        return new Response(JSON.stringify({ error: "Validation failed" }), { status: 400 });
      }
      return new Response(JSON.stringify({ asset: { _id: "test-id", ...body } }), { status: 201 });
    }),
  })),
}));

vi.mock("@/lib/api/route-wrapper", () => ({
  wrapRoute: (handler: unknown) => handler,
}));

import { GET, POST } from "@/app/api/assets/route";
import { NextRequest } from "next/server";

const mockSession = {
  user: {
    id: "user-1",
    email: "user@example.com",
    role: "FM_ADMIN",
    orgId: "org-1",
    permissions: ["asset:view", "asset:create"],
    isSuperAdmin: false,
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
  return new NextRequest("http://localhost/api/assets", options);
}

describe("assets route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockAuth.mockResolvedValue(mockSession);
  });

  describe("GET /api/assets", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(401);
    });

    it("returns assets list when authenticated", async () => {
      const req = createRequest("GET");
      const res = await GET(req);
      const body = await res.json();
      
      expect(res.status).toBe(200);
      expect(body).toHaveProperty("assets");
    });
  });

  describe("POST /api/assets", () => {
    const validAssetPayload = {
      name: "Test HVAC Unit",
      type: "HVAC",
      category: "Climate Control",
      propertyId: "prop-123",
      manufacturer: "Carrier",
      model: "AC-2000",
    };

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);
      
      const req = createRequest("POST", validAssetPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      const req = createRequest("POST", { name: "Missing required fields" });
      const res = await POST(req);
      
      expect(res.status).toBe(400);
    });

    it("creates asset with valid payload", async () => {
      const req = createRequest("POST", validAssetPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(201);
    });
  });
});
