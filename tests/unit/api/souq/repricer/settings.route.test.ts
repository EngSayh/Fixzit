/**
 * @fileoverview Tests for GET/POST/DELETE /api/souq/repricer/settings
 * @description Auto-repricer settings for Souq marketplace sellers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

// ----- Mock Setup -----
const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();
const SELLER_ID = new ObjectId().toHexString();

let mockSession: { user: { id: string; orgId: string } } | null = null;
let mockSeller: { _id: ObjectId; userId: string; orgId: string } | null = null;
let mockSettings: Record<string, unknown> | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/server/models/souq/Seller", () => ({
  SouqSeller: {
    findOne: vi.fn(() => ({
      lean: vi.fn(async () => mockSeller),
    })),
  },
}));

vi.mock("@/services/souq/auto-repricer-service", () => ({
  AutoRepricerService: {
    getRepricerSettings: vi.fn(async () => mockSettings),
    enableAutoRepricer: vi.fn(async () => ({ success: true })),
    disableAutoRepricer: vi.fn(async () => ({ success: true })),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ----- Import Route After Mocks -----
import { GET, POST, DELETE } from "@/app/api/souq/repricer/settings/route";

// ----- Helpers -----
function createGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/souq/repricer/settings", {
    method: "GET",
  });
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/souq/repricer/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/souq/repricer/settings", {
    method: "DELETE",
  });
}

// ----- Tests -----
describe("GET /api/souq/repricer/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: USER_ID, orgId: ORG_ID } };
    mockSeller = { _id: new ObjectId(SELLER_ID), userId: USER_ID, orgId: ORG_ID };
    mockSettings = {
      enabled: true,
      minMargin: 0.05,
      maxMargin: 0.3,
      strategy: "competitive",
    };
  });

  afterEach(() => {
    mockSession = null;
    mockSeller = null;
    mockSettings = null;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
    });

    it("returns 400 when orgId missing", async () => {
      mockSession = { user: { id: USER_ID, orgId: "" } };
      const res = await GET(createGetRequest());
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Organization");
    });
  });

  describe("Seller Validation", () => {
    it("returns 404 when seller not found", async () => {
      mockSeller = null;
      const res = await GET(createGetRequest());
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain("Seller not found");
    });
  });

  describe("Response Format", () => {
    it("returns settings on success", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.settings).toBeDefined();
      expect(body.settings.enabled).toBe(true);
    });
  });
});

describe("POST /api/souq/repricer/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: USER_ID, orgId: ORG_ID } };
    mockSeller = { _id: new ObjectId(SELLER_ID), userId: USER_ID, orgId: ORG_ID };
  });

  afterEach(() => {
    mockSession = null;
    mockSeller = null;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await POST(createPostRequest({ settings: {} }));
      expect(res.status).toBe(401);
    });

    it("returns 400 when orgId missing", async () => {
      mockSession = { user: { id: USER_ID, orgId: "" } };
      const res = await POST(createPostRequest({ settings: {} }));
      expect(res.status).toBe(400);
    });
  });

  describe("Validation", () => {
    it("returns 400 when settings missing", async () => {
      const res = await POST(createPostRequest({}));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Settings");
    });
  });

  describe("Seller Validation", () => {
    it("returns 404 when seller not found", async () => {
      mockSeller = null;
      const res = await POST(
        createPostRequest({ settings: { minMargin: 0.1 } }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("Successful Update", () => {
    it("returns success on valid settings", async () => {
      const res = await POST(
        createPostRequest({
          settings: {
            enabled: true,
            minMargin: 0.05,
            maxMargin: 0.25,
            strategy: "aggressive",
          },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});

describe("DELETE /api/souq/repricer/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: USER_ID, orgId: ORG_ID } };
    mockSeller = { _id: new ObjectId(SELLER_ID), userId: USER_ID, orgId: ORG_ID };
  });

  afterEach(() => {
    mockSession = null;
    mockSeller = null;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await DELETE(createDeleteRequest());
      expect(res.status).toBe(401);
    });

    it("returns 400 when orgId missing", async () => {
      mockSession = { user: { id: USER_ID, orgId: "" } };
      const res = await DELETE(createDeleteRequest());
      expect(res.status).toBe(400);
    });
  });

  describe("Seller Validation", () => {
    it("returns 404 when seller not found", async () => {
      mockSeller = null;
      const res = await DELETE(createDeleteRequest());
      expect(res.status).toBe(404);
    });
  });

  describe("Successful Disable", () => {
    it("returns success when repricer disabled", async () => {
      const res = await DELETE(createDeleteRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain("disabled");
    });
  });
});
