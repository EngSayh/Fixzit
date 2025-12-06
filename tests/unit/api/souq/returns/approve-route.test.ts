import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
const mockApproveReturn = vi.hoisted(() => vi.fn());
const mockAgentAuditLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    approveReturn: mockApproveReturn,
    rejectReturn: vi.fn(),
  },
}));

vi.mock("@/server/models/AgentAuditLog", () => ({
  AgentAuditLog: { create: mockAgentAuditLogCreate },
}));

let POST: typeof import("@/app/api/souq/returns/approve/route").POST;

describe("/api/souq/returns/approve – audit logging", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/souq/returns/approve/route");
    POST = mod.POST;
  });

  it("records an audit log when platform admin approves across orgs", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        orgId: "org-session",
        isSuperAdmin: true,
      },
    });
    mockApproveReturn.mockResolvedValue(undefined);
    mockAgentAuditLogCreate.mockResolvedValue(undefined);

    const req = new NextRequest("http://test.local", {
      method: "POST",
      body: JSON.stringify({
        rmaId: "RMA-123",
        approve: true,
        targetOrgId: "org-target",
      }),
    } as RequestInit);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockApproveReturn).toHaveBeenCalledWith({
      rmaId: "RMA-123",
      orgId: "org-target",
      adminId: "admin-1",
      approvalNotes: undefined,
    });
    expect(mockAgentAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(mockAgentAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "admin-1",
        assumed_user_id: "admin-1",
        orgId: "org-target",
        resource_id: "RMA-123",
        success: true,
      }),
    );
  });
});
