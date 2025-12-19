/**
 * STRICT v4.1 Backward Compatibility and Feature Tests
 * 
 * Tests for:
 * 1. Legacy role alias backward compatibility
 * 2. Team Member with/without sub-roles
 * 3. Data scope filter generation
 * 4. PII access control
 * 5. AI agent governance
 */

import { describe, it, expect } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  Role,
  SubRole,
  Plan,
  can,
  buildDataScopeFilter,
  computeAllowedModules,
  hasPIIAccess,
  validateAgentAccess,
  ModuleKey,
  normalizeRole,
  type ResourceCtx,
  type DataScopeFilter,
} from "@/domain/fm/fm.behavior";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

describe("STRICT v4.1 - Backward Compatibility", () => {
  describe("Legacy Role Aliases", () => {
    it("normalizes CORPORATE_ADMIN to ADMIN", () => {
      const normalized = normalizeRole("CORPORATE_ADMIN");
      expect(normalized).toBe(Role.ADMIN);
    });

    it("normalizes EMPLOYEE to TEAM_MEMBER", () => {
      const normalized = normalizeRole("EMPLOYEE");
      expect(normalized).toBe(Role.TEAM_MEMBER);
    });

    it("normalizes FINANCE to TEAM_MEMBER", () => {
      const normalized = normalizeRole("FINANCE");
      expect(normalized).toBe(Role.TEAM_MEMBER);
    });

    it("normalizes HR to TEAM_MEMBER", () => {
      const normalized = normalizeRole("HR");
      expect(normalized).toBe(Role.TEAM_MEMBER);
    });

    it("normalizes PROPERTY_OWNER to CORPORATE_OWNER", () => {
      const normalized = normalizeRole("PROPERTY_OWNER");
      expect(normalized).toBe(Role.CORPORATE_OWNER);
    });

    it("accepts canonical STRICT v4.1 roles as-is", () => {
      expect(normalizeRole(Role.SUPER_ADMIN)).toBe(Role.SUPER_ADMIN);
      expect(normalizeRole(Role.ADMIN)).toBe(Role.ADMIN);
      expect(normalizeRole(Role.TEAM_MEMBER)).toBe(Role.TEAM_MEMBER);
      expect(normalizeRole(Role.PROPERTY_MANAGER)).toBe(Role.PROPERTY_MANAGER);
    });
  });

  describe("Team Member without Sub-Role", () => {
    const ctx: ResourceCtx = {
      orgId: "org-123",
      plan: Plan.PRO,
      role: Role.TEAM_MEMBER,
      userId: "user-456",
      isOrgMember: true,
    };

    it("can access Dashboard module", () => {
      const allowed = can(ModuleKey.DASHBOARD, "view", ctx);
      expect(allowed).toBe(true);
    });

    it("can access Work Orders module", () => {
      const allowed = can(ModuleKey.WORK_ORDERS, "view", ctx);
      expect(allowed).toBe(true);
    });

    it("cannot access Finance module without sub-role", () => {
      const allowed = can(ModuleKey.FINANCE, "view", ctx);
      expect(allowed).toBe(false);
    });

    it("cannot access HR module without sub-role", () => {
      const allowed = can(ModuleKey.HR, "view", ctx);
      expect(allowed).toBe(false);
    });
  });
});

describe("STRICT v4.1 - Sub-Roles", () => {
  describe("Finance Officer Sub-Role", () => {
    it("grants access to Finance module", () => {
      const modules = computeAllowedModules(Role.TEAM_MEMBER, SubRole.FINANCE_OFFICER);
      expect(modules).toContain(ModuleKey.FINANCE);
      expect(modules).toContain(ModuleKey.DASHBOARD);
      expect(modules).toContain(ModuleKey.REPORTS);
    });

    it("does not grant access to HR module", () => {
      const modules = computeAllowedModules(Role.TEAM_MEMBER, SubRole.FINANCE_OFFICER);
      expect(modules).not.toContain(ModuleKey.HR);
    });
  });

  describe("HR Officer Sub-Role", () => {
    it("grants access to HR module", () => {
      const modules = computeAllowedModules(Role.TEAM_MEMBER, SubRole.HR_OFFICER);
      expect(modules).toContain(ModuleKey.HR);
      expect(modules).toContain(ModuleKey.DASHBOARD);
      expect(modules).toContain(ModuleKey.REPORTS);
    });

    it("does not grant access to Finance module", () => {
      const modules = computeAllowedModules(Role.TEAM_MEMBER, SubRole.HR_OFFICER);
      expect(modules).not.toContain(ModuleKey.FINANCE);
    });
  });

  describe("Support Agent Sub-Role", () => {
    it("grants access to Support and CRM modules", () => {
      const modules = computeAllowedModules(Role.TEAM_MEMBER, SubRole.SUPPORT_AGENT);
      expect(modules).toContain(ModuleKey.SUPPORT);
      expect(modules).toContain(ModuleKey.CRM);
      expect(modules).toContain(ModuleKey.DASHBOARD);
      expect(modules).toContain(ModuleKey.REPORTS);
    });
  });

  describe("Operations Manager Sub-Role", () => {
    it("grants access to operational modules", () => {
      const modules = computeAllowedModules(Role.TEAM_MEMBER, SubRole.OPERATIONS_MANAGER);
      expect(modules).toContain(ModuleKey.WORK_ORDERS);
      expect(modules).toContain(ModuleKey.PROPERTIES);
      expect(modules).toContain(ModuleKey.SUPPORT);
      expect(modules).toContain(ModuleKey.DASHBOARD);
      expect(modules).toContain(ModuleKey.REPORTS);
    });
  });
});

