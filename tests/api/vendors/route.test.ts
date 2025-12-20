/**
 * @fileoverview Vendors API Tests
 * Tests for GET/POST /api/vendors endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockConnectToDatabase = vi.fn();
const mockGetSessionUser = vi.fn();
const mockSmartRateLimit = vi.fn();
const mockVendorFind = vi.fn();
const mockVendorCountDocuments = vi.fn();
const mockVendorCreate = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((data, status) =>
    new Response(JSON.stringify(data), { status })
  ),
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/server/models/Vendor", () => ({
  Vendor: {
    find: (...args: unknown[]) => mockVendorFind(...args),
    countDocuments: (...args: unknown[]) => mockVendorCountDocuments(...args),
    create: (...args: unknown[]) => mockVendorCreate(...args),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

describe("Vendors API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock returns
    mockConnectToDatabase.mockResolvedValue(undefined);
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 59 });
    mockGetSessionUser.mockResolvedValue({
      id: "user-123",
      orgId: "org-123",
      role: "admin",
    });
    mockVendorFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { _id: "vendor-1", name: "Test Vendor", type: "SUPPLIER" },
      ]),
    });
    mockVendorCountDocuments.mockResolvedValue(1);
    mockVendorCreate.mockResolvedValue({
      _id: "vendor-new",
      name: "New Vendor",
      type: "CONTRACTOR",
      code: "VEN-ABC123",
    });
  });

  describe("GET /api/vendors", () => {
    it("should return paginated vendors list for authenticated user", async () => {
      const { GET } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toBeDefined();
      expect(data.page).toBe(1);
      expect(data.limit).toBe(20);
      expect(data.total).toBe(1);
    });

    it("should return 401 for unauthenticated request", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("unauthenticated"));

      const { GET } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 401 when missing tenant context", async () => {
      mockGetSessionUser.mockResolvedValueOnce({
        id: "user-123",
        orgId: null,
        role: "admin",
      });

      const { GET } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe("Missing tenant context");
    });

    it("should return 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });

      const { GET } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors");

      const response = await GET(req);

      expect(response.status).toBe(429);
    });

    it("should filter by type when provided", async () => {
      const { GET } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors?type=SUPPLIER");

      await GET(req);

      expect(mockVendorFind).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-123", type: "SUPPLIER" })
      );
    });
  });

  describe("POST /api/vendors", () => {
    const validVendorData = {
      name: "New Vendor",
      type: "CONTRACTOR",
      contact: {
        primary: {
          name: "John Doe",
          email: "john@example.com",
        },
        address: {
          street: "123 Main St",
          city: "Riyadh",
          region: "Central",
        },
      },
    };

    it("should create a vendor for authenticated user", async () => {
      const { POST } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors", {
        method: "POST",
        body: JSON.stringify(validVendorData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Vendor");
    });

    it("should return 401 for unauthenticated request", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("unauthenticated"));

      const { POST } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors", {
        method: "POST",
        body: JSON.stringify(validVendorData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 422 for invalid vendor data", async () => {
      const { POST } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors", {
        method: "POST",
        body: JSON.stringify({ name: "" }), // Invalid - missing required fields
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(req);

      expect(response.status).toBe(422);
    });

    it("should include orgId from session in created vendor", async () => {
      const { POST } = await import("@/app/api/vendors/route");
      const req = new NextRequest("http://localhost/api/vendors", {
        method: "POST",
        body: JSON.stringify(validVendorData),
        headers: { "Content-Type": "application/json" },
      });

      await POST(req);

      expect(mockVendorCreate).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-123" })
      );
    });
  });
});
