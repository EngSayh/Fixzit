/**
 * @fileoverview Tests for Work Orders Bulk Actions API
 * @route POST /api/work-orders/bulk
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/work-orders/bulk/route";
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
    find: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/utils/objectid", () => ({
  isValidObjectId: vi.fn((id) => Types.ObjectId.isValid(id)),
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
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockAuth = vi.mocked(auth);
const mockWorkOrder = vi.mocked(WorkOrder);

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/work-orders/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/work-orders/bulk", () => {
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-456";

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

    // Default WorkOrder mocks
    mockWorkOrder.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { _id: new Types.ObjectId(), workOrderNumber: "WO-001", status: "SUBMITTED" },
        { _id: new Types.ObjectId(), workOrderNumber: "WO-002", status: "ASSIGNED" },
      ]),
    } as unknown as ReturnType<typeof WorkOrder.find>);

    mockWorkOrder.updateMany.mockResolvedValue({ modifiedCount: 2 } as never);
  });

  describe("Authentication & Authorization", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const req = createRequest({
        action: "update_status",
        workOrderIds: [new Types.ObjectId().toString()],
        status: "IN_PROGRESS",
      });

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

      const req = createRequest({
        action: "update_status",
        workOrderIds: [new Types.ObjectId().toString()],
        status: "IN_PROGRESS",
      });

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

      const req = createRequest({
        action: "update_status",
        workOrderIds: [new Types.ObjectId().toString()],
        status: "IN_PROGRESS",
      });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toContain("Missing tenant context");
    });
  });

  describe("Validation", () => {
    it("should return 400 for invalid action", async () => {
      const req = createRequest({
        action: "invalid_action",
        workOrderIds: [new Types.ObjectId().toString()],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for empty workOrderIds", async () => {
      const req = createRequest({
        action: "update_status",
        workOrderIds: [],
        status: "IN_PROGRESS",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for too many workOrderIds", async () => {
      const ids = Array(51)
        .fill(null)
        .map(() => new Types.ObjectId().toString());

      const req = createRequest({
        action: "update_status",
        workOrderIds: ids,
        status: "IN_PROGRESS",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid ObjectIds", async () => {
      const req = createRequest({
        action: "update_status",
        workOrderIds: ["invalid-id-123"],
        status: "IN_PROGRESS",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Invalid work order IDs");
    });

    it("should return 400 for update_status without status", async () => {
      const req = createRequest({
        action: "update_status",
        workOrderIds: [new Types.ObjectId().toString()],
        // No status provided
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Status is required");
    });
  });

  describe("Bulk Status Update", () => {
    it("should update status for multiple work orders", async () => {
      const woIds = [new Types.ObjectId().toString(), new Types.ObjectId().toString()];

      const req = createRequest({
        action: "update_status",
        workOrderIds: woIds,
        status: "IN_PROGRESS",
        reason: "Starting work on all orders",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("update_status");
      expect(data.results.processed).toBe(2);

      // Verify tenant-scoped query
      expect(mockWorkOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          isDeleted: { $ne: true },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: "IN_PROGRESS",
          }),
        })
      );
    });
  });

  describe("Bulk Priority Update", () => {
    it("should update priority for multiple work orders", async () => {
      const woIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "update_priority",
        workOrderIds: woIds,
        priority: "HIGH",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("update_priority");
    });

    it("should return 400 without priority", async () => {
      const req = createRequest({
        action: "update_priority",
        workOrderIds: [new Types.ObjectId().toString()],
        // No priority
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Bulk Assignment", () => {
    it("should assign multiple work orders to a user", async () => {
      const woIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "assign",
        workOrderIds: woIds,
        assigneeUserId: "tech-user-123",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("assign");
    });

    it("should return 400 without assignee", async () => {
      const req = createRequest({
        action: "assign",
        workOrderIds: [new Types.ObjectId().toString()],
        // No assigneeUserId or assigneeVendorId
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("assigneeUserId or assigneeVendorId is required");
    });
  });

  describe("Bulk Archive", () => {
    it("should archive eligible work orders", async () => {
      const woIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "archive",
        workOrderIds: woIds,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("archive");
    });
  });

  describe("Bulk Delete", () => {
    it("should soft delete multiple work orders", async () => {
      const woIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "delete",
        workOrderIds: woIds,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("delete");

      // Verify soft delete
      expect(mockWorkOrder.updateMany).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            isDeleted: true,
          }),
        })
      );
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

      const req = createRequest({
        action: "update_status",
        workOrderIds: [new Types.ObjectId().toString()],
        status: "IN_PROGRESS",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});