describe("STRICT v4.1 - Module Access via can()", () => {
  const baseCtx = {
    orgId: "org-123",
    plan: Plan.PRO,
    role: Role.TEAM_MEMBER,
    isOrgMember: true,
    userId: "tm-1",
  } as const;

  it("allows Finance Officer to access Finance module", () => {
    const allowed = can(ModuleKey.FINANCE, "view", {
      ...baseCtx,
      subRole: SubRole.FINANCE_OFFICER,
    });
    expect(allowed).toBe(true);
  });

  it("allows HR Officer to access HR module", () => {
    const allowed = can(ModuleKey.HR, "view", {
      ...baseCtx,
      subRole: SubRole.HR_OFFICER,
    });
    expect(allowed).toBe(true);
  });

  it("denies Support Agent access to Finance module", () => {
    const allowed = can(ModuleKey.FINANCE, "view", {
      ...baseCtx,
      subRole: SubRole.SUPPORT_AGENT,
    });
    expect(allowed).toBe(false);
  });
});

describe("STRICT v4.1 - Data Scope Filters", () => {
  describe("SUPER_ADMIN", () => {
    it("has no filter (cross-org access)", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.ENTERPRISE,
        role: Role.SUPER_ADMIN,
        userId: "superadmin-1",
        isOrgMember: false,
      };

      const filter = buildDataScopeFilter(ctx);
      expect(filter).toEqual({});
    });
  });

  describe("ADMIN", () => {
    it("filters by org_id only", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.PRO,
        role: Role.ADMIN,
        userId: "admin-1",
        isOrgMember: true,
      };

      const filter = buildDataScopeFilter(ctx);
      expect(filter).toEqual({ org_id: "org-123" });
    });
  });

  describe("TECHNICIAN", () => {
    it("filters by org_id and assigned_to_user_id", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.PRO,
        role: Role.TECHNICIAN,
        userId: "tech-456",
        isOrgMember: true,
      };

      const filter = buildDataScopeFilter(ctx);
      expect(filter).toEqual({
        org_id: "org-123",
        assigned_to_user_id: "tech-456",
      });
    });
  });

  describe("PROPERTY_MANAGER", () => {
    it("filters by org_id and assigned properties", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.PRO,
        role: Role.PROPERTY_MANAGER,
        userId: "pm-789",
        isOrgMember: true,
        assignedProperties: ["prop-1", "prop-2", "prop-3"],
      };

      const filter = buildDataScopeFilter(ctx);
      expect(filter).toEqual({
        org_id: "org-123",
        property_id: { $in: ["prop-1", "prop-2", "prop-3"] },
      });
    });

    it("only uses org_id if no assigned properties", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.PRO,
        role: Role.PROPERTY_MANAGER,
        userId: "pm-789",
        isOrgMember: true,
      };

      const filter = buildDataScopeFilter(ctx);
      expect(filter).toEqual({ org_id: "org-123" });
    });
  });

  describe("TENANT", () => {
    it("filters by org_id and unit_id (tenant scoped to their units)", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.STANDARD,
        role: Role.TENANT,
        userId: "tenant-101",
        isOrgMember: true,
        units: ["unit-1", "unit-2"],
      };

      const filter = buildDataScopeFilter(ctx);
      // TENANT role is scoped by org_id + their assigned units, not tenant_id
      expect(filter).toEqual({
        org_id: "org-123",
        unit_id: { $in: ["unit-1", "unit-2"] },
      });
    });
  });

  describe("VENDOR", () => {
    it("filters by org_id and vendor_id", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.STANDARD,
        role: Role.VENDOR,
        userId: "vendor-202",
        isOrgMember: false,
        vendorId: "vendor-company-xyz",
      };

      const filter = buildDataScopeFilter(ctx);
      expect(filter).toEqual({
        org_id: "org-123",
        vendor_id: "vendor-company-xyz",
      });
    });
  });

  describe("GUEST", () => {
    it("filters by org_id and is_public only", () => {
      const ctx: ResourceCtx = {
        orgId: "org-123",
        plan: Plan.FREE,
        role: Role.GUEST,
        userId: "guest-303",
        isOrgMember: false,
      };

      const filter = buildDataScopeFilter(ctx);
      expect(filter).toEqual({
        org_id: "org-123",
        is_public: true,
      });
    });
  });
});

