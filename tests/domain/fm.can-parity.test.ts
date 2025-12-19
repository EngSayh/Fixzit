/**
 * RBAC `can()` Client/Server Parity Tests
 * 
 * STRICT v4.1: Ensures fm.types.ts (client) and fm.behavior.ts (server)
 * produce identical results for the same inputs.
 * 
 * This prevents drift between client-side permission checks (UI visibility)
 * and server-side authorization (API access control).
 */
import { describe, it, expect } from 'vitest';
import {
  can as canServer,
  Role,
  SubRole,
  Plan,
  SubmoduleKey,
  ModuleKey,
  type ResourceCtx as ServerResourceCtx,
  ROLE_ACTIONS as SERVER_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as SERVER_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as SERVER_SUBMODULE_REQUIRED_SUBROLE,
  PLAN_GATES as SERVER_PLAN_GATES,
  computeAllowedModules as computeAllowedModulesServer,
} from '@/domain/fm/fm.behavior';

import {
  can as canClient,
  ROLE_ACTIONS as CLIENT_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as CLIENT_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as CLIENT_SUBMODULE_REQUIRED_SUBROLE,
  PLAN_GATES as CLIENT_PLAN_GATES,
  type ResourceCtx as ClientResourceCtx,
  computeAllowedModules as computeAllowedModulesClient,
} from '@/domain/fm/fm.types';

import {
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

  computeAllowedModules as computeAllowedModulesLite,
  PLAN_GATES as LITE_PLAN_GATES,
  ROLE_ACTIONS as LITE_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as LITE_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as LITE_SUBMODULE_REQUIRED_SUBROLE,
  canClient as canLite,
  type ClientResourceCtx as LiteClientResourceCtx,
} from '@/domain/fm/fm-lite';

/**
 * Helper to create a minimal valid context
 */
function createTestCtx(overrides: Partial<ServerResourceCtx> = {}): ServerResourceCtx {
  return {
    orgId: 'test-org-123',
    plan: Plan.ENTERPRISE,
    role: Role.ADMIN,
    userId: 'test-user-123',
    isOrgMember: true,
    ...overrides,
  };
}

/**
 * Convert server ctx to lite client ctx for parity checks
 */
function toLiteCtx(ctx: ServerResourceCtx): LiteClientResourceCtx {
  return {
    role: ctx.role,
    subRole: ctx.subRole,
    plan: ctx.plan,
    userId: ctx.userId,
    orgId: ctx.orgId,
    propertyId: ctx.propertyId,
    isOrgMember: ctx.isOrgMember,
    isTechnicianAssigned: ctx.isTechnicianAssigned,
  };
}

