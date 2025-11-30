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
  type ResourceCtx as ServerResourceCtx,
  ROLE_ACTIONS as SERVER_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as SERVER_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as SERVER_SUBMODULE_REQUIRED_SUBROLE,
  PLAN_GATES as SERVER_PLAN_GATES,
} from '@/domain/fm/fm.behavior';

import {
  can as canClient,
  ROLE_ACTIONS as CLIENT_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as CLIENT_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as CLIENT_SUBMODULE_REQUIRED_SUBROLE,
  PLAN_GATES as CLIENT_PLAN_GATES,
  type ResourceCtx as ClientResourceCtx,
} from '@/domain/fm/fm.types';

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

describe('RBAC can() Client/Server Parity', () => {
  describe('Static Data Structures Parity', () => {
    it('ROLE_ACTIONS keys match between client and server', () => {
      const serverRoles = Object.keys(SERVER_ROLE_ACTIONS).sort();
      const clientRoles = Object.keys(CLIENT_ROLE_ACTIONS).sort();
      expect(serverRoles).toEqual(clientRoles);
    });

    it('ROLE_ACTIONS submodule keys match for each role', () => {
      for (const role of Object.values(Role)) {
        const serverSubmodules = Object.keys(SERVER_ROLE_ACTIONS[role] || {}).sort();
        const clientSubmodules = Object.keys(CLIENT_ROLE_ACTIONS[role] || {}).sort();
        expect(serverSubmodules, `Role ${role} submodules mismatch`).toEqual(clientSubmodules);
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

    it('PLAN_GATES keys match between client and server', () => {
      const serverPlans = Object.keys(SERVER_PLAN_GATES).sort();
      const clientPlans = Object.keys(CLIENT_PLAN_GATES).sort();
      expect(serverPlans).toEqual(clientPlans);
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
});
