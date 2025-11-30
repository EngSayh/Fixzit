import { renderHook } from "@testing-library/react";
import { useFMPermissions } from "@/hooks/useFMPermissions";
import { useSession } from "next-auth/react";
import { useCurrentOrg } from "@/contexts/CurrentOrgContext";
// Import from fm.types (client-safe, matching hook)
import { Role, SubmoduleKey, Plan } from "@/domain/fm/fm.types";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));
vi.mock("@/contexts/CurrentOrgContext", () => ({
  useCurrentOrg: vi.fn(),
}));

// Cast mocks
const mockUseSession = useSession as unknown as ReturnType<typeof vi.fn>;
const mockUseCurrentOrg = useCurrentOrg as unknown as ReturnType<typeof vi.fn>;

describe("useFMPermissions", () => {
  const mockSession = (
    role: string,
    orgId: string | null = null,
    userId: string = "user-123",
  ) => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: userId,
          role,
          orgId,
        },
      },
      status: "authenticated",
    });
  };

  const mockOrg = (plan: Plan) => {
    mockUseCurrentOrg.mockReturnValue({
      org: {
        id: "org-abc",
        plan,
      },
      isLoading: false,
    });
  };

  beforeEach(() => {
    // Default mocks
    mockSession(Role.TENANT, "org-abc", "user-tenant-1");
    mockOrg(Plan.PRO);
  });

  it("🟥 should correctly assess isOrgMember=false for GUEST", () => {
    mockSession(Role.GUEST, null); // No orgId
    mockOrg(Plan.STARTER);
    const { result } = renderHook(() => useFMPermissions());

    // Check the internal context logic
    const can = result.current.can(SubmoduleKey.PROP_LIST, "view");
    // `can` itself will be false for a GUEST, but we are testing the hook's context
    // We can't directly test `isOrgMember`, but we know the `plan` defaults to STARTER
    expect(result.current.plan).toBe(Plan.STARTER);
    expect(result.current.orgId).toBe("");
    expect(result.current.role).toBe(Role.GUEST);
    expect(can).toBe(false); // Guest should not have access
  });

  it("🟥 should correctly assess isOrgMember=true for a TENANT", () => {
    mockSession(Role.TENANT, "org-abc");
    mockOrg(Plan.PRO);
    const { result } = renderHook(() => useFMPermissions());
    expect(result.current.orgId).toBe("org-abc");
    expect(result.current.role).toBe(Role.TENANT);
    expect(result.current.plan).toBe(Plan.PRO);
  });

  it("🟧 should default to STARTER plan if org context is missing", () => {
    mockSession(Role.CORPORATE_ADMIN, "org-abc");
    mockUseCurrentOrg.mockReturnValue({ org: null, isLoading: false }); // Mock no org context
    const { result } = renderHook(() => useFMPermissions());

    expect(result.current.plan).toBe(Plan.STARTER);
  });

  it("🟩 should return correct convenience booleans for a CORPORATE_ADMIN", () => {
    mockSession(Role.CORPORATE_ADMIN, "org-abc");
    mockOrg(Plan.PRO);
    const { result } = renderHook(() => useFMPermissions());

    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.isManagement()).toBe(true);
    expect(result.current.canCreateWO()).toBe(true);
    expect(result.current.canAssignWO()).toBe(true);
    expect(result.current.canManageProperties()).toBe(true);
  });

  it("🟩 should return correct convenience booleans for a TENANT", () => {
    mockSession(Role.TENANT, "org-abc");
    mockOrg(Plan.PRO);
    const { result } = renderHook(() => useFMPermissions());

    expect(result.current.isAdmin()).toBe(false);
    expect(result.current.isManagement()).toBe(false);
    expect(result.current.canCreateWO()).toBe(true);
    expect(result.current.canAssignWO()).toBe(false);
    expect(result.current.canApproveWO()).toBe(false);
    expect(result.current.canManageProperties()).toBe(false);
    expect(result.current.canViewFinancials()).toBe(false);
  });

  it("🟥 should prevent privilege escalation by using session-derived org membership", () => {
    // Simulate a GUEST user trying to access another org's resources
    mockSession(Role.GUEST, null); // No orgId
    mockOrg(Plan.STARTER);
    const { result } = renderHook(() => useFMPermissions());

    // Try to check permissions against a specific org
    const canViewOtherOrg = result.current.can(SubmoduleKey.PROP_LIST, "view", {
      orgId: "other-org-id",
    });

    // Should be denied because isOrgMember is false
    expect(canViewOtherOrg).toBe(false);
  });
});
