/**
 * HR Module Employee Data Protection Tests
 * Tests PII handling, access controls, and audit logging for HR data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('HR Employee Data Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Employee SSN/National ID Masking', () => {
    const maskNationalId = (nationalId: string): string => {
      if (!nationalId || nationalId.length < 4) {
        return '****';
      }
      // Show only last 4 characters
      const visible = nationalId.slice(-4);
      const masked = '*'.repeat(nationalId.length - 4);
      return masked + visible;
    };

    it('should mask SSN showing only last 4 digits', () => {
      expect(maskNationalId('123-45-6789')).toBe('*******6789');
      expect(maskNationalId('987654321')).toBe('*****4321');
    });

    it('should mask Omani civil ID', () => {
      // Omani civil ID format
      expect(maskNationalId('12345678')).toBe('****5678');
    });

    it('should handle short IDs gracefully', () => {
      expect(maskNationalId('123')).toBe('****');
      expect(maskNationalId('')).toBe('****');
    });
  });

  describe('Contact Information Protection', () => {
    const maskEmail = (email: string): string => {
      const [local, domain] = email.split('@');
      if (!local || !domain) return '****@****';
      
      const maskedLocal = local.charAt(0) + '*'.repeat(Math.max(local.length - 2, 1)) + local.charAt(local.length - 1);
      return `${maskedLocal}@${domain}`;
    };

    const maskPhone = (phone: string): string => {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 4) return '****';
      
      const countryCode = digitsOnly.slice(0, 3);
      const lastFour = digitsOnly.slice(-4);
      return `+${countryCode}-***-${lastFour}`;
    };

    it('should mask email addresses', () => {
      expect(maskEmail('john.doe@company.com')).toBe('j******e@company.com');
      expect(maskEmail('a@b.com')).toBe('a*a@b.com'); // Single char gets masked in middle
    });

    it('should mask phone numbers', () => {
      expect(maskPhone('+968 9123 4567')).toBe('+968-***-4567');
      expect(maskPhone('96891234567')).toBe('+968-***-4567');
    });

    it('should handle invalid inputs', () => {
      expect(maskEmail('invalid')).toBe('****@****');
      expect(maskPhone('123')).toBe('****');
    });
  });

  describe('Employee Document Access Control', () => {
    type DocumentType = 'passport' | 'visa' | 'contract' | 'performance_review' | 'medical';
    type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'HR_MANAGER' | 'DEPARTMENT_MANAGER' | 'EMPLOYEE';

    interface AccessCheck {
      canView: boolean;
      canDownload: boolean;
      canUpload: boolean;
      canDelete: boolean;
    }

    const getDocumentAccess = (
      role: UserRole,
      docType: DocumentType,
      isOwnDocument: boolean
    ): AccessCheck => {
      // Medical documents require highest clearance
      if (docType === 'medical') {
        if (role === 'SUPER_ADMIN' || role === 'HR_ADMIN') {
          return { canView: true, canDownload: true, canUpload: true, canDelete: true };
        }
        if (isOwnDocument) {
          return { canView: true, canDownload: true, canUpload: false, canDelete: false };
        }
        return { canView: false, canDownload: false, canUpload: false, canDelete: false };
      }

      // Employees can access their own documents
      if (isOwnDocument) {
        return {
          canView: true,
          canDownload: true,
          canUpload: docType !== 'contract' && docType !== 'performance_review',
          canDelete: false,
        };
      }

      // HR roles have broader access
      if (role === 'SUPER_ADMIN' || role === 'HR_ADMIN') {
        return { canView: true, canDownload: true, canUpload: true, canDelete: true };
      }

      if (role === 'HR_MANAGER') {
        return { canView: true, canDownload: true, canUpload: true, canDelete: false };
      }

      // Department managers can view performance reviews of their reports
      if (role === 'DEPARTMENT_MANAGER' && docType === 'performance_review') {
        return { canView: true, canDownload: true, canUpload: true, canDelete: false };
      }

      return { canView: false, canDownload: false, canUpload: false, canDelete: false };
    };

    it('should allow HR_ADMIN full access to medical documents', () => {
      const access = getDocumentAccess('HR_ADMIN', 'medical', false);
      expect(access.canView).toBe(true);
      expect(access.canDownload).toBe(true);
      expect(access.canUpload).toBe(true);
      expect(access.canDelete).toBe(true);
    });

    it('should restrict non-HR from other employee medical documents', () => {
      const access = getDocumentAccess('DEPARTMENT_MANAGER', 'medical', false);
      expect(access.canView).toBe(false);
      expect(access.canDownload).toBe(false);
    });

    it('should allow employees to view their own medical documents', () => {
      const access = getDocumentAccess('EMPLOYEE', 'medical', true);
      expect(access.canView).toBe(true);
      expect(access.canDownload).toBe(true);
      expect(access.canUpload).toBe(false); // Cannot upload own medical docs
    });

    it('should allow department managers to review team performance', () => {
      const access = getDocumentAccess('DEPARTMENT_MANAGER', 'performance_review', false);
      expect(access.canView).toBe(true);
      expect(access.canUpload).toBe(true);
    });

    it('should prevent employees from uploading their own contracts', () => {
      const access = getDocumentAccess('EMPLOYEE', 'contract', true);
      expect(access.canView).toBe(true);
      expect(access.canUpload).toBe(false);
    });
  });

  describe('HR Audit Logging', () => {
    interface HRAuditEntry {
      id: string;
      timestamp: Date;
      userId: string;
      action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'DOWNLOAD';
      resourceType: string;
      resourceId: string;
      targetEmployeeId?: string;
      changes?: Record<string, { old: unknown; new: unknown }>;
      ipAddress: string;
      userAgent: string;
    }

    const auditLog: HRAuditEntry[] = [];

    const logHRAction = (entry: Omit<HRAuditEntry, 'id' | 'timestamp'>): string => {
      const id = `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      auditLog.push({
        ...entry,
        id,
        timestamp: new Date(),
      });
      return id;
    };

    beforeEach(() => {
      auditLog.length = 0;
    });

    it('should log employee profile access', () => {
      const id = logHRAction({
        userId: 'hr-user-1',
        action: 'VIEW',
        resourceType: 'employee_profile',
        resourceId: 'emp-123',
        targetEmployeeId: 'emp-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      expect(id).toMatch(/^audit-/);
      expect(auditLog[0].action).toBe('VIEW');
      expect(auditLog[0].targetEmployeeId).toBe('emp-123');
    });

    it('should log salary changes with old and new values', () => {
      logHRAction({
        userId: 'hr-admin-1',
        action: 'UPDATE',
        resourceType: 'employee_salary',
        resourceId: 'sal-456',
        targetEmployeeId: 'emp-789',
        changes: {
          baseSalary: { old: 5000, new: 5500 },
          effectiveDate: { old: '2024-01-01', new: '2024-07-01' },
        },
        ipAddress: '10.0.0.50',
        userAgent: 'Chrome/120',
      });

      expect(auditLog[0].changes?.baseSalary.old).toBe(5000);
      expect(auditLog[0].changes?.baseSalary.new).toBe(5500);
    });

    it('should log document downloads', () => {
      logHRAction({
        userId: 'manager-1',
        action: 'DOWNLOAD',
        resourceType: 'employee_document',
        resourceId: 'doc-contract-123',
        targetEmployeeId: 'emp-456',
        ipAddress: '172.16.0.25',
        userAgent: 'Safari/17',
      });

      expect(auditLog[0].action).toBe('DOWNLOAD');
      expect(auditLog[0].resourceType).toBe('employee_document');
    });

    it('should track bulk exports', () => {
      logHRAction({
        userId: 'hr-admin-2',
        action: 'EXPORT',
        resourceType: 'employee_roster',
        resourceId: 'export-2024-q1',
        ipAddress: '192.168.1.50',
        userAgent: 'Excel Client',
      });

      expect(auditLog[0].action).toBe('EXPORT');
    });
  });

  describe('Employee Data Anonymization', () => {
    interface Employee {
      id: string;
      name: string;
      email: string;
      phone: string;
      nationalId: string;
      department: string;
      salary: number;
    }

    interface AnonymizedEmployee {
      id: string;
      name: string;
      email: string;
      phone: string;
      nationalId: string;
      department: string;
      salary: string;
    }

    const anonymizeForReporting = (employee: Employee): AnonymizedEmployee => {
      return {
        id: employee.id, // Keep ID for reference
        name: 'Employee #' + employee.id.slice(-4),
        email: '****@*****.***',
        phone: '+***-***-****',
        nationalId: '****',
        department: employee.department, // Keep for aggregation
        salary: 'REDACTED',
      };
    };

    it('should anonymize employee for reporting', () => {
      const employee: Employee = {
        id: 'emp-12345678',
        name: 'John Smith',
        email: 'john.smith@company.com',
        phone: '+968 9123 4567',
        nationalId: '12345678',
        department: 'Engineering',
        salary: 75000,
      };

      const anonymized = anonymizeForReporting(employee);

      expect(anonymized.name).toBe('Employee #5678');
      expect(anonymized.email).toBe('****@*****.***');
      expect(anonymized.phone).toBe('+***-***-****');
      expect(anonymized.nationalId).toBe('****');
      expect(anonymized.salary).toBe('REDACTED');
      // Department kept for aggregation
      expect(anonymized.department).toBe('Engineering');
    });
  });

  describe('Termination Data Handling', () => {
    interface TerminatedEmployee {
      id: string;
      terminationDate: Date;
      personalDataPurged: boolean;
      accessRevoked: boolean;
      documentsArchived: boolean;
    }

    const processTermination = (
      employeeId: string,
      terminationDate: Date
    ): TerminatedEmployee => {
      return {
        id: employeeId,
        terminationDate,
        personalDataPurged: false, // Will be purged after retention period
        accessRevoked: true, // Immediate
        documentsArchived: true, // Archive, don't delete
      };
    };

    const shouldPurgeData = (termination: TerminatedEmployee, retentionYears: number): boolean => {
      const retentionPeriod = retentionYears * 365 * 24 * 60 * 60 * 1000;
      const timeSinceTermination = Date.now() - termination.terminationDate.getTime();
      return timeSinceTermination > retentionPeriod;
    };

    it('should immediately revoke access on termination', () => {
      const result = processTermination('emp-999', new Date());
      expect(result.accessRevoked).toBe(true);
    });

    it('should archive but not purge documents immediately', () => {
      const result = processTermination('emp-888', new Date());
      expect(result.documentsArchived).toBe(true);
      expect(result.personalDataPurged).toBe(false);
    });

    it('should indicate data purge after retention period', () => {
      const oldTermination: TerminatedEmployee = {
        id: 'emp-777',
        terminationDate: new Date('2015-01-01'), // 9+ years ago
        personalDataPurged: false,
        accessRevoked: true,
        documentsArchived: true,
      };

      expect(shouldPurgeData(oldTermination, 7)).toBe(true); // 7-year retention
    });

    it('should not purge data within retention period', () => {
      const recentTermination: TerminatedEmployee = {
        id: 'emp-666',
        terminationDate: new Date('2023-01-01'),
        personalDataPurged: false,
        accessRevoked: true,
        documentsArchived: true,
      };

      expect(shouldPurgeData(recentTermination, 7)).toBe(false);
    });
  });

  describe('Emergency Contact Protection', () => {
    interface EmergencyContact {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    }

    const maskEmergencyContact = (contact: EmergencyContact): EmergencyContact => {
      const maskedPhone = contact.phone.slice(0, 4) + '****' + contact.phone.slice(-2);
      return {
        name: contact.name.split(' ')[0] + ' ***',
        relationship: contact.relationship,
        phone: maskedPhone,
        email: contact.email ? '****@****' : undefined,
      };
    };

    it('should mask emergency contact for non-authorized users', () => {
      const contact: EmergencyContact = {
        name: 'Jane Smith',
        relationship: 'Spouse',
        phone: '+968 9876 5432',
        email: 'jane.smith@email.com',
      };

      const masked = maskEmergencyContact(contact);

      expect(masked.name).toBe('Jane ***');
      expect(masked.relationship).toBe('Spouse'); // Keep relationship
      expect(masked.phone).toBe('+968****32');
      expect(masked.email).toBe('****@****');
    });
  });

  describe('Org Chart Data Privacy', () => {
    interface OrgChartNode {
      id: string;
      name: string;
      title: string;
      department: string;
      reportsTo?: string;
      email: string;
      salary?: number;
    }

    const sanitizeForOrgChart = (
      node: OrgChartNode,
      includeContactInfo: boolean
    ): Partial<OrgChartNode> => {
      const base = {
        id: node.id,
        name: node.name,
        title: node.title,
        department: node.department,
        reportsTo: node.reportsTo,
      };

      if (includeContactInfo) {
        return { ...base, email: node.email };
      }

      // Never include salary in org chart
      return base;
    };

    it('should never expose salary in org chart', () => {
      const node: OrgChartNode = {
        id: 'emp-001',
        name: 'Alice Johnson',
        title: 'Engineering Manager',
        department: 'Engineering',
        email: 'alice@company.com',
        salary: 120000,
      };

      const sanitized = sanitizeForOrgChart(node, true);
      expect(sanitized.salary).toBeUndefined();
    });

    it('should hide email for external org charts', () => {
      const node: OrgChartNode = {
        id: 'emp-002',
        name: 'Bob Williams',
        title: 'Senior Developer',
        department: 'Engineering',
        email: 'bob@company.com',
      };

      const sanitized = sanitizeForOrgChart(node, false);
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.name).toBe('Bob Williams');
    });
  });
});
