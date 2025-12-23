/**
 * @fileoverview Tests for Invoices Bulk Actions API
 * @route POST /api/invoices/bulk
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/invoices/bulk/route";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/models/Invoice", () => ({
  Invoice: {
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
import { Invoice } from "@/server/models/Invoice";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockAuth = vi.mocked(auth);
const mockInvoice = vi.mocked(Invoice);

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/invoices/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/invoices/bulk", () => {
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);

    // Default auth mock - FINANCE_MANAGER role
    mockAuth.mockResolvedValue({
      user: {
        id: mockUserId,
        role: "FINANCE_MANAGER",
        orgId: mockOrgId,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    // Default Invoice mocks
    mockInvoice.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { _id: new Types.ObjectId(), invoiceNumber: "INV-001", status: "sent" },
        { _id: new Types.ObjectId(), invoiceNumber: "INV-002", status: "overdue" },
      ]),
    } as unknown as ReturnType<typeof Invoice.find>);

    mockInvoice.updateMany.mockResolvedValue({ modifiedCount: 2 } as never);
  });

  describe("Authentication & Authorization", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const req = createRequest({
        action: "mark_paid",
        invoiceIds: [new Types.ObjectId().toString()],
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
        action: "mark_paid",
        invoiceIds: [new Types.ObjectId().toString()],
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
          role: "FINANCE_MANAGER",
          // No orgId
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest({
        action: "mark_paid",
        invoiceIds: [new Types.ObjectId().toString()],
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
        invoiceIds: [new Types.ObjectId().toString()],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for empty invoiceIds", async () => {
      const req = createRequest({
        action: "mark_paid",
        invoiceIds: [],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for too many invoiceIds", async () => {
      const ids = Array(51)
        .fill(null)
        .map(() => new Types.ObjectId().toString());

      const req = createRequest({
        action: "mark_paid",
        invoiceIds: ids,
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid ObjectIds", async () => {
      const req = createRequest({
        action: "mark_paid",
        invoiceIds: ["invalid-id-123"],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Invalid invoice IDs");
    });
  });

  describe("Mark as Paid", () => {
    it("should mark multiple invoices as paid", async () => {
      const invIds = [new Types.ObjectId().toString(), new Types.ObjectId().toString()];

      const req = createRequest({
        action: "mark_paid",
        invoiceIds: invIds,
        paymentMethod: "bank_transfer",
        paymentReference: "TRX-12345",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("mark_paid");
      expect(data.results.processed).toBe(2);

      // Verify tenant-scoped query
      expect(mockInvoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          isDeleted: { $ne: true },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: "paid",
          }),
        })
      );
    });
  });

  describe("Mark as Sent", () => {
    it("should mark draft invoices as sent", async () => {
      const invIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "mark_sent",
        invoiceIds: invIds,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("mark_sent");
    });
  });

  describe("Update Status", () => {
    it("should update status for multiple invoices", async () => {
      const invIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "update_status",
        invoiceIds: invIds,
        status: "overdue",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("update_status");
    });

    it("should return 400 without status", async () => {
      const req = createRequest({
        action: "update_status",
        invoiceIds: [new Types.ObjectId().toString()],
        // No status
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Status is required");
    });
  });

  describe("Send Reminder", () => {
    it("should send reminders for eligible invoices", async () => {
      const invIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "send_reminder",
        invoiceIds: invIds,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("send_reminder");
    });
  });

  describe("Bulk Archive", () => {
    it("should archive eligible invoices", async () => {
      const invIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "archive",
        invoiceIds: invIds,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("archive");
    });
  });

  describe("Bulk Delete", () => {
    it("should soft delete multiple invoices", async () => {
      const invIds = [new Types.ObjectId().toString()];

      const req = createRequest({
        action: "delete",
        invoiceIds: invIds,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("delete");

      // Verify soft delete
      expect(mockInvoice.updateMany).toHaveBeenCalledWith(
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
      ["FINANCE_MANAGER"],
      ["ACCOUNTANT"],
      ["FM_MANAGER"],
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
        action: "mark_paid",
        invoiceIds: [new Types.ObjectId().toString()],
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});
