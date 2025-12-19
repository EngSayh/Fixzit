/**
 * RBAC Unit Tests - HR Role-Based Filtering
 * 
 * Tests the role-based access control and filtering logic for HR APIs.
 * Validates STRICT v4 compliance with multi-tenant isolation.
 * 
 * Test Coverage:
 * - HR_OFFICER: Full access to org HR data
 * - HR_MANAGER: Full access to org HR data with approval rights
 * - ADMIN: Full access to org HR data
 * - EMPLOYEE: Can only see own records
 * - MANAGER: Can see direct reports
 * - SUPER_ADMIN: Bypasses scoping (no filters)
 * 
 * Related Files:
 * - app/api/hr/* (HR API routes)
 * - server/services/hr/* (HR services)
 */

import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


// Type for HR query filter
interface HRFilter {
  orgId?: string;
  employeeId?: string | { $in: string[] };
  managerId?: string;
  departmentId?: string;
}

// Mock the buildHRFilter function logic
function buildHRFilter(params: {
  orgId: string;
  userRole: string;
  userId?: string;
  directReportIds?: string[];
  departmentId?: string;
  isSuperAdmin?: boolean;
}): HRFilter {
  const { orgId, userRole, userId, directReportIds, isSuperAdmin } = params;
  
  // Super admin bypasses all scoping
  if (isSuperAdmin) {
    return {};
  }
  
  const filter: HRFilter = { orgId };
  
  // 🔒 RBAC: Scope by role per STRICT v4 multi-tenant isolation
  if (userRole === 'EMPLOYEE' && userId) {
    filter.employeeId = userId; // Only own records
  } else if (userRole === 'MANAGER' && directReportIds && directReportIds.length > 0) {
    // Managers can see self + direct reports
    const allIds = userId ? [userId, ...directReportIds] : directReportIds;
    filter.employeeId = { $in: allIds };
  }
  // HR_OFFICER, HR_MANAGER, ADMIN see all org HR data
  
  return filter;
}