describe("STRICT v4.1 - PII Access Control", () => {
  it("grants PII access to SUPER_ADMIN", () => {
    const hasAccess = hasPIIAccess(Role.SUPER_ADMIN);
    expect(hasAccess).toBe(true);
  });

  it("grants PII access to ADMIN", () => {
    const hasAccess = hasPIIAccess(Role.ADMIN);
    expect(hasAccess).toBe(true);
  });

  it("grants PII access to HR_OFFICER sub-role", () => {
    const hasAccess = hasPIIAccess(Role.TEAM_MEMBER, SubRole.HR_OFFICER);
    expect(hasAccess).toBe(true);
  });

  it("denies PII access to FINANCE_OFFICER sub-role", () => {
    const hasAccess = hasPIIAccess(Role.TEAM_MEMBER, SubRole.FINANCE_OFFICER);
    expect(hasAccess).toBe(false);
  });

  it("denies PII access to TEAM_MEMBER without sub-role", () => {
    const hasAccess = hasPIIAccess(Role.TEAM_MEMBER);
    expect(hasAccess).toBe(false);
  });

  it("denies PII access to TECHNICIAN", () => {
    const hasAccess = hasPIIAccess(Role.TECHNICIAN);
    expect(hasAccess).toBe(false);
  });

  it("denies PII access to PROPERTY_MANAGER", () => {
    const hasAccess = hasPIIAccess(Role.PROPERTY_MANAGER);
    expect(hasAccess).toBe(false);
  });

  it("denies PII access to VENDOR", () => {
    const hasAccess = hasPIIAccess(Role.VENDOR);
    expect(hasAccess).toBe(false);
  });
});

describe("STRICT v4.1 - AI Agent Governance", () => {
  it("validates agent must have assumed_user_id", () => {
    const ctxWithoutAssumedUser: ResourceCtx = {
      orgId: "org-123",
      plan: Plan.PRO,
      role: Role.ADMIN,
      userId: "admin-1",
      isOrgMember: true,
      agentId: "agent-copilot-1",
    };

    const valid = validateAgentAccess(ctxWithoutAssumedUser);
    expect(valid).toBe(false);
  });

  it("validates agent with assumed_user_id", () => {
    const ctxWithAssumedUser: ResourceCtx = {
      orgId: "org-123",
      plan: Plan.PRO,
      role: Role.ADMIN,
      userId: "admin-1",
      isOrgMember: true,
      agentId: "agent-copilot-1",
      assumedUserId: "admin-1",
    };

    const valid = validateAgentAccess(ctxWithAssumedUser);
    expect(valid).toBe(true);
  });

  it("allows non-agent requests without assumed_user_id", () => {
    const ctxRegularUser: ResourceCtx = {
      orgId: "org-123",
      plan: Plan.PRO,
      role: Role.ADMIN,
      userId: "admin-1",
      isOrgMember: true,
    };

    const valid = validateAgentAccess(ctxRegularUser);
    expect(valid).toBe(true);
  });
});

describe("STRICT v4.1 - Integration Tests", () => {
  it("combines sub-role with data scope filter", () => {
    const ctx: ResourceCtx = {
      orgId: "org-123",
      plan: Plan.PRO,
      role: Role.TEAM_MEMBER,
      subRole: SubRole.FINANCE_OFFICER,
      userId: "finance-1",
      isOrgMember: true,
    };

    const modules = computeAllowedModules(ctx.role, ctx.subRole);
    const filter = buildDataScopeFilter(ctx);

    expect(modules).toContain(ModuleKey.FINANCE);
    expect(filter).toEqual({ org_id: "org-123" });
  });

  it("combines Property Manager with assigned properties", () => {
    const ctx: ResourceCtx = {
      orgId: "org-123",
      plan: Plan.PRO,
      role: Role.PROPERTY_MANAGER,
      userId: "pm-1",
      isOrgMember: true,
      assignedProperties: ["prop-A", "prop-B"],
    };

    const filter = buildDataScopeFilter(ctx);
    const hasPII = hasPIIAccess(ctx.role);

    expect(filter).toEqual({
      org_id: "org-123",
      property_id: { $in: ["prop-A", "prop-B"] },
    });
    expect(hasPII).toBe(false);
  });

  it("validates agent acting as HR Officer", () => {
    const ctx: ResourceCtx = {
      orgId: "org-123",
      plan: Plan.PRO,
      role: Role.TEAM_MEMBER,
      subRole: SubRole.HR_OFFICER,
      userId: "hr-1",
      isOrgMember: true,
      agentId: "agent-copilot-1",
      assumedUserId: "hr-1",
    };

    const modules = computeAllowedModules(ctx.role, ctx.subRole);
    const hasPII = hasPIIAccess(ctx.role, ctx.subRole);
    const agentValid = validateAgentAccess(ctx);

    expect(modules).toContain(ModuleKey.HR);
    expect(hasPII).toBe(true);
    expect(agentValid).toBe(true);
  });
});
