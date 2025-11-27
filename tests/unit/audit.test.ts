import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/server/models/AuditLog', () => ({
  AuditLogModel: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

import { audit } from '@/lib/audit';
import { AuditLogModel } from '@/server/models/AuditLog';
import { logger } from '@/lib/logger';

const mockAuditLog = vi.mocked(AuditLogModel);
const mockLogger = vi.mocked(logger);

describe('audit normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps auth.login to LOGIN and preserves rawAction metadata', async () => {
    await audit({
      actorId: 'user-1',
      actorEmail: 'user@example.com',
      action: 'auth.login',
      targetType: 'user',
      orgId: 'org-1',
    });

    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN',
        metadata: expect.objectContaining({
          rawAction: 'auth.login',
          actorEmail: '[REDACTED]',
          source: 'WEB',
        }),
        result: expect.objectContaining({ success: true }),
      }),
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('maps property targetType to PROPERTY', async () => {
    await audit({
      actorId: 'user-1',
      actorEmail: 'user@example.com',
      action: 'entity.update',
      targetType: 'property',
      orgId: 'org-1',
    });

    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'PROPERTY',
      }),
    );
  });

  it('maps service_provider targetType to SERVICE_PROVIDER', async () => {
    await audit({
      actorId: 'user-1',
      actorEmail: 'user@example.com',
      action: 'entity.update',
      targetType: 'service_provider',
      orgId: 'org-1',
    });

    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'SERVICE_PROVIDER',
      }),
    );
  });

  it('defaults to CUSTOM for unknown actions', async () => {
    await audit({
      actorId: 'user-1',
      actorEmail: 'user@example.com',
      action: 'unknown.action',
      targetType: 'user',
      orgId: 'org-1',
    });

    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CUSTOM',
      }),
    );
  });

  it('triggers critical alert logger for grant actions using rawAction', async () => {
    await audit({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      action: 'user.grantSuperAdmin',
      targetType: 'user',
      target: 'target@example.com',
      orgId: 'org-1',
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT CRITICAL]'),
      expect.objectContaining({
        meta: expect.objectContaining({ rawAction: 'user.grantSuperAdmin' }),
        severity: 'critical',
      }),
    );
  });
});
