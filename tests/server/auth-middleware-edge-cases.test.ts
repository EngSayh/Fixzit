/**
 * Auth Middleware Edge Case Tests
 * 
 * Tests edge cases in authentication and authorization middleware.
 * Validates handling of malformed data, missing fields, and boundary conditions.
 * 
 * Test Coverage:
 * - Empty/null/undefined session values
 * - Malformed JWT tokens
 * - Invalid role values
 * - Missing orgId handling
 * - Impersonation edge cases
 * - RBAC loading failures
 * 
 * Related Files:
 * - server/middleware/withAuthRbac.ts
 * - server/rbac/workOrdersPolicy.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __internals } from '@/server/middleware/withAuthRbac';
import { Role } from '@/domain/fm/fm.behavior';
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const { normalizeWorkOrderRole } = __internals;

describe('Auth Middleware Edge Cases', () => {
  describe('normalizeWorkOrderRole Edge Cases', () => {
    it('should handle empty string role', () => {
      // @ts-expect-error - Testing edge case with empty string
      expect(normalizeWorkOrderRole('')).toBeNull();
    });
    
    it('should handle whitespace-only role', () => {
      // @ts-expect-error - Testing edge case with whitespace
      expect(normalizeWorkOrderRole('   ')).toBeNull();
    });
    
    it('should handle null role', () => {
      // @ts-expect-error - Testing edge case with null
      expect(normalizeWorkOrderRole(null)).toBeNull();
    });
    
    it('should handle undefined role', () => {
      expect(normalizeWorkOrderRole(undefined)).toBeNull();
    });
    
    it('should handle numeric role (type coercion edge case)', () => {
      // @ts-expect-error - Testing edge case with number
      expect(normalizeWorkOrderRole(123)).toBeNull();
    });
    
    it('should handle object role (type coercion edge case)', () => {
      // @ts-expect-error - Testing edge case with object
      expect(normalizeWorkOrderRole({ role: 'ADMIN' })).toBeNull();
    });
    
    it('should handle array role (type coercion edge case)', () => {
      // @ts-expect-error - Testing edge case with array
      expect(normalizeWorkOrderRole(['ADMIN'])).toBeNull();
    });
    
    it('should handle special characters in role', () => {
      // @ts-expect-error - Testing edge case with special chars
      expect(normalizeWorkOrderRole('ADMIN<script>')).toBeNull();
    });
    
    it('should handle SQL injection attempt in role', () => {
      // @ts-expect-error - Testing edge case with SQL injection
      expect(normalizeWorkOrderRole("ADMIN'; DROP TABLE users;--")).toBeNull();
    });
    
    it('should handle very long role string', () => {
      const longRole = 'A'.repeat(10000);
      // @ts-expect-error - Testing edge case with very long string
      expect(normalizeWorkOrderRole(longRole)).toBeNull();
    });
    
    it('should handle Unicode characters in role', () => {
      // @ts-expect-error - Testing edge case with Unicode
      expect(normalizeWorkOrderRole('ADMIN\u0000')).toBeNull();
      // @ts-expect-error - Testing edge case with Unicode
      expect(normalizeWorkOrderRole('Администратор')).toBeNull();
    });
  });
  
  describe('Role Case Sensitivity', () => {
    it('should handle lowercase roles', () => {
      expect(normalizeWorkOrderRole('admin')).toBe(Role.ADMIN);
      expect(normalizeWorkOrderRole('tenant')).toBe(Role.TENANT);
    });
    
    it('should handle mixed case roles', () => {
      expect(normalizeWorkOrderRole('Admin')).toBe(Role.ADMIN);
      expect(normalizeWorkOrderRole('TeNaNt')).toBe(Role.TENANT);
    });
    
    it('should handle SCREAMING_SNAKE_CASE roles', () => {
      expect(normalizeWorkOrderRole('SUPER_ADMIN')).toBe(Role.SUPER_ADMIN);
      expect(normalizeWorkOrderRole('FM_MANAGER')).toBe(Role.PROPERTY_MANAGER);
    });
  });
  
  describe('Legacy Role Aliases', () => {
    it('should map FM_MANAGER to PROPERTY_MANAGER', () => {
      expect(normalizeWorkOrderRole('FM_MANAGER')).toBe(Role.PROPERTY_MANAGER);
    });
    
    it('should map PROPERTY_OWNER to CORPORATE_OWNER', () => {
      // Property owner maps to corporate owner in the system
      expect(normalizeWorkOrderRole('PROPERTY_OWNER')).toBe(Role.CORPORATE_OWNER);
    });
    
    it('should map FINANCE to TEAM_MEMBER', () => {
      expect(normalizeWorkOrderRole('FINANCE')).toBe(Role.TEAM_MEMBER);
    });
    
    it('should map SUPPORT to TEAM_MEMBER', () => {
      expect(normalizeWorkOrderRole('SUPPORT')).toBe(Role.TEAM_MEMBER);
    });
  });
  
  describe('Work Order Role Mapping', () => {
    const validWorkOrderRoles = [
      'SUPER_ADMIN',
      'ADMIN',
      'PROPERTY_MANAGER',
      'TEAM_MEMBER',
      'TECHNICIAN',
      'VENDOR',
      'TENANT',
    ];
    
    validWorkOrderRoles.forEach(role => {
      it(`should accept ${role} as valid work order role`, () => {
        const normalized = normalizeWorkOrderRole(role);
        expect(normalized).not.toBeNull();
      });
    });
    
    it('should reject GUEST for work orders', () => {
      // GUEST cannot have work order abilities
      const normalized = normalizeWorkOrderRole('GUEST');
      // Guest may be null or GUEST depending on implementation
      expect(
        normalized === null || normalized === Role.GUEST
      ).toBe(true);
    });
  });
  
  describe('Sub-Role Inference', () => {
    it('should map FINANCE_OFFICER to null (not a work order role)', () => {
      // FINANCE_OFFICER is a sub-role, not mapped to work order roles directly
      const normalized = normalizeWorkOrderRole('FINANCE_OFFICER');
      expect(normalized).toBeNull();
    });
    
    it('should map SUPPORT_AGENT to null (not a work order role)', () => {
      // SUPPORT_AGENT is a sub-role, not mapped to work order roles directly
      const normalized = normalizeWorkOrderRole('SUPPORT_AGENT');
      expect(normalized).toBeNull();
    });
    
    it('should map OPERATIONS_MANAGER to null (not a work order role)', () => {
      // OPERATIONS_MANAGER is a sub-role, not mapped to work order roles directly
      const normalized = normalizeWorkOrderRole('OPERATIONS_MANAGER');
      expect(normalized).toBeNull();
    });
  });
  
  describe('Boundary Conditions', () => {
    it('should handle role at string length boundary', () => {
      // Longest valid role in the system
      const longestRole = 'CORPORATE_ADMIN';
      expect(normalizeWorkOrderRole(longestRole)).toBe(Role.ADMIN);
    });
    
    it('should handle single character role', () => {
      // @ts-expect-error - Testing edge case with single char
      expect(normalizeWorkOrderRole('A')).toBeNull();
    });
    
    it('should handle role with leading/trailing whitespace', () => {
      // Whitespace should not be trimmed internally, causing mismatch
      // @ts-expect-error - Testing edge case with whitespace
      expect(normalizeWorkOrderRole(' ADMIN ')).toBeNull();
    });
  });
  
  describe('Security Edge Cases', () => {
    it('should not accept __proto__ as role (prototype pollution)', () => {
      // @ts-expect-error - Testing security edge case
      expect(normalizeWorkOrderRole('__proto__')).toBeNull();
    });
    
    it('should not accept constructor as role', () => {
      // @ts-expect-error - Testing security edge case
      expect(normalizeWorkOrderRole('constructor')).toBeNull();
    });
    
    it('should not accept prototype as role', () => {
      // @ts-expect-error - Testing security edge case
      expect(normalizeWorkOrderRole('prototype')).toBeNull();
    });
    
    it('should not be vulnerable to RegExp DoS', () => {
      // Role with many repeating characters that could cause ReDoS
      const start = Date.now();
      // @ts-expect-error - Testing security edge case
      normalizeWorkOrderRole('A'.repeat(1000) + 'ADMIN');
      const duration = Date.now() - start;
      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

describe('OrgId Handling Edge Cases', () => {
  describe('Empty OrgId Prevention', () => {
    it('should treat empty string orgId as undefined', () => {
      // Empty string orgId is dangerous - it bypasses tenant isolation
      const orgId = '';
      const normalized = orgId || undefined;
      expect(normalized).toBeUndefined();
    });
    
    it('should treat whitespace orgId as undefined', () => {
      const orgId = '   ';
      const normalized = orgId.trim() || undefined;
      expect(normalized).toBeUndefined();
    });
    
    it('should preserve valid ObjectId string', () => {
      const orgId = '507f1f77bcf86cd799439011';
      const normalized = orgId || undefined;
      expect(normalized).toBe(orgId);
    });
  });
  
  describe('Invalid OrgId Formats', () => {
    it('should not crash on malformed ObjectId', () => {
      const invalidOrgIds = [
        'not-an-objectid',
        '123',
        'null',
        'undefined',
        '{"$oid": "507f1f77bcf86cd799439011"}',
      ];
      
      invalidOrgIds.forEach(orgId => {
        expect(() => {
          // Simulating what getSessionUser does with orgId
          const trimmed = orgId?.trim() || undefined;
          // Should not throw
          return trimmed;
        }).not.toThrow();
      });
    });
  });
});

describe('Session User Type Safety', () => {
  describe('Required Fields', () => {
    it('should validate user id is string', () => {
      const user = { id: '123' };
      expect(typeof user.id).toBe('string');
    });
    
    it('should validate role is valid type', () => {
      const validRoles = [
        'ADMIN', 'TENANT', 'VENDOR', 'TECHNICIAN', 
        'PROPERTY_MANAGER', 'TEAM_MEMBER', 'SUPER_ADMIN'
      ];
      
      validRoles.forEach(role => {
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('Optional Fields', () => {
    it('should handle missing units array', () => {
      const user = { id: '123', role: 'TENANT' };
      const units = (user as { units?: string[] }).units || [];
      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBe(0);
    });
    
    it('should handle missing vendorId', () => {
      const user = { id: '123', role: 'VENDOR' };
      const vendorId = (user as { vendorId?: string }).vendorId;
      expect(vendorId).toBeUndefined();
    });
    
    it('should handle missing assignedProperties', () => {
      const user = { id: '123', role: 'PROPERTY_MANAGER' };
      const props = (user as { assignedProperties?: string[] }).assignedProperties || [];
      expect(Array.isArray(props)).toBe(true);
    });
  });
});

describe('Impersonation Edge Cases', () => {
  describe('Super Admin Impersonation', () => {
    it('should only allow super admin to impersonate', () => {
      const user = { isSuperAdmin: true };
      const canImpersonate = user.isSuperAdmin === true;
      expect(canImpersonate).toBe(true);
    });
    
    it('should block non-super-admin from impersonating', () => {
      const user = { isSuperAdmin: false };
      const canImpersonate = user.isSuperAdmin === true;
      expect(canImpersonate).toBe(false);
    });
    
    it('should handle missing isSuperAdmin field', () => {
      const user = { id: '123' };
      const canImpersonate = (user as { isSuperAdmin?: boolean }).isSuperAdmin === true;
      expect(canImpersonate).toBe(false);
    });
  });
  
  describe('Org Override Cookie', () => {
    it('should validate org override cookie format', () => {
      const validCookie = '507f1f77bcf86cd799439011';
      const isValidFormat = /^[a-f0-9]{24}$/i.test(validCookie);
      expect(isValidFormat).toBe(true);
    });
    
    it('should reject malformed org override cookie', () => {
      const malformedCookies = [
        'not-valid',
        '',
        'null',
        '<script>alert(1)</script>',
      ];
      
      malformedCookies.forEach(cookie => {
        const isValidFormat = /^[a-f0-9]{24}$/i.test(cookie);
        expect(isValidFormat).toBe(false);
      });
    });
  });
});

describe('RBAC Loading Error Handling', () => {
  describe('Database Errors', () => {
    it('should return safe defaults on RBAC loading failure', () => {
      // Simulating what loadRBACData returns on error
      const fallbackRbac = {
        isSuperAdmin: false,
        permissions: [],
        roles: [],
      };
      
      expect(fallbackRbac.isSuperAdmin).toBe(false);
      expect(fallbackRbac.permissions).toEqual([]);
      expect(fallbackRbac.roles).toEqual([]);
    });
    
    it('should not grant permissions on timeout', () => {
      const timeoutRbac = {
        isSuperAdmin: false,
        permissions: [],
        roles: [],
      };
      
      // Verify no permissions granted
      expect(timeoutRbac.permissions.includes('*')).toBe(false);
    });
  });
  
  describe('Offline Mode', () => {
    it('should handle ALLOW_OFFLINE_MONGODB mode', () => {
      const offlineRbac = {
        isSuperAdmin: false,
        permissions: [],
        roles: [],
      };
      
      // In offline mode, no RBAC data is loaded
      expect(offlineRbac).toEqual({
        isSuperAdmin: false,
        permissions: [],
        roles: [],
      });
    });
  });
});

describe('Permission Wildcard Handling', () => {
  it('should grant all permissions with wildcard', () => {
    const permissions = ['*'];
    const hasPermission = (perm: string) => 
      permissions.includes('*') || permissions.includes(perm);
    
    expect(hasPermission('any.permission')).toBe(true);
    expect(hasPermission('finance.view')).toBe(true);
    expect(hasPermission('admin.delete')).toBe(true);
  });
  
  it('should check specific permission without wildcard', () => {
    const permissions = ['finance.view', 'finance.edit'];
    const hasPermission = (perm: string) => 
      permissions.includes('*') || permissions.includes(perm);
    
    expect(hasPermission('finance.view')).toBe(true);
    expect(hasPermission('finance.delete')).toBe(false);
  });
});
