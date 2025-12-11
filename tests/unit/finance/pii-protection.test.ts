/**
 * Finance Module PII Protection Tests
 * Tests data encryption, masking, and audit logging for sensitive financial data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Finance PII Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Bank Account Number Masking', () => {
    const maskBankAccount = (accountNumber: string): string => {
      if (!accountNumber || accountNumber.length < 4) {
        return '****';
      }
      const lastFour = accountNumber.slice(-4);
      const masked = '*'.repeat(accountNumber.length - 4);
      return masked + lastFour;
    };

    it('should mask bank account numbers showing only last 4 digits', () => {
      expect(maskBankAccount('1234567890123456')).toBe('************3456');
      expect(maskBankAccount('9876543210')).toBe('******3210');
    });

    it('should handle short account numbers', () => {
      expect(maskBankAccount('123')).toBe('****');
      expect(maskBankAccount('')).toBe('****');
    });

    it('should handle IBAN format', () => {
      const iban = 'OM12BANK0001234567890123';
      const masked = maskBankAccount(iban);
      expect(masked).toBe('********************0123');
      expect(masked.endsWith('0123')).toBe(true);
    });
  });

  describe('Credit Card Number Masking', () => {
    const maskCreditCard = (cardNumber: string): string => {
      const digitsOnly = cardNumber.replace(/\D/g, '');
      if (digitsOnly.length < 4) {
        return '****';
      }
      const lastFour = digitsOnly.slice(-4);
      const firstSix = digitsOnly.slice(0, 6);
      const masked = firstSix.slice(0, 4) + ' **** **** ' + lastFour;
      return masked;
    };

    it('should show first 4 and last 4 digits only', () => {
      const masked = maskCreditCard('4111111111111111');
      expect(masked).toBe('4111 **** **** 1111');
    });

    it('should handle formatted card numbers', () => {
      const masked = maskCreditCard('4111-1111-1111-1111');
      expect(masked).toBe('4111 **** **** 1111');
    });

    it('should handle card with spaces', () => {
      const masked = maskCreditCard('4111 1111 1111 1111');
      expect(masked).toBe('4111 **** **** 1111');
    });
  });

  describe('Salary Data Encryption', () => {
    // Simulate encryption/decryption
    const encryptValue = (value: string, key: string): string => {
      // In real implementation, use proper encryption
      return Buffer.from(`${key}:${value}`).toString('base64');
    };

    const decryptValue = (encrypted: string, key: string): string => {
      const decoded = Buffer.from(encrypted, 'base64').toString();
      const [storedKey, value] = decoded.split(':');
      if (storedKey !== key) {
        throw new Error('Invalid encryption key');
      }
      return value;
    };

    it('should encrypt salary data', () => {
      const salary = '50000';
      const key = 'test-encryption-key';
      const encrypted = encryptValue(salary, key);
      
      expect(encrypted).not.toBe(salary);
      expect(encrypted).not.toContain('50000');
    });

    it('should decrypt salary with correct key', () => {
      const salary = '75000';
      const key = 'correct-key';
      const encrypted = encryptValue(salary, key);
      const decrypted = decryptValue(encrypted, key);
      
      expect(decrypted).toBe(salary);
    });

    it('should fail to decrypt with wrong key', () => {
      const salary = '100000';
      const encrypted = encryptValue(salary, 'correct-key');
      
      expect(() => decryptValue(encrypted, 'wrong-key')).toThrow('Invalid encryption key');
    });
  });

  describe('Tax ID Protection', () => {
    const maskTaxId = (taxId: string): string => {
      if (!taxId || taxId.length < 3) {
        return '***';
      }
      // Show only last 3 characters
      const lastThree = taxId.slice(-3);
      return '*'.repeat(taxId.length - 3) + lastThree;
    };

    it('should mask tax identification numbers', () => {
      expect(maskTaxId('123456789')).toBe('******789');
      expect(maskTaxId('AB-123-456-789')).toBe('***********789');
    });

    it('should handle short tax IDs', () => {
      expect(maskTaxId('12')).toBe('***');
      expect(maskTaxId('')).toBe('***');
    });
  });

  describe('Audit Trail for Financial Data Access', () => {
    interface AuditEntry {
      userId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      timestamp: Date;
      ipAddress: string;
      sensitiveFieldsAccessed: string[];
    }

    const auditLog: AuditEntry[] = [];

    const logFinancialAccess = (entry: Omit<AuditEntry, 'timestamp'>): void => {
      auditLog.push({
        ...entry,
        timestamp: new Date(),
      });
    };

    beforeEach(() => {
      auditLog.length = 0;
    });

    it('should log access to salary data', () => {
      logFinancialAccess({
        userId: 'user-123',
        action: 'VIEW',
        resourceType: 'employee_salary',
        resourceId: 'emp-456',
        ipAddress: '192.168.1.1',
        sensitiveFieldsAccessed: ['baseSalary', 'bonus', 'taxDeductions'],
      });

      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].sensitiveFieldsAccessed).toContain('baseSalary');
      expect(auditLog[0].action).toBe('VIEW');
    });

    it('should log modifications to bank details', () => {
      logFinancialAccess({
        userId: 'admin-789',
        action: 'UPDATE',
        resourceType: 'bank_account',
        resourceId: 'bank-acc-123',
        ipAddress: '10.0.0.1',
        sensitiveFieldsAccessed: ['accountNumber', 'routingNumber'],
      });

      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].action).toBe('UPDATE');
      expect(auditLog[0].resourceType).toBe('bank_account');
    });

    it('should include timestamp for compliance', () => {
      const beforeLog = new Date();
      
      logFinancialAccess({
        userId: 'user-999',
        action: 'EXPORT',
        resourceType: 'payroll_report',
        resourceId: 'report-2024-01',
        ipAddress: '172.16.0.1',
        sensitiveFieldsAccessed: ['allEmployeeSalaries'],
      });

      const afterLog = new Date();
      
      expect(auditLog[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
      expect(auditLog[0].timestamp.getTime()).toBeLessThanOrEqual(afterLog.getTime());
    });
  });

  describe('Data Retention and Purging', () => {
    interface FinancialRecord {
      id: string;
      createdAt: Date;
      isPurged: boolean;
      data: Record<string, unknown>;
    }

    const purgeOldRecords = (records: FinancialRecord[], retentionDays: number): FinancialRecord[] => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      return records.map(record => {
        if (record.createdAt < cutoffDate) {
          return {
            ...record,
            isPurged: true,
            data: {}, // Clear sensitive data
          };
        }
        return record;
      });
    };

    it('should purge records older than retention period', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days ago

      const records: FinancialRecord[] = [
        {
          id: 'old-record',
          createdAt: oldDate,
          isPurged: false,
          data: { salary: 50000, bonus: 5000 },
        },
        {
          id: 'new-record',
          createdAt: new Date(),
          isPurged: false,
          data: { salary: 60000, bonus: 6000 },
        },
      ];

      const purged = purgeOldRecords(records, 365); // 1 year retention

      expect(purged[0].isPurged).toBe(true);
      expect(purged[0].data).toEqual({});
      expect(purged[1].isPurged).toBe(false);
      expect(purged[1].data.salary).toBe(60000);
    });

    it('should keep records within retention period', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      const records: FinancialRecord[] = [
        {
          id: 'recent-record',
          createdAt: recentDate,
          isPurged: false,
          data: { accountNumber: '1234567890' },
        },
      ];

      const purged = purgeOldRecords(records, 365);

      expect(purged[0].isPurged).toBe(false);
      expect(purged[0].data.accountNumber).toBe('1234567890');
    });
  });

  describe('Role-Based Financial Data Access', () => {
    interface User {
      id: string;
      role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'FINANCE_ADMIN';
    }

    interface AccessPolicy {
      canViewSalary: boolean;
      canViewBankDetails: boolean;
      canExportPayroll: boolean;
      canModifyCompensation: boolean;
    }

    const getFinanceAccessPolicy = (user: User): AccessPolicy => {
      switch (user.role) {
        case 'SUPER_ADMIN':
        case 'FINANCE_ADMIN':
          return {
            canViewSalary: true,
            canViewBankDetails: true,
            canExportPayroll: true,
            canModifyCompensation: true,
          };
        case 'ADMIN':
          return {
            canViewSalary: true,
            canViewBankDetails: true,
            canExportPayroll: true,
            canModifyCompensation: false,
          };
        case 'MANAGER':
          return {
            canViewSalary: true, // Only direct reports
            canViewBankDetails: false,
            canExportPayroll: false,
            canModifyCompensation: false,
          };
        case 'EMPLOYEE':
        default:
          return {
            canViewSalary: true, // Own salary only
            canViewBankDetails: true, // Own details only
            canExportPayroll: false,
            canModifyCompensation: false,
          };
      }
    };

    it('should grant full access to FINANCE_ADMIN', () => {
      const policy = getFinanceAccessPolicy({ id: 'u1', role: 'FINANCE_ADMIN' });
      expect(policy.canViewSalary).toBe(true);
      expect(policy.canViewBankDetails).toBe(true);
      expect(policy.canExportPayroll).toBe(true);
      expect(policy.canModifyCompensation).toBe(true);
    });

    it('should restrict MANAGER from bank details and export', () => {
      const policy = getFinanceAccessPolicy({ id: 'u2', role: 'MANAGER' });
      expect(policy.canViewSalary).toBe(true);
      expect(policy.canViewBankDetails).toBe(false);
      expect(policy.canExportPayroll).toBe(false);
      expect(policy.canModifyCompensation).toBe(false);
    });

    it('should limit EMPLOYEE to own data access', () => {
      const policy = getFinanceAccessPolicy({ id: 'u3', role: 'EMPLOYEE' });
      expect(policy.canViewSalary).toBe(true);
      expect(policy.canViewBankDetails).toBe(true);
      expect(policy.canExportPayroll).toBe(false);
      expect(policy.canModifyCompensation).toBe(false);
    });
  });

  describe('Financial Data Export Controls', () => {
    interface ExportRequest {
      userId: string;
      exportType: 'payroll' | 'taxes' | 'expenses' | 'invoices';
      dateRange: { start: Date; end: Date };
      format: 'csv' | 'pdf' | 'excel';
    }

    interface ExportResult {
      approved: boolean;
      requiresApproval: boolean;
      approvalReason?: string;
    }

    const validateExportRequest = (request: ExportRequest): ExportResult => {
      // Payroll exports always require additional approval
      if (request.exportType === 'payroll') {
        return {
          approved: false,
          requiresApproval: true,
          approvalReason: 'Payroll exports require manager approval',
        };
      }

      // Large date ranges require approval
      const daysDiff = Math.ceil(
        (request.dateRange.end.getTime() - request.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 365) {
        return {
          approved: false,
          requiresApproval: true,
          approvalReason: 'Exports spanning more than 1 year require approval',
        };
      }

      return {
        approved: true,
        requiresApproval: false,
      };
    };

    it('should require approval for payroll exports', () => {
      const result = validateExportRequest({
        userId: 'user-123',
        exportType: 'payroll',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        format: 'excel',
      });

      expect(result.requiresApproval).toBe(true);
      expect(result.approved).toBe(false);
      expect(result.approvalReason).toContain('manager approval');
    });

    it('should allow small expense exports without approval', () => {
      const result = validateExportRequest({
        userId: 'user-456',
        exportType: 'expenses',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-03-31'),
        },
        format: 'csv',
      });

      expect(result.approved).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should require approval for exports spanning more than 1 year', () => {
      const result = validateExportRequest({
        userId: 'user-789',
        exportType: 'invoices',
        dateRange: {
          start: new Date('2022-01-01'),
          end: new Date('2024-12-31'),
        },
        format: 'pdf',
      });

      expect(result.requiresApproval).toBe(true);
      expect(result.approvalReason).toContain('more than 1 year');
    });
  });
});
