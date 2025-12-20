import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAtsRBAC = vi.fn();
const mockSmartRateLimit = vi.fn();
const mockConnectToDatabase = vi.fn();
const mockJobFind = vi.fn();
const mockJobCreate = vi.fn();
const mockJobCountDocuments = vi.fn();

vi.mock("@/lib/ats/rbac", () => ({
  atsRBAC: (...args: unknown[]) => mockAtsRBAC(...args),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/server/models/Job", () => ({
  Job: {
    find: (...args: unknown[]) => {
      mockJobFind(...args);
      return {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
    },
    create: (...args: unknown[]) => mockJobCreate(...args),
    countDocuments: (...args: unknown[]) => mockJobCountDocuments(...args),
  },
}));

vi.mock("@/lib/utils", () => ({
  generateSlug: vi.fn().mockReturnValue("test-job-slug"),
}));

vi.mock("@/lib/i18n/server", () => ({
  getServerTranslation: vi.fn().mockResolvedValue((key: string) => key),
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

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
  }),
}));

import { GET, POST } from "@/app/api/ats/jobs/route";
import { NextRequest } from "next/server";

const mockAuthResult = {
  authorized: true,
  orgId: "org-1",
  user: { id: "user-1", role: "HR_MANAGER" },
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
  return new NextRequest("http://localhost/api/ats/jobs", options);
}

describe("ats/jobs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockAtsRBAC.mockResolvedValue(mockAuthResult);
    mockJobFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    mockJobCountDocuments.mockResolvedValue(0);
  });

  describe("GET /api/ats/jobs", () => {
    it("returns 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401/403 when not authorized", async () => {
      mockAtsRBAC.mockResolvedValueOnce({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      });
      
      const req = createRequest("GET");
      const res = await GET(req);
      
      expect(res.status).toBe(401);
    });

    it("returns jobs list when authorized", async () => {
      mockJobFind.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "job-1", title: "Software Engineer", status: "published" }
        ]),
      });
      mockJobCountDocuments.mockResolvedValueOnce(1);
      
      const req = createRequest("GET");
      const res = await GET(req);
      const body = await res.json();
      
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("filters by status when provided", async () => {
      const req = new NextRequest("http://localhost/api/ats/jobs?status=draft", {
        method: "GET",
        headers: { "x-forwarded-for": "127.0.0.1" },
      });
      
      await GET(req);
      
      expect(mockJobFind).toHaveBeenCalled();
    });

    it("enforces tenant scope in query", async () => {
      const req = createRequest("GET");
      await GET(req);
      
      // Verify orgId is included in the filter
      expect(mockJobFind).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-1" }),
        expect.anything()
      );
    });
  });

  describe("POST /api/ats/jobs", () => {
    const validJobPayload = {
      title: "Software Engineer",
      department: "Engineering",
      location: { city: "Riyadh", country: "SA" },
      jobType: "FULL_TIME",
      description: "Looking for a talented engineer",
      requirements: ["3+ years experience", "TypeScript"],
    };

    it("returns 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
      
      const req = createRequest("POST", validJobPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });

    it("returns 401/403 when not authorized", async () => {
      mockAtsRBAC.mockResolvedValueOnce({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 }),
      });
      
      const req = createRequest("POST", validJobPayload);
      const res = await POST(req);
      
      expect(res.status).toBe(403);
    });
  });
});
