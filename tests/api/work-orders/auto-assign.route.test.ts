/**
 * @fileoverview Tests for Work Order Auto-Assignment API
 * @route POST /api/work-orders/auto-assign
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/work-orders/auto-assign/route";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/utils/objectid", () => ({
  isValidObjectId: vi.fn((id) => Types.ObjectId.isValid(id)),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock("@/services/fm/auto-assignment-engine", () => ({
  autoAssignWorkOrder: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockImplementation(async (req) => {
    try {
      const body = await req.json();
      return { data: body, error: null };
    } catch {
      return { data: null, error: "Invalid JSON" };
    }
  }),
}));

import { auth } from "@/auth";
import { WorkOrder } from "@/server/models/WorkOrder";
import { autoAssignWorkOrder } from "@/services/fm/auto-assignment-engine";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockAuth = vi.mocked(auth);
const mockWorkOrder = vi.mocked(WorkOrder);
const mockAutoAssign = vi.mocked(autoAssignWorkOrder);
const mockFeatureEnabled = vi.mocked(isFeatureEnabled);

function createRequest(body: unknown, bulk = false) {
  const url = bulk
    ? "http://localhost:3000/api/work-orders/auto-assign?bulk=true"
    : "http://localhost:3000/api/work-orders/auto-assign";

  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/work-orders/auto-assign", () => {
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-456";
  const mockWorkOrderId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);

    // Default auth mock - FM_MANAGER role
    mockAuth.mockResolvedValue({
      user: {
        id: mockUserId,
        role: "FM_MANAGER",
        orgId: mockOrgId,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    // Default feature flag enabled
    mockFeatureEnabled.mockReturnValue(true);

    // Default work order mock
    mockWorkOrder.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(mockWorkOrderId),
        workOrderNumber: "WO-001",
        status: "SUBMITTED",
        category: "MAINTENANCE",
        assignment: {},
      }),
    } as unknown as ReturnType<typeof WorkOrder.findOne>);

    // Default auto-assign mock
    mockAutoAssign.mockResolvedValue({
      success: true,
      assignee: {
        type: "user",
        id: "tech-123",
        name: "Test Technician",
        score: 85,
        reasons: ["Category match: +30", "Low workload: +40", "Rating: +15"],
        availability: "available",
        currentWorkload: 2,
        maxWorkload: 10,
        skills: ["MAINTENANCE"],
        averageRating: 4.5,
      },
    });
  });

  describe("Authentication & Authorization", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for unauthorized roles", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: mockUserId,
          role: "TENANT",
          orgId: mockOrgId,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("should return 401 if missing orgId", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: mockUserId,
          role: "FM_MANAGER",
          // No orgId
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toContain("Missing tenant context");
    });

    it("should return 403 if feature is disabled", async () => {
      mockFeatureEnabled.mockReturnValueOnce(false);

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toContain("feature is not enabled");
    });
  });

  describe("Single Auto-Assignment", () => {
    it("should auto-assign a work order successfully", async () => {
      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.workOrderId).toBe(mockWorkOrderId);
      expect(data.assignee).toBeDefined();
      expect(data.assignee.type).toBe("user");
      expect(data.assignee.name).toBe("Test Technician");
    });

    it("should return 400 for invalid work order ID", async () => {
      const req = createRequest({ workOrderId: "invalid-id" });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Invalid work order ID");
    });

    it("should return 404 if work order not found", async () => {
      mockWorkOrder.findOne.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue(null),
      } as unknown as ReturnType<typeof WorkOrder.findOne>);

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toBe("Work order not found");
    });

    it("should return 409 if work order is already assigned", async () => {
      mockWorkOrder.findOne.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockWorkOrderId),
          assignment: {
            assignedTo: { userId: "existing-tech" },
            assignedAt: new Date(),
          },
        }),
      } as unknown as ReturnType<typeof WorkOrder.findOne>);

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.error).toContain("already assigned");
    });

    it("should return 409 if work order is already assigned to a team", async () => {
      mockWorkOrder.findOne.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockWorkOrderId),
          assignment: {
            assignedTo: { teamId: "existing-team" },
            assignedAt: new Date(),
          },
        }),
      } as unknown as ReturnType<typeof WorkOrder.findOne>);

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.error).toContain("already assigned");
    });

    it("should return 422 if no suitable assignee found", async () => {
      mockAutoAssign.mockResolvedValueOnce({
        success: false,
        error: "No suitable assignee found",
      });

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(422);

      const data = await res.json();
      expect(data.error).toBe("No suitable assignee found");
    });
  });

  describe("Bulk Auto-Assignment", () => {
    beforeEach(() => {
      mockWorkOrder.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(),
            workOrderNumber: "WO-001",
            status: "SUBMITTED",
          },
          {
            _id: new Types.ObjectId(),
            workOrderNumber: "WO-002",
            status: "SUBMITTED",
          },
        ]),
      } as unknown as ReturnType<typeof WorkOrder.find>);
    });

    it("should auto-assign multiple work orders", async () => {
      const woIds = [
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ];

      const req = createRequest({ workOrderIds: woIds }, true);

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results).toBeDefined();
      expect(data.results.assigned).toBeGreaterThanOrEqual(0);

      expect(mockWorkOrder.find).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          isDeleted: { $ne: true },
          $and: expect.arrayContaining([
            { "assignment.assignedTo.userId": { $exists: false } },
            { "assignment.assignedTo.vendorId": { $exists: false } },
            { "assignment.assignedTo.teamId": { $exists: false } },
          ]),
        })
      );
    });

    it("should return 400 for too many work orders", async () => {
      const ids = Array(21)
        .fill(null)
        .map(() => new Types.ObjectId().toString());

      const req = createRequest({ workOrderIds: ids }, true);

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for empty workOrderIds array", async () => {
      const req = createRequest({ workOrderIds: [] }, true);

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Role-based Access", () => {
    it.each([
      ["SUPER_ADMIN"],
      ["CORPORATE_OWNER"],
      ["FM_MANAGER"],
      ["TECHNICIAN_LEAD"],
    ])("should allow %s role", async (role) => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: mockUserId,
          role,
          orgId: mockOrgId,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest({ workOrderId: mockWorkOrderId });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});
