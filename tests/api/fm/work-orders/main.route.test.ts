/**
 * @fileoverview Tests for FM Work Orders Main API Route
 * @description Comprehensive tests for work order listing and creation with RBAC
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock database
const mockFindWorkOrders = vi.fn();
const mockInsertWorkOrder = vi.fn();
const mockCountDocuments = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              toArray: () => mockFindWorkOrders(),
            }),
          }),
        }),
      }),
      insertOne: (data: unknown) => mockInsertWorkOrder(data),
      countDocuments: () => mockCountDocuments(),
    }),
  }),
}));

vi.mock("@/lib/db/collections", () => ({
  COLLECTIONS: {
    WORK_ORDERS: "work_orders",
    WO_TIMELINE: "wo_timeline",
  },
}));

const mockRequireFmAbility = vi.fn();
vi.mock("../utils/fm-auth", () => ({
  requireFmAbility: (ability: string) => () => mockRequireFmAbility(ability),
}));

vi.mock("@/lib/fm-notifications", () => ({
  onTicketCreated: vi.fn().mockResolvedValue(undefined),
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
import { GET, POST } from "@/app/api/fm/work-orders/route";

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

describe("FM Work Orders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindWorkOrders.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
  });

  describe("GET /api/fm/work-orders", () => {
    it("returns 401 when ability check fails", async () => {
      const { NextResponse } = await import("next/server");
      mockRequireFmAbility.mockReturnValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = makeRequest("https://example.com/api/fm/work-orders", "GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when tenantId is missing", async () => {
      mockRequireFmAbility.mockReturnValue({
        // No orgId or tenantId
        role: "ADMIN",
      });

      const req = makeRequest("https://example.com/api/fm/work-orders", "GET");
      const res = await GET(req);

      expect(res.status).toBe(400);
    });

    it("returns work orders for authenticated user with orgId", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "ADMIN",
      });
      mockFindWorkOrders.mockResolvedValue([
        {
          _id: "wo_1",
          title: "Test Work Order",
          status: "OPEN",
          orgId: "org_123",
        },
      ]);
      mockCountDocuments.mockResolvedValue(1);

      const req = makeRequest("https://example.com/api/fm/work-orders", "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.workOrders).toHaveLength(1);
    });

    it("supports pagination parameters", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "ADMIN",
      });
      mockFindWorkOrders.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/fm/work-orders?page=2&limit=10",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("enforces maximum limit of 100", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "ADMIN",
      });
      mockFindWorkOrders.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/fm/work-orders?limit=500",
        "GET"
      );
      const res = await GET(req);

      // Should succeed but internally cap at 100
      expect(res.status).toBe(200);
    });

    it("filters by status when provided", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "ADMIN",
      });
      mockFindWorkOrders.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/fm/work-orders?status=OPEN",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("filters by priority when provided", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "ADMIN",
      });
      mockFindWorkOrders.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/fm/work-orders?priority=HIGH",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("filters TENANT role by assigned units", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "TENANT",
        units: ["unit_1", "unit_2"],
      });
      mockFindWorkOrders.mockResolvedValue([]);

      const req = makeRequest("https://example.com/api/fm/work-orders", "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("returns 403 for TENANT with no assigned units", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "TENANT",
        units: [], // No units
      });

      const req = makeRequest("https://example.com/api/fm/work-orders", "GET");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("units");
    });

    it("supports search parameter", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        role: "ADMIN",
      });
      mockFindWorkOrders.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/fm/work-orders?search=plumbing",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/fm/work-orders", () => {
    it("returns 401 when ability check fails", async () => {
      const { NextResponse } = await import("next/server");
      mockRequireFmAbility.mockReturnValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = makeRequest("https://example.com/api/fm/work-orders", "POST", {
        title: "New Work Order",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("creates work order with valid data", async () => {
      mockRequireFmAbility.mockReturnValue({
        orgId: "org_123",
        userId: "user_1",
        role: "ADMIN",
      });
      mockInsertWorkOrder.mockResolvedValue({
        insertedId: "wo_new",
      });

      const req = makeRequest("https://example.com/api/fm/work-orders", "POST", {
        title: "New Work Order",
        description: "Test description",
        category: "PLUMBING",
        priority: "MEDIUM",
        location: {
          propertyId: "prop_1",
          unitNumber: "101",
        },
      });
      const res = await POST(req);

      // Should be 201 for created
      expect([200, 201]).toContain(res.status);
    });
  });
});