describe('RBAC can() Client/Server Parity', () => {
  describe('Static Data Structures Parity', () => {
    it('ROLE_ACTIONS keys match between client and server', () => {
      const serverRoles = Object.keys(SERVER_ROLE_ACTIONS).sort();
      const clientRoles = Object.keys(CLIENT_ROLE_ACTIONS).sort();
      expect(serverRoles).toEqual(clientRoles);
    });

    it('ROLE_ACTIONS keys match between lite and server', () => {
      const serverRoles = Object.keys(SERVER_ROLE_ACTIONS).sort();
      const liteRoles = Object.keys(LITE_ROLE_ACTIONS).sort();
      expect(liteRoles).toEqual(serverRoles);
    });

    it('ROLE_ACTIONS submodule keys match for each role', () => {
      for (const role of Object.values(Role)) {
        const serverSubmodules = Object.keys(SERVER_ROLE_ACTIONS[role] || {}).sort();
        const clientSubmodules = Object.keys(CLIENT_ROLE_ACTIONS[role] || {}).sort();
        expect(serverSubmodules, `Role ${role} submodules mismatch`).toEqual(clientSubmodules);
      }
    });

    it('ROLE_ACTIONS submodule keys match for each role (lite)', () => {
      for (const role of Object.values(Role)) {
        const serverSubmodules = Object.keys(SERVER_ROLE_ACTIONS[role] || {}).sort();
        const liteSubmodules = Object.keys(LITE_ROLE_ACTIONS[role] || {}).sort();
        expect(serverSubmodules, `Role ${role} submodules mismatch (lite)`).toEqual(liteSubmodules);
      }
    });

    it('SUB_ROLE_ACTIONS match between client and server', () => {
      for (const subRole of Object.values(SubRole)) {
        const serverActions = SERVER_SUB_ROLE_ACTIONS[subRole];
        const clientActions = CLIENT_SUB_ROLE_ACTIONS[subRole];
        
        const serverKeys = Object.keys(serverActions || {}).sort();
        const clientKeys = Object.keys(clientActions || {}).sort();
        expect(serverKeys, `SubRole ${subRole} submodule keys mismatch`).toEqual(clientKeys);
        
        // Check action arrays match
        for (const key of serverKeys) {
          const serverActionList = (serverActions as Record<string, string[]>)?.[key]?.sort() ?? [];
          const clientActionList = (clientActions as Record<string, string[]>)?.[key]?.sort() ?? [];
          expect(serverActionList, `SubRole ${subRole} actions for ${key} mismatch`).toEqual(clientActionList);
        }
      }
    });

    it('SUB_ROLE_ACTIONS match between lite and server', () => {
      for (const subRole of Object.values(SubRole)) {
        const serverActions = SERVER_SUB_ROLE_ACTIONS[subRole];
        const liteActions = LITE_SUB_ROLE_ACTIONS[subRole];

        const serverKeys = Object.keys(serverActions || {}).sort();
        const liteKeys = Object.keys(liteActions || {}).sort();
        expect(serverKeys, `SubRole ${subRole} submodule keys mismatch (lite)`).toEqual(liteKeys);

        for (const key of serverKeys) {
          const serverActionList = (serverActions as Record<string, string[]>)?.[key]?.sort() ?? [];
          const liteActionList = (liteActions as Record<string, string[]>)?.[key]?.sort() ?? [];
          expect(serverActionList, `SubRole ${subRole} actions for ${key} mismatch (lite)`).toEqual(liteActionList);
        }
      }
    });

    it('SUBMODULE_REQUIRED_SUBROLE matches between client and server', () => {
      const serverKeys = Object.keys(SERVER_SUBMODULE_REQUIRED_SUBROLE).sort();
      const clientKeys = Object.keys(CLIENT_SUBMODULE_REQUIRED_SUBROLE).sort();
      expect(serverKeys).toEqual(clientKeys);
      
      for (const key of serverKeys) {
        const serverSubRoles = SERVER_SUBMODULE_REQUIRED_SUBROLE[key as SubmoduleKey]?.sort() ?? [];
        const clientSubRoles = CLIENT_SUBMODULE_REQUIRED_SUBROLE[key as SubmoduleKey]?.sort() ?? [];
        expect(serverSubRoles, `SUBMODULE_REQUIRED_SUBROLE[${key}] mismatch`).toEqual(clientSubRoles);
      }
    });

    it('SUBMODULE_REQUIRED_SUBROLE matches between lite and server', () => {
      const serverKeys = Object.keys(SERVER_SUBMODULE_REQUIRED_SUBROLE).sort();
      const liteKeys = Object.keys(LITE_SUBMODULE_REQUIRED_SUBROLE).sort();
      expect(serverKeys).toEqual(liteKeys);

      for (const key of serverKeys) {
        const serverSubRoles = SERVER_SUBMODULE_REQUIRED_SUBROLE[key as SubmoduleKey]?.sort() ?? [];
        const liteSubRoles = LITE_SUBMODULE_REQUIRED_SUBROLE[key as SubmoduleKey]?.sort() ?? [];
        expect(serverSubRoles, `SUBMODULE_REQUIRED_SUBROLE[${key}] mismatch (lite)`).toEqual(liteSubRoles);
      }
    });

    it('PLAN_GATES keys match between client and server', () => {
      const serverPlans = Object.keys(SERVER_PLAN_GATES).sort();
      const clientPlans = Object.keys(CLIENT_PLAN_GATES).sort();
      expect(serverPlans).toEqual(clientPlans);
    });

    it('PLAN_GATES match between lite and server', () => {
      const serverPlans = Object.keys(SERVER_PLAN_GATES).sort();
      const litePlans = Object.keys(LITE_PLAN_GATES).sort();
      expect(serverPlans).toEqual(litePlans);

      for (const plan of serverPlans) {
        const serverGate = SERVER_PLAN_GATES[plan as Plan] || {};
        const liteGate = LITE_PLAN_GATES[plan as Plan] || {};
        expect(serverGate, `PLAN_GATES mismatch for plan ${plan} (lite)`).toEqual(liteGate);
      }
    });
  });

  describe('can() Behavioral Parity', () => {
    // Test matrix: roles × submodules × actions
    const testRoles = [Role.ADMIN, Role.PROPERTY_MANAGER, Role.TEAM_MEMBER, Role.TECHNICIAN, Role.TENANT];
    const testSubmodules: SubmoduleKey[] = [
      'WO_CREATE',
      'WO_TRACK_ASSIGN',
      'FINANCE_INVOICES',
      'HR_EMPLOYEE_DIRECTORY',
      'SUPPORT_TICKETS',
      'PROP_LIST',
    ];
    const testActions = ['view', 'create', 'update', 'delete', 'export', 'approve'];

    it('can() returns same result for ADMIN role', () => {
      const ctx = createTestCtx({ role: Role.ADMIN });
      
      for (const submodule of testSubmodules) {
        for (const action of testActions) {
          const serverResult = canServer(submodule, action, ctx);
          const clientResult = canClient(submodule, action, ctx as ClientResourceCtx);
          expect(
            serverResult,
            `Parity fail: can(${submodule}, ${action}) for ADMIN - server=${serverResult}, client=${clientResult}`
          ).toBe(clientResult);
        }
      }
    });

    it('can() returns same result for TEAM_MEMBER without sub-role', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: undefined });
      
      for (const submodule of testSubmodules) {
        for (const action of testActions) {
          const serverResult = canServer(submodule, action, ctx);
          const clientResult = canClient(submodule, action, ctx as ClientResourceCtx);
          expect(
            serverResult,
            `Parity fail: can(${submodule}, ${action}) for TEAM_MEMBER (no subRole) - server=${serverResult}, client=${clientResult}`
          ).toBe(clientResult);
        }
      }
    });

    it('can() returns same result for TEAM_MEMBER + FINANCE_OFFICER', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.FINANCE_OFFICER });
      
      for (const submodule of testSubmodules) {
        for (const action of testActions) {
          const serverResult = canServer(submodule, action, ctx);
          const clientResult = canClient(submodule, action, ctx as ClientResourceCtx);
          expect(
            serverResult,
            `Parity fail: can(${submodule}, ${action}) for TEAM_MEMBER+FINANCE_OFFICER - server=${serverResult}, client=${clientResult}`
          ).toBe(clientResult);
        }
      }
    });

    it('can() returns same result for TEAM_MEMBER + HR_OFFICER', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.HR_OFFICER });
      
      for (const submodule of testSubmodules) {
        for (const action of testActions) {
          const serverResult = canServer(submodule, action, ctx);
          const clientResult = canClient(submodule, action, ctx as ClientResourceCtx);
          expect(
            serverResult,
            `Parity fail: can(${submodule}, ${action}) for TEAM_MEMBER+HR_OFFICER - server=${serverResult}, client=${clientResult}`
          ).toBe(clientResult);
        }
      }
    });

    it('can() returns same result for TEAM_MEMBER + SUPPORT_AGENT', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.SUPPORT_AGENT });
      
      for (const submodule of testSubmodules) {
        for (const action of testActions) {
          const serverResult = canServer(submodule, action, ctx);
          const clientResult = canClient(submodule, action, ctx as ClientResourceCtx);
          expect(
            serverResult,
            `Parity fail: can(${submodule}, ${action}) for TEAM_MEMBER+SUPPORT_AGENT - server=${serverResult}, client=${clientResult}`
          ).toBe(clientResult);
        }
      }
    });

    it('can() returns same result for TEAM_MEMBER + OPERATIONS_MANAGER', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.OPERATIONS_MANAGER });
      
      for (const submodule of testSubmodules) {
        for (const action of testActions) {
          const serverResult = canServer(submodule, action, ctx);
          const clientResult = canClient(submodule, action, ctx as ClientResourceCtx);
          expect(
            serverResult,
            `Parity fail: can(${submodule}, ${action}) for TEAM_MEMBER+OPERATIONS_MANAGER - server=${serverResult}, client=${clientResult}`
          ).toBe(clientResult);
        }
      }
    });

    it('can() returns same result for TECHNICIAN role', () => {
      const ctx = createTestCtx({ role: Role.TECHNICIAN });
      
      for (const submodule of testSubmodules) {
        for (const action of testActions) {
          const serverResult = canServer(submodule, action, ctx);
          const clientResult = canClient(submodule, action, ctx as ClientResourceCtx);
          expect(
            serverResult,
            `Parity fail: can(${submodule}, ${action}) for TECHNICIAN - server=${serverResult}, client=${clientResult}`
          ).toBe(clientResult);
        }
      }
    });
  });

  describe('Sub-Role Enforcement', () => {
    it('FINANCE_OFFICER can access FINANCE_INVOICES', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.FINANCE_OFFICER });
      
      expect(canServer('FINANCE_INVOICES', 'view', ctx)).toBe(true);
      expect(canClient('FINANCE_INVOICES', 'view', ctx as ClientResourceCtx)).toBe(true);
      expect(canServer('FINANCE_INVOICES', 'create', ctx)).toBe(true);
      expect(canClient('FINANCE_INVOICES', 'create', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TEAM_MEMBER without sub-role cannot access FINANCE_INVOICES', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: undefined });
      
      expect(canServer('FINANCE_INVOICES', 'view', ctx)).toBe(false);
      expect(canClient('FINANCE_INVOICES', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('HR_OFFICER can access HR_PAYROLL', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.HR_OFFICER });
      
      expect(canServer('HR_PAYROLL', 'view', ctx)).toBe(true);
      expect(canClient('HR_PAYROLL', 'view', ctx as ClientResourceCtx)).toBe(true);
      expect(canServer('HR_PAYROLL', 'approve', ctx)).toBe(true);
      expect(canClient('HR_PAYROLL', 'approve', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TEAM_MEMBER without sub-role cannot access HR_PAYROLL', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: undefined });
      
      expect(canServer('HR_PAYROLL', 'view', ctx)).toBe(false);
      expect(canClient('HR_PAYROLL', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('SUPPORT_AGENT can access SUPPORT_TICKETS', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.SUPPORT_AGENT });
      
      expect(canServer('SUPPORT_TICKETS', 'view', ctx)).toBe(true);
      expect(canClient('SUPPORT_TICKETS', 'view', ctx as ClientResourceCtx)).toBe(true);
      expect(canServer('SUPPORT_TICKETS', 'create', ctx)).toBe(true);
      expect(canClient('SUPPORT_TICKETS', 'create', ctx as ClientResourceCtx)).toBe(true);
    });

    it('OPERATIONS_MANAGER can access MARKETPLACE_VENDORS', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: SubRole.OPERATIONS_MANAGER });
      
      expect(canServer('MARKETPLACE_VENDORS', 'view', ctx)).toBe(true);
      expect(canClient('MARKETPLACE_VENDORS', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TEAM_MEMBER without sub-role cannot access MARKETPLACE_VENDORS', () => {
      const ctx = createTestCtx({ role: Role.TEAM_MEMBER, subRole: undefined });
      
      expect(canServer('MARKETPLACE_VENDORS', 'view', ctx)).toBe(false);
      expect(canClient('MARKETPLACE_VENDORS', 'view', ctx as ClientResourceCtx)).toBe(false);
    });
  });

  describe('Plan Gate Parity', () => {
    it('STARTER plan blocks FINANCE_INVOICES', () => {
      const ctx = createTestCtx({ plan: Plan.STARTER, role: Role.ADMIN });
      
      expect(canServer('FINANCE_INVOICES', 'view', ctx)).toBe(false);
      expect(canClient('FINANCE_INVOICES', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('STANDARD plan allows FINANCE_INVOICES', () => {
      const ctx = createTestCtx({ plan: Plan.STANDARD, role: Role.ADMIN });
      
      expect(canServer('FINANCE_INVOICES', 'view', ctx)).toBe(true);
      expect(canClient('FINANCE_INVOICES', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('ENTERPRISE plan allows SYSTEM_USERS', () => {
      const ctx = createTestCtx({ plan: Plan.ENTERPRISE, role: Role.ADMIN });
      
      expect(canServer('SYSTEM_USERS', 'view', ctx)).toBe(true);
      expect(canClient('SYSTEM_USERS', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('PRO plan blocks SYSTEM_USERS', () => {
      const ctx = createTestCtx({ plan: Plan.PRO, role: Role.ADMIN });
      
      expect(canServer('SYSTEM_USERS', 'view', ctx)).toBe(false);
      expect(canClient('SYSTEM_USERS', 'view', ctx as ClientResourceCtx)).toBe(false);
    });
  });

  describe('Tenant Create Parity', () => {
    it('TENANT create denied when unitId not in units array', () => {
      const ctx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-user-123',
        requesterUserId: 'tenant-user-123',
        unitId: 'unit-999',
        units: ['unit-001', 'unit-002'],
      });
      
      // Create action should fail when unit not accessible
      expect(canServer('WO_CREATE', 'create', ctx)).toBe(false);
      expect(canClient('WO_CREATE', 'create', ctx as ClientResourceCtx)).toBe(false);
    });

    it('TENANT create allowed when unitId in units array', () => {
      const ctx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-user-123',
        requesterUserId: 'tenant-user-123',
        unitId: 'unit-001',
        units: ['unit-001', 'unit-002'],
      });
      
      // Create action should succeed when unit accessible
      expect(canServer('WO_CREATE', 'create', ctx)).toBe(true);
      expect(canClient('WO_CREATE', 'create', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TENANT create denied when requesterId !== userId', () => {
      const ctx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-user-123',
        requesterUserId: 'different-user-456',
        unitId: 'unit-001',
        units: ['unit-001'],
      });
      
      // Create action should fail when requester is different
      expect(canServer('WO_CREATE', 'create', ctx)).toBe(false);
      expect(canClient('WO_CREATE', 'create', ctx as ClientResourceCtx)).toBe(false);
    });

    it('TENANT create allowed when requesterId === userId and no unit context', () => {
      const ctx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-user-123',
        requesterUserId: 'tenant-user-123',
        // No unitId or units provided
      });
      
      // Create action should succeed when requester matches owner
      expect(canServer('WO_CREATE', 'create', ctx)).toBe(true);
      expect(canClient('WO_CREATE', 'create', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TENANT view denied when requesterId !== userId', () => {
      const ctx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-user-123',
        requesterUserId: 'different-user-456',
      });
      
      // View action should fail when requester is different
      expect(canServer('WO_CREATE', 'view', ctx)).toBe(false);
      expect(canClient('WO_CREATE', 'view', ctx as ClientResourceCtx)).toBe(false);
    });
  });

  describe('Property Scoping Parity', () => {
    it('CORPORATE_OWNER allowed when isOwnerOfProperty', () => {
      const ctx = createTestCtx({
        role: Role.CORPORATE_OWNER,
        propertyId: 'prop-123',
        isOwnerOfProperty: true,
        assignedProperties: [],
      });
      
      expect(canServer('PROP_LIST', 'view', ctx)).toBe(true);
      expect(canClient('PROP_LIST', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('CORPORATE_OWNER allowed when propertyId in assignedProperties', () => {
      const ctx = createTestCtx({
        role: Role.CORPORATE_OWNER,
        propertyId: 'prop-123',
        isOwnerOfProperty: false,
        assignedProperties: ['prop-123', 'prop-456'],
      });
      
      expect(canServer('PROP_LIST', 'view', ctx)).toBe(true);
      expect(canClient('PROP_LIST', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('CORPORATE_OWNER denied when neither owner nor assigned', () => {
      const ctx = createTestCtx({
        role: Role.CORPORATE_OWNER,
        propertyId: 'prop-123',
        isOwnerOfProperty: false,
        assignedProperties: ['prop-other'],
      });
      
      expect(canServer('PROP_LIST', 'view', ctx)).toBe(false);
      expect(canClient('PROP_LIST', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('PROPERTY_MANAGER allowed when propertyId in assignedProperties', () => {
      const ctx = createTestCtx({
        role: Role.PROPERTY_MANAGER,
        propertyId: 'prop-123',
        isOwnerOfProperty: false,
        assignedProperties: ['prop-123', 'prop-456'],
      });
      
      expect(canServer('PROP_LIST', 'view', ctx)).toBe(true);
      expect(canClient('PROP_LIST', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('PROPERTY_MANAGER denied when propertyId not in assignedProperties', () => {
      const ctx = createTestCtx({
        role: Role.PROPERTY_MANAGER,
        propertyId: 'prop-123',
        isOwnerOfProperty: false,
        assignedProperties: ['prop-other'],
      });
      
      expect(canServer('PROP_LIST', 'view', ctx)).toBe(false);
      expect(canClient('PROP_LIST', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('PROPERTY_MANAGER denied even with isOwnerOfProperty (must be assigned)', () => {
      const ctx = createTestCtx({
        role: Role.PROPERTY_MANAGER,
        propertyId: 'prop-123',
        isOwnerOfProperty: true,  // This shouldn't grant access
        assignedProperties: [],   // Not assigned
      });
      
      // Server behavior: Property Manager must be assigned, ownership alone doesn't grant access
      expect(canServer('PROP_LIST', 'view', ctx)).toBe(false);
      expect(canClient('PROP_LIST', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('SUPER_ADMIN bypasses property scoping', () => {
      const ctx = createTestCtx({
        role: Role.SUPER_ADMIN,
        propertyId: 'prop-123',
        isOwnerOfProperty: false,
        assignedProperties: [],
      });
      
      expect(canServer('PROP_LIST', 'view', ctx)).toBe(true);
      expect(canClient('PROP_LIST', 'view', ctx as ClientResourceCtx)).toBe(true);
    });
  });

  describe('computeAllowedModules Parity', () => {
    it('returns same modules for all roles across server/client/lite', () => {
      for (const role of Object.values(Role)) {
        const serverModules = computeAllowedModulesServer(role).sort();
        const clientModules = computeAllowedModulesClient(role).sort();
        const liteModules = computeAllowedModulesLite(role).sort();
        
        expect(
          serverModules,
          `computeAllowedModules(${role}) mismatch: server vs client`
        ).toEqual(clientModules);
        expect(
          serverModules,
          `computeAllowedModules(${role}) mismatch: server vs lite`
        ).toEqual(liteModules);
      }
    });

    it('TEAM_MEMBER + FINANCE_OFFICER unions base modules with Finance', () => {
      const serverModules = computeAllowedModulesServer(Role.TEAM_MEMBER, SubRole.FINANCE_OFFICER).sort();
      const clientModules = computeAllowedModulesClient(Role.TEAM_MEMBER, SubRole.FINANCE_OFFICER).sort();
      const liteModules = computeAllowedModulesLite(Role.TEAM_MEMBER, SubRole.FINANCE_OFFICER).sort();
      
      // Must include both base TEAM_MEMBER modules AND Finance
      expect(serverModules).toContain(ModuleKey.FINANCE);
      expect(serverModules).toContain(ModuleKey.DASHBOARD);
      
      // All three must match
      expect(serverModules, 'FINANCE_OFFICER modules: server vs client').toEqual(clientModules);
      expect(serverModules, 'FINANCE_OFFICER modules: server vs lite').toEqual(liteModules);
    });

    it('TEAM_MEMBER + HR_OFFICER unions base modules with HR', () => {
      const serverModules = computeAllowedModulesServer(Role.TEAM_MEMBER, SubRole.HR_OFFICER).sort();
      const clientModules = computeAllowedModulesClient(Role.TEAM_MEMBER, SubRole.HR_OFFICER).sort();
      const liteModules = computeAllowedModulesLite(Role.TEAM_MEMBER, SubRole.HR_OFFICER).sort();
      
      // Must include both base TEAM_MEMBER modules AND HR
      expect(serverModules).toContain(ModuleKey.HR);
      expect(serverModules).toContain(ModuleKey.DASHBOARD);
      
      // All three must match
      expect(serverModules, 'HR_OFFICER modules: server vs client').toEqual(clientModules);
      expect(serverModules, 'HR_OFFICER modules: server vs lite').toEqual(liteModules);
    });

    it('TEAM_MEMBER + SUPPORT_AGENT unions base modules with Support', () => {
      const serverModules = computeAllowedModulesServer(Role.TEAM_MEMBER, SubRole.SUPPORT_AGENT).sort();
      const clientModules = computeAllowedModulesClient(Role.TEAM_MEMBER, SubRole.SUPPORT_AGENT).sort();
      const liteModules = computeAllowedModulesLite(Role.TEAM_MEMBER, SubRole.SUPPORT_AGENT).sort();
      
      // Must include both base TEAM_MEMBER modules AND Support
      expect(serverModules).toContain(ModuleKey.SUPPORT);
      expect(serverModules).toContain(ModuleKey.DASHBOARD);
      
      // All three must match
      expect(serverModules, 'SUPPORT_AGENT modules: server vs client').toEqual(clientModules);
      expect(serverModules, 'SUPPORT_AGENT modules: server vs lite').toEqual(liteModules);
    });

    it('TEAM_MEMBER + OPERATIONS_MANAGER unions base modules with Work Orders & Properties', () => {
      const serverModules = computeAllowedModulesServer(Role.TEAM_MEMBER, SubRole.OPERATIONS_MANAGER).sort();
      const clientModules = computeAllowedModulesClient(Role.TEAM_MEMBER, SubRole.OPERATIONS_MANAGER).sort();
      const liteModules = computeAllowedModulesLite(Role.TEAM_MEMBER, SubRole.OPERATIONS_MANAGER).sort();
      
      // Must include both base TEAM_MEMBER modules AND Work Orders + Properties
      expect(serverModules).toContain(ModuleKey.WORK_ORDERS);
      expect(serverModules).toContain(ModuleKey.PROPERTIES);
      expect(serverModules).toContain(ModuleKey.DASHBOARD);
      
      // All three must match
      expect(serverModules, 'OPERATIONS_MANAGER modules: server vs client').toEqual(clientModules);
      expect(serverModules, 'OPERATIONS_MANAGER modules: server vs lite').toEqual(liteModules);
    });

    it('TEAM_MEMBER sub-roles do NOT lose base modules (union, not override)', () => {
      const baseModules = computeAllowedModulesServer(Role.TEAM_MEMBER).sort();
      
      for (const subRole of Object.values(SubRole)) {
        const serverModules = computeAllowedModulesServer(Role.TEAM_MEMBER, subRole).sort();
        const clientModules = computeAllowedModulesClient(Role.TEAM_MEMBER, subRole).sort();
        
        // Every base module must still be present (union, not replacement)
        for (const baseModule of baseModules) {
          expect(
            serverModules,
            `SubRole ${subRole} lost base module ${baseModule}`
          ).toContain(baseModule);
          expect(
            clientModules,
            `Client SubRole ${subRole} lost base module ${baseModule}`
          ).toContain(baseModule);
        }
      }
    });
  });

  describe('Tenant Requester Fallback Parity', () => {
    it('TENANT create allowed when requesterUserId is undefined (fallback to userId)', () => {
      const ctx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-user-123',
        requesterUserId: undefined,  // Server falls back to userId
        unitId: 'unit-001',
        units: ['unit-001'],
      });
      
      // Both should allow because requesterUserId ?? userId === userId
      expect(canServer('WO_CREATE', 'create', ctx)).toBe(true);
      expect(canClient('WO_CREATE', 'create', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TENANT view allowed when requesterUserId is undefined (fallback to userId)', () => {
      const ctx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-user-123',
        requesterUserId: undefined,  // Server falls back to userId
      });
      
      // Both should allow because requesterUserId ?? userId === userId
      expect(canServer('WO_CREATE', 'view', ctx)).toBe(true);
      expect(canClient('WO_CREATE', 'view', ctx as ClientResourceCtx)).toBe(true);
    });
  });

  describe('Technician Assignment Parity', () => {
    it('TECHNICIAN allowed for view action without assignment requirement', () => {
      const ctx = createTestCtx({
        role: Role.TECHNICIAN,
        isTechnicianAssigned: false,
      });
      
      expect(canServer('WO_CREATE', 'view', ctx)).toBe(true);
      expect(canClient('WO_CREATE', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TECHNICIAN allowed for update when assigned', () => {
      const ctx = createTestCtx({
        role: Role.TECHNICIAN,
        isTechnicianAssigned: true,
      });
      
      expect(canServer('WO_TRACK_ASSIGN', 'update', ctx)).toBe(true);
      expect(canClient('WO_TRACK_ASSIGN', 'update', ctx as ClientResourceCtx)).toBe(true);
    });

    it('TECHNICIAN denied for start_work when not assigned', () => {
      const ctx = createTestCtx({
        role: Role.TECHNICIAN,
        isTechnicianAssigned: false,
      });
      
      // start_work is an ASSIGNED_ACTION - requires assignment
      expect(canServer('WO_TRACK_ASSIGN', 'start_work', ctx)).toBe(false);
      expect(canClient('WO_TRACK_ASSIGN', 'start_work', ctx as ClientResourceCtx)).toBe(false);
    });

    it('TECHNICIAN denied for delete even when assigned', () => {
      const ctx = createTestCtx({
        role: Role.TECHNICIAN,
        isTechnicianAssigned: true,
      });
      
      // Technicians cannot delete work orders regardless of assignment
      expect(canServer('WO_TRACK_ASSIGN', 'delete', ctx)).toBe(false);
      expect(canClient('WO_TRACK_ASSIGN', 'delete', ctx as ClientResourceCtx)).toBe(false);
    });
  });

  describe('Cross-Role Sub-Role Boundaries', () => {
    it('FINANCE_OFFICER cannot access HR_PAYROLL', () => {
      const ctx = createTestCtx({
        role: Role.TEAM_MEMBER,
        subRole: SubRole.FINANCE_OFFICER,
      });
      
      expect(canServer('HR_PAYROLL', 'view', ctx)).toBe(false);
      expect(canClient('HR_PAYROLL', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('HR_OFFICER cannot access FINANCE_INVOICES', () => {
      const ctx = createTestCtx({
        role: Role.TEAM_MEMBER,
        subRole: SubRole.HR_OFFICER,
      });
      
      expect(canServer('FINANCE_INVOICES', 'view', ctx)).toBe(false);
      expect(canClient('FINANCE_INVOICES', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('SUPPORT_AGENT cannot access MARKETPLACE_VENDORS', () => {
      const ctx = createTestCtx({
        role: Role.TEAM_MEMBER,
        subRole: SubRole.SUPPORT_AGENT,
      });
      
      expect(canServer('MARKETPLACE_VENDORS', 'view', ctx)).toBe(false);
      expect(canClient('MARKETPLACE_VENDORS', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('OPERATIONS_MANAGER can access WO_TRACK_ASSIGN', () => {
      const ctx = createTestCtx({
        role: Role.TEAM_MEMBER,
        subRole: SubRole.OPERATIONS_MANAGER,
      });
      
      expect(canServer('WO_TRACK_ASSIGN', 'view', ctx)).toBe(true);
      expect(canClient('WO_TRACK_ASSIGN', 'view', ctx as ClientResourceCtx)).toBe(true);
    });
  });

  describe('Plan Downgrade Scenarios', () => {
    it('STARTER plan blocks HR module entirely', () => {
      const ctx = createTestCtx({
        plan: Plan.STARTER,
        role: Role.ADMIN,
      });
      
      expect(canServer('HR_EMPLOYEE_DIRECTORY', 'view', ctx)).toBe(false);
      expect(canClient('HR_EMPLOYEE_DIRECTORY', 'view', ctx as ClientResourceCtx)).toBe(false);
      expect(canServer('HR_PAYROLL', 'view', ctx)).toBe(false);
      expect(canClient('HR_PAYROLL', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('STARTER plan blocks Marketplace module', () => {
      const ctx = createTestCtx({
        plan: Plan.STARTER,
        role: Role.ADMIN,
      });
      
      expect(canServer('MARKETPLACE_VENDORS', 'view', ctx)).toBe(false);
      expect(canClient('MARKETPLACE_VENDORS', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('STANDARD plan allows Finance but blocks System Management', () => {
      const ctx = createTestCtx({
        plan: Plan.STANDARD,
        role: Role.ADMIN,
      });
      
      expect(canServer('FINANCE_INVOICES', 'view', ctx)).toBe(true);
      expect(canClient('FINANCE_INVOICES', 'view', ctx as ClientResourceCtx)).toBe(true);
      expect(canServer('SYSTEM_USERS', 'view', ctx)).toBe(false);
      expect(canClient('SYSTEM_USERS', 'view', ctx as ClientResourceCtx)).toBe(false);
      expect(canServer('SUPPORT_CHAT', 'view', ctx)).toBe(false);
      expect(canClient('SUPPORT_CHAT', 'view', ctx as ClientResourceCtx)).toBe(false);
      expect(canServer('MARKETPLACE_REQUESTS', 'view', ctx)).toBe(false);
      expect(canClient('MARKETPLACE_REQUESTS', 'view', ctx as ClientResourceCtx)).toBe(false);
      expect(canServer('ADMIN_FACILITIES', 'view', ctx)).toBe(false);
      expect(canClient('ADMIN_FACILITIES', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('PRO plan allows most features but blocks SYSTEM_USERS', () => {
      const ctx = createTestCtx({
        plan: Plan.PRO,
        role: Role.ADMIN,
      });
      
      expect(canServer('HR_PAYROLL', 'view', ctx)).toBe(true);
      expect(canClient('HR_PAYROLL', 'view', ctx as ClientResourceCtx)).toBe(true);
      expect(canServer('SYSTEM_USERS', 'view', ctx)).toBe(false);
      expect(canClient('SYSTEM_USERS', 'view', ctx as ClientResourceCtx)).toBe(false);
      expect(canServer('ADMIN_DOA', 'view', ctx)).toBe(true);
      expect(canClient('ADMIN_DOA', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('ENTERPRISE plan allows all features including System Management', () => {
      const ctx = createTestCtx({
        plan: Plan.ENTERPRISE,
        role: Role.ADMIN,
      });
      
      expect(canServer('SYSTEM_USERS', 'view', ctx)).toBe(true);
      expect(canClient('SYSTEM_USERS', 'view', ctx as ClientResourceCtx)).toBe(true);
      expect(canServer('SYSTEM_INTEGRATIONS', 'view', ctx)).toBe(true);
      expect(canClient('SYSTEM_INTEGRATIONS', 'view', ctx as ClientResourceCtx)).toBe(true);
    });
  });

  describe('Org Membership Edge Cases', () => {
    it('Non-org member denied even with correct role', () => {
      const ctx = createTestCtx({
        role: Role.ADMIN,
        isOrgMember: false,
      });
      
      expect(canServer('WO_CREATE', 'view', ctx)).toBe(false);
      expect(canClient('WO_CREATE', 'view', ctx as ClientResourceCtx)).toBe(false);
    });

    it('SUPER_ADMIN bypasses org membership requirement', () => {
      const ctx = createTestCtx({
        role: Role.SUPER_ADMIN,
        isOrgMember: false,
      });
      
      expect(canServer('WO_CREATE', 'view', ctx)).toBe(true);
      expect(canClient('WO_CREATE', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('GUEST role limited to public data only', () => {
      const ctx = createTestCtx({
        role: Role.GUEST,
        isOrgMember: false,
      });
      
      // Guests should not have access to work orders
      expect(canServer('WO_CREATE', 'view', ctx)).toBe(false);
      expect(canClient('WO_CREATE', 'view', ctx as ClientResourceCtx)).toBe(false);
    });
  });

  describe('Vendor Role Parity', () => {
    it('VENDOR can view assigned work orders', () => {
      const ctx = createTestCtx({
        role: Role.VENDOR,
        vendorId: 'vendor-123',
      });
      
      expect(canServer('WO_CREATE', 'view', ctx)).toBe(true);
      expect(canClient('WO_CREATE', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('VENDOR cannot create work orders', () => {
      const ctx = createTestCtx({
        role: Role.VENDOR,
        vendorId: 'vendor-123',
      });
      
      expect(canServer('WO_CREATE', 'create', ctx)).toBe(false);
      expect(canClient('WO_CREATE', 'create', ctx as ClientResourceCtx)).toBe(false);
    });

    it('VENDOR can access marketplace bids', () => {
      const ctx = createTestCtx({
        role: Role.VENDOR,
        vendorId: 'vendor-123',
      });
      
      // Vendors can view/create/update their own bids
      expect(canServer('MARKETPLACE_BIDS', 'view', ctx)).toBe(true);
      expect(canClient('MARKETPLACE_BIDS', 'view', ctx as ClientResourceCtx)).toBe(true);
    });

    it('VENDOR cannot access finance invoices', () => {
      const ctx = createTestCtx({
        role: Role.VENDOR,
        vendorId: 'vendor-123',
      });
      
      expect(canServer('FINANCE_INVOICES', 'view', ctx)).toBe(false);
      expect(canClient('FINANCE_INVOICES', 'view', ctx as ClientResourceCtx)).toBe(false);
    });
  });

  describe('Action-Specific Parity', () => {
    it('export action restricted to appropriate roles', () => {
      const adminCtx = createTestCtx({ role: Role.ADMIN });
      const technicianCtx = createTestCtx({ role: Role.TECHNICIAN });
      const tenantCtx = createTestCtx({ 
        role: Role.TENANT,
        userId: 'tenant-123',
        requesterUserId: 'tenant-123',
      });
      
      // Admin can export
      expect(canServer('REPORTS_OPERATIONS', 'export', adminCtx)).toBe(true);
      expect(canClient('REPORTS_OPERATIONS', 'export', adminCtx as ClientResourceCtx)).toBe(true);
      
      // Technician cannot export reports
      expect(canServer('REPORTS_OPERATIONS', 'export', technicianCtx)).toBe(false);
      expect(canClient('REPORTS_OPERATIONS', 'export', technicianCtx as ClientResourceCtx)).toBe(false);
      
      // Tenant cannot export reports
      expect(canServer('REPORTS_OPERATIONS', 'export', tenantCtx)).toBe(false);
      expect(canClient('REPORTS_OPERATIONS', 'export', tenantCtx as ClientResourceCtx)).toBe(false);
    });

    it('approve action restricted to management roles', () => {
      const adminCtx = createTestCtx({ role: Role.ADMIN });
      const technicianCtx = createTestCtx({ role: Role.TECHNICIAN });
      
      // Admin can approve on WO_TRACK_ASSIGN
      expect(canServer('WO_TRACK_ASSIGN', 'approve', adminCtx)).toBe(true);
      expect(canClient('WO_TRACK_ASSIGN', 'approve', adminCtx as ClientResourceCtx)).toBe(true);
      
      // Technician cannot approve
      expect(canServer('WO_TRACK_ASSIGN', 'approve', technicianCtx)).toBe(false);
      expect(canClient('WO_TRACK_ASSIGN', 'approve', technicianCtx as ClientResourceCtx)).toBe(false);
    });

    it('assign action restricted to management roles', () => {
      const adminCtx = createTestCtx({ role: Role.ADMIN });
      const propertyManagerCtx = createTestCtx({
        role: Role.PROPERTY_MANAGER,
        propertyId: 'prop-123',
        assignedProperties: ['prop-123'],
      });
      const tenantCtx = createTestCtx({
        role: Role.TENANT,
        userId: 'tenant-123',
        requesterUserId: 'tenant-123',
      });
      
      // Admin can assign
      expect(canServer('WO_TRACK_ASSIGN', 'assign', adminCtx)).toBe(true);
      expect(canClient('WO_TRACK_ASSIGN', 'assign', adminCtx as ClientResourceCtx)).toBe(true);
      
      // Property Manager can assign within their properties
      expect(canServer('WO_TRACK_ASSIGN', 'assign', propertyManagerCtx)).toBe(true);
      expect(canClient('WO_TRACK_ASSIGN', 'assign', propertyManagerCtx as ClientResourceCtx)).toBe(true);
      
      // Tenant cannot assign
      expect(canServer('WO_TRACK_ASSIGN', 'assign', tenantCtx)).toBe(false);
      expect(canClient('WO_TRACK_ASSIGN', 'assign', tenantCtx as ClientResourceCtx)).toBe(false);
    });
  });

  describe('Behavioral Parity (lite canClient vs server can)', () => {
    const cases: Array<{
      submodule: SubmoduleKey;
      action: Parameters<typeof canServer>[1];
      ctx: ServerResourceCtx;
      note?: string;
    }> = [
      {
        submodule: 'WO_TRACK_ASSIGN',
        action: 'assign',
        ctx: createTestCtx({ role: Role.ADMIN }),
        note: 'management assignment allowed for admin',
      },
      {
        submodule: 'WO_TRACK_ASSIGN',
        action: 'start_work',
        ctx: createTestCtx({ role: Role.TECHNICIAN, isTechnicianAssigned: false }),
        note: 'technician must be assigned to start work',
      },
      {
        submodule: 'WO_CREATE',
        action: 'create',
        ctx: createTestCtx({
          role: Role.TENANT,
          userId: 'tenant-user-123',
          requesterUserId: 'tenant-user-123',
          unitId: 'unit-001',
          units: ['unit-001'],
        }),
        note: 'tenant can create for own unit',
      },
      {
        submodule: 'FINANCE_INVOICES',
        action: 'approve',
        ctx: createTestCtx({
          role: Role.TEAM_MEMBER,
          subRole: SubRole.FINANCE_OFFICER,
          plan: Plan.ENTERPRISE,
        }),
        note: 'finance officer approval via sub-role extension',
      },
      {
        submodule: 'SUPPORT_CHAT',
        action: 'view',
        ctx: createTestCtx({
          role: Role.ADMIN,
          plan: Plan.STANDARD,
        }),
        note: 'plan gate blocks support chat on Standard plan',
      },
    ];

    cases.forEach(({ submodule, action, ctx, note }) => {
      it(`${submodule} ${action} parity (lite vs server)${note ? ` – ${note}` : ''}`, () => {
        const serverResult = canServer(submodule, action, ctx);
        const liteResult = canLite(submodule, action, toLiteCtx(ctx));
        expect(liteResult).toBe(serverResult);
      });
    });
  });
});
