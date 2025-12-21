/**
 * @fileoverview Tests for GET/POST /api/fm/marketplace/vendors
 * @description FM Marketplace vendor management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// ----- Mock Setup -----
const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();

type MockPermissionUser = {
  id: string;
  userId: string;
  orgId: string;
  tenantId: string;
  role: string;
  isSuperAdmin?: boolean;
} | null;

let mockPermissionUser: MockPermissionUser = null;
let mockPermissionResult: null | NextResponse = null;
let mockVendors: Record<string, unknown>[] = [];
let mockInsertedDoc: Record<string, unknown> | null = null;

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn(async () => {
    if (mockPermissionResult) return mockPermissionResult;
    return mockPermissionUser;
  }),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((_req, orgId: string) => {
    if (!orgId) return { error: NextResponse.json({ error: "Tenant required" }, { status: 400 }) };
    return { tenantId: orgId };
  }),
  buildTenantFilter: vi.fn((tenantId: string) => ({ orgId: tenantId })),
  isCrossTenantMode: vi.fn((tenantId: string) => tenantId === "*"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(async () => ({
    collection: vi.fn(() => ({
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn(async () => mockVendors),
            })),
          })),
        })),
      })),
      countDocuments: vi.fn(async () => mockVendors.length),
      insertOne: vi.fn(async (doc: Record<string, unknown>) => {
        mockInsertedDoc = doc;
        return { insertedId: doc._id };
      }),
    })),
  })),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    internalError: vi.fn(() =>
      NextResponse.json({ success: false, error: "Internal error" }, { status: 500 }),
    ),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ----- Import Route After Mocks -----
import { GET, POST } from "@/app/api/fm/marketplace/vendors/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// ----- Helpers -----
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/fm/marketplace/vendors");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: "GET" });
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/fm/marketplace/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validVendorBody = {
  companyName: "ACME Maintenance",
  registrationNumber: "CR-12345",
  website: "https://acme.example.com",
  categories: "HVAC, Plumbing",
  coverageAreas: "Riyadh, Jeddah",
  deliverySla: "24 hours",
  contacts: [
    { name: "John Doe", email: "john@acme.example.com", phone: "+966501234567" },
  ],
};

// ----- Tests -----
describe("GET /api/fm/marketplace/vendors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    mockPermissionUser = {
      id: USER_ID,
      userId: USER_ID,
      orgId: ORG_ID,
      tenantId: ORG_ID,
      role: "ADMIN",
    };
    mockPermissionResult = null;
    mockVendors = [
      {
        _id: new ObjectId(),
        orgId: ORG_ID,
        companyName: "Vendor A",
        registrationNumber: "REG-001",
        status: "approved",
        contacts: [{ name: "Contact A", email: "a@example.com" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        orgId: ORG_ID,
        companyName: "Vendor B",
        registrationNumber: "REG-002",
        status: "pending_review",
        contacts: [{ name: "Contact B", email: "b@example.com" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  afterEach(() => {
    mockPermissionUser = null;
    mockPermissionResult = null;
    mockVendors = [];
  });

  describe("Authentication", () => {
    it("returns permission error when not authorized", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
    });

    it("returns 403 when no VENDOR:VIEW permission", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
    });
  });

  describe("Query Parameters", () => {
    it("accepts page parameter", async () => {
      const res = await GET(createGetRequest({ page: "2" }));
      expect(res.status).toBe(200);
    });

    it("accepts limit parameter", async () => {
      const res = await GET(createGetRequest({ limit: "10" }));
      expect(res.status).toBe(200);
    });

    it("accepts search query", async () => {
      const res = await GET(createGetRequest({ q: "ACME" }));
      expect(res.status).toBe(200);
    });
  });

  describe("Response Format", () => {
    it("returns success with data array", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns pagination metadata", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBeDefined();
      expect(body.pagination.total).toBeDefined();
    });
  });
});

describe("POST /api/fm/marketplace/vendors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionUser = {
      id: USER_ID,
      userId: USER_ID,
      orgId: ORG_ID,
      tenantId: ORG_ID,
      role: "ADMIN",
    };
    mockPermissionResult = null;
    mockInsertedDoc = null;
  });

  afterEach(() => {
    mockPermissionUser = null;
    mockPermissionResult = null;
    mockInsertedDoc = null;
  });

  describe("Authentication", () => {
    it("returns permission error when not authorized", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      const res = await POST(createPostRequest(validVendorBody));
      expect(res.status).toBe(401);
    });

    it("returns 403 when no VENDOR:CREATE permission", async () => {
      mockPermissionResult = NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
      const res = await POST(createPostRequest(validVendorBody));
      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    it("returns 400 when companyName missing", async () => {
      const { companyName, ...body } = validVendorBody;
      const res = await POST(createPostRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Company name");
    });

    it("returns 400 when registrationNumber missing", async () => {
      const { registrationNumber, ...body } = validVendorBody;
      const res = await POST(createPostRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Registration");
    });

    it("returns 400 when contacts missing", async () => {
      const { contacts, ...body } = validVendorBody;
      const res = await POST(createPostRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("contact");
    });

    it("returns 400 when contact email invalid", async () => {
      const body = {
        ...validVendorBody,
        contacts: [{ name: "John", email: "invalid-email" }],
      };
      const res = await POST(createPostRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("email");
    });
  });

  describe("Tenant Isolation", () => {
    it("assigns orgId from resolved tenant", async () => {
      const res = await POST(createPostRequest(validVendorBody));
      expect(res.status).toBe(201);
      expect(mockInsertedDoc).toBeDefined();
      expect(mockInsertedDoc?.orgId).toBe(ORG_ID);
    });
  });

  describe("Successful Creation", () => {
    it("returns 201 with created vendor", async () => {
      const res = await POST(createPostRequest(validVendorBody));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.companyName).toBe("ACME Maintenance");
    });

    it("sets initial status to pending_review", async () => {
      await POST(createPostRequest(validVendorBody));
      expect(mockInsertedDoc?.status).toBe("pending_review");
    });
  });
});
