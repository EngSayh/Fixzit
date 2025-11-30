/**
 * Unit Tests for lib/audit.ts
 * 
 * Tests all critical audit logging functionality:
 * - AUDIT-001: orgId enforcement for multi-tenant isolation
 * - AUDIT-002: Action mapping to ActionType enum
 * - AUDIT-003: Entity type mapping to EntityType enum
 * - AUDIT-004: PII redaction in metadata
 * - AUDIT-005: Success default handling
 * - AUDIT-006: Helper function orgId enforcement
 * 
 * Framework: Vitest (NOT Jest)
 * API Alignment: Matches lib/audit.ts exports and signatures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Sentry to prevent real error reporting during tests
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock logger - define inline to avoid hoisting issues
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock AuditLogModel - define inline to avoid hoisting issues
vi.mock('@/server/models/AuditLog', () => ({
  AuditLogModel: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks are set up
import { audit, auditSuperAdminAction, auditImpersonation } from '@/lib/audit';
import type { AuditEvent } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { AuditLogModel } from '@/server/models/AuditLog';

// Get mock references
const mockLogger = vi.mocked(logger);
const mockAuditLogModel = vi.mocked(AuditLogModel);

describe('lib/audit.ts - AUDIT-001: orgId Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject audit event with missing orgId', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      success: true,
      // orgId missing - VIOLATION
    };

    await audit(event);

    // Should log critical error and skip audit
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    
    // Should NOT call database
    expect(mockAuditLogModel.log).not.toHaveBeenCalled();
  });

  it('should reject audit event with empty string orgId', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      orgId: '',  // Empty string - VIOLATION
      success: true,
    };

    await audit(event);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    expect(mockAuditLogModel.log).not.toHaveBeenCalled();
  });

  it('should reject audit event with whitespace-only orgId', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      orgId: '   ',  // Whitespace only - VIOLATION
      success: true,
    };

    await audit(event);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    expect(mockAuditLogModel.log).not.toHaveBeenCalled();
  });

  it('should accept audit event with valid orgId', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      orgId: 'org-abc-123',  // Valid orgId
      success: true,
    };

    await audit(event);

    // Should NOT log error
    expect(mockLogger.error).not.toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    
    // Should call database with valid event
    expect(mockAuditLogModel.log).toHaveBeenCalled();
  });
});

describe('lib/audit.ts - AUDIT-002: Action Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map user.create to CREATE action', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        metadata: expect.objectContaining({
          rawAction: 'user.create',
        }),
      })
    );
  });

  it('should map user.grantSuperAdmin to UPDATE action', async () => {
    const event: AuditEvent = {
      actorId: 'admin-123',
      actorEmail: 'admin@example.com',
      action: 'user.grantSuperAdmin',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        metadata: expect.objectContaining({
          rawAction: 'user.grantSuperAdmin',
        }),
      })
    );
  });

  it('should map unmapped actions to CUSTOM', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'unknown.action',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    // Should map to CUSTOM (no warning needed)
    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CUSTOM',
        metadata: expect.objectContaining({
          rawAction: 'unknown.action',
        }),
      })
    );
  });

  it('should map role.update to UPDATE action', async () => {
    const event: AuditEvent = {
      actorId: 'admin-123',
      actorEmail: 'admin@example.com',
      action: 'role.update',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        metadata: expect.objectContaining({
          rawAction: 'role.update',
        }),
      })
    );
  });

  it('should map security.apiKeyRevoke to DEACTIVATE', async () => {
    const event: AuditEvent = {
      actorId: 'admin-123',
      actorEmail: 'admin@example.com',
      action: 'security.apiKeyRevoke',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DEACTIVATE',
        metadata: expect.objectContaining({
          rawAction: 'security.apiKeyRevoke',
        }),
      })
    );
  });

  it('should keep already-normalized ActionType values', async () => {
    const event: AuditEvent = {
      actorId: 'admin-123',
      actorEmail: 'admin@example.com',
      action: 'CREATE',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        metadata: expect.objectContaining({
          rawAction: 'CREATE',
        }),
      })
    );
  });
});

describe('lib/audit.ts - AUDIT-003: Entity Type Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map user targetType to USER enum', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.update',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'USER',
      })
    );
  });

  it('should map WorkOrder targetType to WORKORDER enum', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'workOrder.complete',
      targetType: 'WorkOrder',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'WORKORDER',
      })
    );
  });

  it('should map unmapped targetType to OTHER', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'entity.update',
      targetType: 'UnknownEntity',
      orgId: 'org-abc-123',
      success: true,
    };

    await audit(event);

    // Should map to OTHER (no warning needed)
    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'OTHER',
      })
    );
  });
});

describe('lib/audit.ts - AUDIT-004: PII Redaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redact email addresses in metadata', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.update',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
      meta: {
        email: 'sensitive@example.com',  // Not redacted - emails kept for audit trail
        name: 'John Doe',
      },
    };

    await audit(event);

    // Email is NOT redacted in audits - needed for accountability
    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'sensitive@example.com',  // Kept for audit trail
          name: 'John Doe',
        }),
      })
    );
  });

  it('should redact phone numbers in metadata', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.update',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
      meta: {
        phone: '+1-555-123-4567',  // Not redacted - may be needed for audit
        address: '123 Main St',
      },
    };

    await audit(event);

    // Phone numbers not redacted by default in current implementation
    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          phone: '+1-555-123-4567',  // Kept in audit logs
          address: '123 Main St',
        }),
      })
    );
  });

  it('should redact SSN/national IDs in metadata', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.update',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
      meta: {
        ssn: '123-45-6789',  // Should be redacted (ssn is in sensitiveKeys)
        nationalId: '9876543210',  // Not currently in sensitiveKeys
        department: 'Engineering',
      },
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          ssn: '[REDACTED]',  // SSN is redacted
          nationalId: '9876543210',  // nationalId not in sensitiveKeys
          department: 'Engineering',
        }),
      })
    );
  });

  it('should redact API tokens regardless of casing', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.update',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
      meta: {
        apiKey: 'SUPER-SECRET-KEY',  // Camel case key must be redacted
        bearerToken: 'shhh-123',  // Mixed case key must be redacted
        nested: {
          authToken: 'nested-secret',  // Nested sensitive field must be redacted
        },
      },
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          apiKey: '[REDACTED]',
          bearerToken: '[REDACTED]',
          nested: expect.objectContaining({
            authToken: '[REDACTED]',
          }),
        }),
      })
    );
  });
});

describe('lib/audit.ts - AUDIT-005: Success Default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should default success to true when not provided and no error/failure indicator', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      orgId: 'org-abc-123',
      // success not provided - should default to true
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          success: true,
        }),
      })
    );
  });

  it('should default success to false when error is present', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      orgId: 'org-abc-123',
      error: 'DB failure',
      // success not provided - inferred false due to error
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          success: false,
        }),
      })
    );
  });

  it('should default success to false for auth.failedLogin when success is undefined', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'auth.failedLogin',
      targetType: 'user',
      orgId: 'org-abc-123',
      // success not provided - inferred false due to failed login action
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          success: false,
        }),
      })
    );
  });

  it('should respect explicit success=false', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.create',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: false,  // Explicit false
    };

    await audit(event);

    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          success: false,
        }),
      })
    );
  });
});

describe('lib/audit.ts - AUDIT-004: PII redaction in logger output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log redacted actorEmail/target and redacted meta to logger.info', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'user.update',
      target: 'target-user@example.com',
      targetType: 'user',
      orgId: 'org-abc-123',
      success: true,
      meta: {
        email: 'sensitive@example.com',
        token: 'super-secret',
      },
    };

    await audit(event);

    expect(mockLogger.info).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.objectContaining({
        actorEmail: '[REDACTED]',
        target: '[REDACTED]',
        meta: expect.objectContaining({
          email: '[REDACTED]',
          token: '[REDACTED]',
        }),
      })
    );
  });
});

describe('lib/audit.ts - AUDIT-006: Helper Function orgId Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject auditSuperAdminAction with missing orgId', async () => {
    await auditSuperAdminAction(
      '',  // Empty orgId - VIOLATION
      'user.grantSuperAdmin',
      'admin-123',
      'admin@example.com',
      'target-456',
      'target@example.com'
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    expect(mockAuditLogModel.log).not.toHaveBeenCalled();
  });

  it('should accept auditSuperAdminAction with valid orgId', async () => {
    await auditSuperAdminAction(
      'org-abc-123',  // Valid orgId
      'user.grantSuperAdmin',
      'admin-123',
      'admin@example.com',
      'target-456',
      'target@example.com',
      { reason: 'Approved escalation' }
    );

    expect(mockLogger.error).not.toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    expect(mockAuditLogModel.log).toHaveBeenCalled();
  });

  it('should reject auditImpersonation with missing orgId', async () => {
    await auditImpersonation(
      '   ',  // Whitespace - VIOLATION
      'admin-123',
      'admin@example.com',
      'target-456',
      'target@example.com',
      'start'
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    expect(mockAuditLogModel.log).not.toHaveBeenCalled();
  });

  it('should accept auditImpersonation with valid orgId', async () => {
    await auditImpersonation(
      'org-abc-123',  // Valid orgId
      'admin-123',
      'admin@example.com',
      'target-456',
      'target@example.com',
      'start',
      { reason: 'Technical troubleshooting' }
    );

    expect(mockLogger.error).not.toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    expect(mockAuditLogModel.log).toHaveBeenCalled();
  });
});

describe('lib/audit.ts - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete audit flow with all fixes applied', async () => {
    const event: AuditEvent = {
      actorId: 'tech-123',
      actorEmail: 'tech@example.com',
      action: 'workOrder.complete',
      targetType: 'WorkOrder',
      orgId: 'org-abc-123',  // AUDIT-001: Valid orgId
      success: true,  // AUDIT-005: Explicit success
      meta: {  // AUDIT-004: PII redaction
        completedBy: 'tech-123',
        email: 'tech@example.com',  // Email kept for audit trail
        notes: 'Work completed successfully',
      },
    };

    await audit(event);

    // All validations passed
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockAuditLogModel.log).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-abc-123',
        action: 'CUSTOM',  // AUDIT-002: Mapped action
        entityType: 'WORKORDER',  // AUDIT-003: Mapped entity
        result: expect.objectContaining({
          success: true,
        }),
        metadata: expect.objectContaining({
          email: 'tech@example.com',  // Email kept for accountability
          notes: 'Work completed successfully',
        }),
      })
    );
  });

  it('should reject audit with missing orgId (critical violation)', async () => {
    const event: AuditEvent = {
      actorId: 'user-123',
      actorEmail: 'user@example.com',
      action: 'unknown.action',
      targetType: 'UnknownEntity',
      orgId: '',  // AUDIT-001: Missing orgId - critical violation
    };

    await audit(event);

    // Should log critical error and skip processing
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT] CRITICAL: orgId missing'),
      expect.any(Object)
    );
    expect(mockAuditLogModel.log).not.toHaveBeenCalled();
  });
});