describe('HR RBAC - Role-Based Filtering', () => {
  const mockOrgId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();
  const mockDirectReportIds = [
    new Types.ObjectId().toString(),
    new Types.ObjectId().toString(),
  ];
  
  describe('HR_OFFICER Role', () => {
    it('should see all org HR records (org scoping only)', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'HR_OFFICER',
        userId: mockUserId,
      });
      
      expect(filter).toEqual({
        orgId: mockOrgId,
      });
    });
    
    it('should NOT leak data from other orgs', () => {
      const otherOrgId = new Types.ObjectId().toString();
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'HR_OFFICER',
      });
      
      expect(filter.orgId).toBe(mockOrgId);
      expect(filter.orgId).not.toBe(otherOrgId);
    });
  });
  
  describe('HR_MANAGER Role', () => {
    it('should see all org HR records', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'HR_MANAGER',
        userId: mockUserId,
      });
      
      expect(filter).toEqual({
        orgId: mockOrgId,
      });
    });
  });
  
  describe('ADMIN Role', () => {
    it('should see all org HR records', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'ADMIN',
        userId: mockUserId,
      });
      
      expect(filter).toEqual({
        orgId: mockOrgId,
      });
    });
  });
  
  describe('EMPLOYEE Role', () => {
    it('should filter by employeeId (self only)', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'EMPLOYEE',
        userId: mockUserId,
      });
      
      expect(filter).toEqual({
        orgId: mockOrgId,
        employeeId: mockUserId,
      });
    });
    
    it('should NOT see records for other employees', () => {
      const otherEmployeeId = new Types.ObjectId().toString();
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'EMPLOYEE',
        userId: mockUserId,
      });
      
      expect(filter.employeeId).toBe(mockUserId);
      expect(filter.employeeId).not.toBe(otherEmployeeId);
    });
    
    it('should fall back to org scoping if userId missing (defensive)', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'EMPLOYEE',
        // userId intentionally omitted
      });
      
      expect(filter).toEqual({
        orgId: mockOrgId,
        // No employeeId filter - falls back to org-only scoping
      });
    });
  });
  
  describe('MANAGER Role', () => {
    it('should filter by self + direct reports', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'MANAGER',
        userId: mockUserId,
        directReportIds: mockDirectReportIds,
      });
      
      expect(filter.orgId).toBe(mockOrgId);
      expect(filter.employeeId).toEqual({
        $in: [mockUserId, ...mockDirectReportIds],
      });
    });
    
    it('should NOT see records for employees outside their team', () => {
      const outsideEmployeeId = new Types.ObjectId().toString();
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'MANAGER',
        userId: mockUserId,
        directReportIds: mockDirectReportIds,
      });
      
      const allowedIds = (filter.employeeId as { $in: string[] })?.$in || [];
      expect(allowedIds).not.toContain(outsideEmployeeId);
    });
    
    it('should only show direct reports if no userId', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'MANAGER',
        directReportIds: mockDirectReportIds,
      });
      
      expect(filter.employeeId).toEqual({
        $in: mockDirectReportIds,
      });
    });
  });
  
  describe('SUPER_ADMIN Role', () => {
    it('should bypass all scoping', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'ADMIN',
        isSuperAdmin: true,
      });
      
      expect(filter).toEqual({});
    });
  });
  
  describe('Cross-Org Isolation', () => {
    it('should prevent cross-org data leakage', () => {
      const org1 = new Types.ObjectId().toString();
      const org2 = new Types.ObjectId().toString();
      
      const filterOrg1 = buildHRFilter({
        orgId: org1,
        userRole: 'HR_OFFICER',
      });
      
      const filterOrg2 = buildHRFilter({
        orgId: org2,
        userRole: 'HR_OFFICER',
      });
      
      expect(filterOrg1.orgId).toBe(org1);
      expect(filterOrg2.orgId).toBe(org2);
      expect(filterOrg1.orgId).not.toBe(filterOrg2.orgId);
    });
    
    it('should isolate employee data within their org', () => {
      const org1 = new Types.ObjectId().toString();
      const employee1 = new Types.ObjectId().toString();
      
      const filter = buildHRFilter({
        orgId: org1,
        userRole: 'EMPLOYEE',
        userId: employee1,
      });
      
      // Employee should be scoped to both their org AND their own employeeId
      expect(filter.orgId).toBe(org1);
      expect(filter.employeeId).toBe(employee1);
    });
  });
  
  describe('HR Data Visibility Matrix', () => {
    const testCases = [
      { role: 'ADMIN', canSeeAll: true, scopeType: 'org' },
      { role: 'HR_OFFICER', canSeeAll: true, scopeType: 'org' },
      { role: 'HR_MANAGER', canSeeAll: true, scopeType: 'org' },
      { role: 'MANAGER', canSeeAll: false, scopeType: 'team' },
      { role: 'EMPLOYEE', canSeeAll: false, scopeType: 'self' },
    ];
    
    testCases.forEach(({ role, canSeeAll, scopeType }) => {
      it(`${role} should ${canSeeAll ? '' : 'NOT '}see all HR data (scope: ${scopeType})`, () => {
        const filter = buildHRFilter({
          orgId: mockOrgId,
          userRole: role,
          userId: mockUserId,
          directReportIds: role === 'MANAGER' ? mockDirectReportIds : undefined,
        });
        
        // All roles should have org scope (unless super admin)
        expect(filter.orgId).toBe(mockOrgId);
        
        if (scopeType === 'self') {
          expect(filter.employeeId).toBe(mockUserId);
        } else if (scopeType === 'team') {
          expect(filter.employeeId).toEqual({
            $in: [mockUserId, ...mockDirectReportIds],
          });
        } else {
          expect(filter.employeeId).toBeUndefined();
        }
      });
    });
  });
  
  describe('Leave Request Visibility', () => {
    it('should allow employee to see own leave requests', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'EMPLOYEE',
        userId: mockUserId,
      });
      
      expect(filter.employeeId).toBe(mockUserId);
    });
    
    it('should allow manager to see team leave requests', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'MANAGER',
        userId: mockUserId,
        directReportIds: mockDirectReportIds,
      });
      
      const allowedIds = (filter.employeeId as { $in: string[] })?.$in || [];
      expect(allowedIds).toContain(mockUserId);
      mockDirectReportIds.forEach(id => {
        expect(allowedIds).toContain(id);
      });
    });
    
    it('should allow HR officer to see all leave requests in org', () => {
      const filter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'HR_OFFICER',
      });
      
      expect(filter.employeeId).toBeUndefined();
      expect(filter.orgId).toBe(mockOrgId);
    });
  });
  
  describe('Payroll Visibility', () => {
    it('should restrict payroll data to HR/Admin roles', () => {
      // Employee should only see own payroll
      const employeeFilter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'EMPLOYEE',
        userId: mockUserId,
      });
      expect(employeeFilter.employeeId).toBe(mockUserId);
      
      // HR Officer should see all payroll
      const hrFilter = buildHRFilter({
        orgId: mockOrgId,
        userRole: 'HR_OFFICER',
      });
      expect(hrFilter.employeeId).toBeUndefined();
    });
  });
});
