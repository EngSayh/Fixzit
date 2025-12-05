import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks so we can reference them in assertions
const authMock = vi.hoisted(() => vi.fn());
const approveReturnMock = vi.hoisted(() => vi.fn());
const rejectReturnMock = vi.hoisted(() => vi.fn());
const inspectReturnMock = vi.hoisted(() => vi.fn());
const processRefundMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const fireNotificationsMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const findOneMock = vi.hoisted(() => vi.fn());
const agentAuditCreateMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    approveReturn: approveReturnMock,
    rejectReturn: rejectReturnMock,
    inspectReturn: inspectReturnMock,
    processRefund: processRefundMock,
    fireNotifications: fireNotificationsMock,
  },
}));

vi.mock("@/server/models/souq/RMA", () => ({
  SouqRMA: {
    findOne: findOneMock,
  },
}));

vi.mock("@/server/models/AgentAuditLog", () => ({
  AgentAuditLog: {
    create: agentAuditCreateMock,
  },
}));

let approveRoute: typeof import("@/app/api/souq/returns/approve/route").POST;
let inspectRoute: typeof import("@/app/api/souq/returns/inspect/route").POST;
let refundRoute: typeof import("@/app/api/souq/returns/refund/route").POST;

beforeAll(async () => {
  ({ POST: approveRoute } = await import("@/app/api/souq/returns/approve/route"));
  ({ POST: inspectRoute } = await import("@/app/api/souq/returns/inspect/route"));
  ({ POST: refundRoute } = await import("@/app/api/souq/returns/refund/route"));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("souq returns mutations RBAC/org checks", () => {
  describe("approve route", () => {
    it("requires targetOrgId when SUPER_ADMIN lacks session org", async () => {
      authMock.mockResolvedValue({
        user: { id: "admin", role: "SUPER_ADMIN", isSuperAdmin: true, orgId: undefined },
      });

      const req = new NextRequest("http://test.local/api/souq/returns/approve", {
        method: "POST",
        body: JSON.stringify({ rmaId: "r1", approve: true }),
      });

      const res = await approveRoute(req);
      expect(res.status).toBe(400);
    });

    it("approves within org scope for ADMIN", async () => {
      authMock.mockResolvedValue({
        user: { id: "admin1", role: "ADMIN", isSuperAdmin: false, orgId: "org-1" },
      });

      const req = new NextRequest("http://test.local/api/souq/returns/approve", {
        method: "POST",
        body: JSON.stringify({ rmaId: "r1", approve: true }),
      });

      const res = await approveRoute(req);
      expect(res.status).toBe(200);
      expect(approveReturnMock).toHaveBeenCalledWith({
        rmaId: "r1",
        orgId: "org-1",
        adminId: "admin1",
        approvalNotes: undefined,
      });
    });
  });

  describe("inspect route", () => {
    it("requires orgId for inspection", async () => {
      authMock.mockResolvedValue({
        user: { id: "ops1", role: "TEAM_MEMBER", subRole: "OPERATIONS_MANAGER" },
      });

      const req = new NextRequest("http://test.local/api/souq/returns/inspect", {
        method: "POST",
        body: JSON.stringify({
          rmaId: "r1",
          condition: "good",
          restockable: true,
        }),
      });

      const res = await inspectRoute(req);
      expect(res.status).toBe(403);
      expect(inspectReturnMock).not.toHaveBeenCalled();
    });
  });

  describe("refund route", () => {
    it("denies refund when RMA org differs from caller org (non-platform admin)", async () => {
      authMock.mockResolvedValue({
        user: { id: "admin2", role: "ADMIN", isSuperAdmin: false, orgId: "org-1" },
      });
      findOneMock.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "r1",
          orgId: "org-2",
        }),
      });

      const req = new NextRequest("http://test.local/api/souq/returns/refund", {
        method: "POST",
        body: JSON.stringify({
          rmaId: "r1",
          refundAmount: 50,
          refundMethod: "wallet",
        }),
      });

      const res = await refundRoute(req);
      const payload = await res.json();
      expect(res.status).toBe(403);
      expect(processRefundMock).not.toHaveBeenCalled();
    });

    it("processes refund for SUPER_ADMIN without needing targetOrgId", async () => {
      authMock.mockResolvedValue({
        user: { id: "super1", role: "SUPER_ADMIN", isSuperAdmin: true, orgId: undefined },
      });
      findOneMock.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "r1",
          orgId: "org-3",
        }),
      });

      const req = new NextRequest("http://test.local/api/souq/returns/refund", {
        method: "POST",
        body: JSON.stringify({
          rmaId: "r1",
          refundAmount: 25,
          refundMethod: "wallet",
        }),
      });

      const res = await refundRoute(req);
      const payload = await res.json();
      expect(res.status).toBe(200);
      expect(processRefundMock).toHaveBeenCalledWith({
        rmaId: "r1",
        orgId: "org-3",
        refundAmount: 25,
        refundMethod: "wallet",
        processorId: "super1",
      });
    });
  });
});
