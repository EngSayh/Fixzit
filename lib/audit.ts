import { logger } from '@/lib/logger';
import { AuditLogModel } from '@/server/models/AuditLog';

/**
 * Audit Logging System
 * 
 * Logs all security-critical actions for compliance and forensics.
 * Especially important for Super Admin actions (grant/revoke/impersonate).
 */

export type AuditEvent = {
  actorId: string;      // User ID performing the action
  actorEmail: string;   // User email for readability
  actorRole?: string;   // Actor role for RBAC correlation
  actorSubRole?: string; // Actor sub-role for STRICT v4 enforcement
  action: string;       // Action performed (e.g., "user.grantSuperAdmin", "user.impersonate")
  target?: string;      // Target user ID/email (if applicable)
  targetType?: string;  // Type of target (e.g., "user", "role", "permission")
  meta?: Record<string, unknown>;  // Additional metadata
  ipAddress?: string;   // Client IP address
  userAgent?: string;   // Client user agent
  success?: boolean;    // Whether action succeeded
  error?: string;       // Error message if failed
  timestamp?: string;   // ISO timestamp (auto-added)
  orgId?: string;       // Organization ID for multi-tenancy
};

// Sensitive data redaction lists
const SENSITIVE_META_KEYS = [
  'password', 'token', 'secret', 'apiKey', 'api_key',
  'accessToken', 'refreshToken', 'authToken', 'bearerToken',
  'ssn', 'socialSecurityNumber', 'creditCard', 'cardNumber', 'cvv', 'pin',
  'privateKey', 'credentials',
];

const SENSITIVE_LOG_KEYS = [
  ...SENSITIVE_META_KEYS,
  // Additional PII to keep out of log streams (still stored in DB metadata for accountability)
  'email', 'phone', 'mobile', 'phonenumber', 'mobilenumber',
];

/**
 * Audit log to console and/or database
 * 
 * Production implementation:
 * - ✅ Writes to dedicated audit collection (AuditLogModel)
 * - ✅ Sends to external logging service (Sentry)
 * - ✅ Triggers alerts for critical actions (logger.warn with high priority)
 * 
 * @param event Audit event data
 */
export async function audit(event: AuditEvent): Promise<void> {
  const normalizeKeys = (keys: string[]): string[] =>
    keys.map(key => key.toLowerCase());

  const redactSensitive = (
    obj: Record<string, unknown>,
    sensitiveKeys: string[] = SENSITIVE_META_KEYS,
    normalizedKeys: string[] = normalizeKeys(sensitiveKeys),
  ): Record<string, unknown> => {
    const redactValue = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(redactValue);
      }
      if (value && typeof value === 'object') {
        return redactSensitive(value as Record<string, unknown>, sensitiveKeys, normalizedKeys);
      }
      return value;
    };

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (normalizedKeys.some(s => lowerKey.includes(s))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactValue(value);
      }
    }
    return result;
  };

  const orgId = event.orgId?.trim();
  if (!orgId) {
    const sanitizedEvent = {
      ...event,
      meta: event.meta ? redactSensitive(event.meta, SENSITIVE_LOG_KEYS) : undefined,
      actorEmail: event.actorEmail ? '[REDACTED]' : undefined,
      target: event.target ? '[REDACTED]' : undefined,
    };
    logger.error('[AUDIT] CRITICAL: orgId missing', { event: sanitizedEvent });
    try {
      if (typeof window === 'undefined' && process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
        const Sentry = await import('@sentry/nextjs').catch(() => null);
        if (Sentry) {
          Sentry.captureMessage('[AUDIT] orgId missing', {
            level: 'error',
            extra: sanitizedEvent,
            tags: {
              audit_action: sanitizedEvent.action ?? 'unknown',
            },
          });
        }
      }
    } catch (sentryError: unknown) {
      const errorToLog = sentryError instanceof Error ? sentryError : new Error(String(sentryError));
      logger.error('[AUDIT] Failed to send missing orgId alert:', errorToLog);
    }
    return;
  }

  const rawAction = event.action?.trim() ?? '';
  const normalizedRawAction = rawAction;
  const normalizedRawActionKey = normalizedRawAction.toLowerCase();
  const ACTION_TYPES = new Set([
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'IMPORT',
    'APPROVE',
    'REJECT',
    'SEND',
    'RECEIVE',
    'UPLOAD',
    'DOWNLOAD',
    'SHARE',
    'ARCHIVE',
    'RESTORE',
    'ACTIVATE',
    'DEACTIVATE',
    'CUSTOM',
  ]);
  // AUDIT-001 FIX: Comprehensive action mapping to ActionType enum
  const ACTION_MAP: Record<string, string> = {
    // Create actions
    'user.create': 'CREATE',
    'role.create': 'CREATE',
    'permission.create': 'CREATE',
    'security.apikeycreate': 'CREATE',
    // Update actions
    'user.update': 'UPDATE',
    'user.grantsuperadmin': 'UPDATE',
    'user.revokesuperadmin': 'UPDATE',
    'user.assignrole': 'UPDATE',
    'user.removerole': 'UPDATE',
    'role.update': 'UPDATE',
    'role.assignpermission': 'UPDATE',
    'role.removepermission': 'UPDATE',
    'permission.update': 'UPDATE',
    'auth.passwordchange': 'UPDATE',
    'auth.passwordreset': 'UPDATE',
    'data.bulkupdate': 'UPDATE',
    // Delete actions
    'user.delete': 'DELETE',
    'role.delete': 'DELETE',
    'permission.delete': 'DELETE',
    'data.bulkdelete': 'DELETE',
    // Auth actions
    'auth.login': 'LOGIN',
    'auth.logout': 'LOGOUT',
    'auth.failedlogin': 'LOGIN',
    // Data operations
    'data.export': 'EXPORT',
    'data.import': 'IMPORT',
    'compliance.reportgenerate': 'EXPORT',
    'compliance.auditlogaccess': 'READ',
    // MFA/Security
    'auth.mfaenable': 'ACTIVATE',
    'auth.mfadisable': 'DEACTIVATE',
    'user.lock': 'DEACTIVATE',
    'user.unlock': 'ACTIVATE',
    'security.settingschange': 'UPDATE',
    'security.apikeyrevoke': 'DEACTIVATE',
    // Impersonation
    'impersonate.start': 'CUSTOM',
    'impersonate.end': 'CUSTOM',
  };
  const mappedAction = ACTION_MAP[normalizedRawActionKey];
  const action = mappedAction ?? (ACTION_TYPES.has(normalizedRawAction.toUpperCase()) ? normalizedRawAction.toUpperCase() : 'CUSTOM');

  const targetType = (event.targetType || '').toLowerCase();
  // AUDIT-005 FIX: Comprehensive entity type mapping
  const ENTITY_MAP: Record<string, string> = {
    user: 'USER',
    users: 'USER',
    role: 'SETTING',
    permission: 'SETTING',
    property: 'PROPERTY',
    properties: 'PROPERTY',
    tenant: 'TENANT',
    owner: 'OWNER',
    contract: 'CONTRACT',
    payment: 'PAYMENT',
    invoice: 'INVOICE',
    workorder: 'WORKORDER',
    work_order: 'WORKORDER',
    ticket: 'TICKET',
    project: 'PROJECT',
    bid: 'BID',
    vendor: 'VENDOR',
    serviceprovider: 'SERVICE_PROVIDER',
    service_provider: 'SERVICE_PROVIDER',
    document: 'DOCUMENT',
    setting: 'SETTING',
  };
  const entityType = ENTITY_MAP[targetType] ?? 'OTHER';

  const sanitizedMeta = redactSensitive(event.meta || {});

  const success = event.success ?? (event.error ? false : rawAction !== 'auth.failedLogin');
  if (event.success === undefined) {
    logger.warn('[AUDIT] success flag missing; inferring from context', {
      action: rawAction,
      actorId: event.actorId,
      inferredSuccess: success,
    });
  }

  const entry: AuditEvent = {
    ...event,
    orgId,
    action,
    targetType: entityType,
    actorRole: event.actorRole,
    actorSubRole: event.actorSubRole,
    meta: {
      ...sanitizedMeta,
      rawAction,
      actorRole: event.actorRole,
      actorSubRole: event.actorSubRole,
    },
    success,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  const sanitizedLogEntry = {
    ...entry,
    actorEmail: entry.actorEmail ? '[REDACTED]' : undefined,
    target: entry.target ? '[REDACTED]' : undefined,
    meta: redactSensitive(entry.meta || {}, SENSITIVE_LOG_KEYS),
  };

  // Structured logging
  logger.info('[AUDIT]', sanitizedLogEntry);

  // ✅ Write to database
  try {
    const entityId = (entry.meta?.targetId as string | undefined) || undefined;
    await AuditLogModel.log({
      orgId,
      action: entry.action,
      entityType: entry.targetType || 'OTHER',
      entityId,
      entityName: (entry.meta?.targetName as string | undefined) || (entry.target ? String(entry.target) : undefined),
      userId: entry.actorId,
      context: {
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
      metadata: {
        ...entry.meta,
        actorEmail: entry.actorEmail ? '[REDACTED]' : undefined,
        source: 'WEB',
      },
      result: {
        success: entry.success === true,
        errorMessage: entry.error,
      },
    });
  } catch (dbError: unknown) {
    // Silent fail - don't break main operation if database write fails
    // Safe error handling: preserve stack trace
    const errorToLog = dbError instanceof Error ? dbError : new Error(String(dbError));
    logger.error('[AUDIT] Database write failed:', errorToLog);
  }

  // Send to external monitoring service (Sentry)
  try {
    if (typeof window === 'undefined' && process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      // Server-side Sentry integration
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry) {
        Sentry.captureMessage(`[AUDIT] ${entry.action}`, {
          level: 'info',
          extra: sanitizedLogEntry,
          tags: {
            audit_action: entry.action,
            actor_id: entry.actorId,
            target_type: entry.targetType || 'unknown',
            org_id: orgId,
            actor_role: entry.actorRole,
            actor_sub_role: entry.actorSubRole,
          },
        });
      }
    }
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('[AUDIT] Failed to send to Sentry:', error as Error);
  }

  // Trigger alerts for critical actions (Super Admin, Impersonation)
  const rawActionLower = (entry.meta?.rawAction as string | undefined)?.toLowerCase() || '';
  const isCriticalAction =
    rawActionLower.includes('grant') ||
    rawActionLower.includes('impersonate') ||
    rawActionLower.includes('revoke');

  if (isCriticalAction) {
    try {
      // Log critical action with high priority
      logger.warn(`[AUDIT CRITICAL] ${entry.action} by [REDACTED] on [REDACTED]`, {
        ...sanitizedLogEntry,
        severity: 'critical',
      });
      
      // Future: Send Slack/PagerDuty alert
      // if (process.env.SLACK_WEBHOOK_URL) {
      //   await fetch(process.env.SLACK_WEBHOOK_URL, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       text: `🚨 CRITICAL AUDIT: ${entry.action}`,
      //       attachments: [{ text: JSON.stringify(entry, null, 2), color: 'danger' }]
      //     })
      //   });
      // }
    } catch (alertError: unknown) {
      // Safe error handling: preserve stack trace
      const errorToLog = alertError instanceof Error ? alertError : new Error(String(alertError));
      logger.error('[AUDIT] Failed to send critical action alert:', errorToLog);
    }
  }
}

/**
 * Audit categories for filtering/querying
 */
export const AuditCategories = {
  AUTH: 'auth',
  USER_MANAGEMENT: 'user.management',
  ROLE_MANAGEMENT: 'role.management',
  PERMISSION_MANAGEMENT: 'permission.management',
  SUPER_ADMIN: 'super.admin',
  IMPERSONATION: 'impersonation',
  DATA_ACCESS: 'data.access',
  DATA_MODIFICATION: 'data.modification',
  SECURITY: 'security',
  COMPLIANCE: 'compliance',
} as const;

/**
 * Audit actions for common operations
 */
export const AuditActions = {
  // User Management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_GRANT_SUPER: 'user.grantSuperAdmin',
  USER_REVOKE_SUPER: 'user.revokeSuperAdmin',
  USER_ASSIGN_ROLE: 'user.assignRole',
  USER_REMOVE_ROLE: 'user.removeRole',
  USER_LOCK: 'user.lock',
  USER_UNLOCK: 'user.unlock',

  // Impersonation
  IMPERSONATE_START: 'impersonate.start',
  IMPERSONATE_END: 'impersonate.end',

  // Role Management
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_ASSIGN_PERMISSION: 'role.assignPermission',
  ROLE_REMOVE_PERMISSION: 'role.removePermission',

  // Permission Management
  PERMISSION_CREATE: 'permission.create',
  PERMISSION_UPDATE: 'permission.update',
  PERMISSION_DELETE: 'permission.delete',

  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_FAILED_LOGIN: 'auth.failedLogin',
  AUTH_PASSWORD_CHANGE: 'auth.passwordChange',
  AUTH_PASSWORD_RESET: 'auth.passwordReset',
  AUTH_MFA_ENABLE: 'auth.mfaEnable',
  AUTH_MFA_DISABLE: 'auth.mfaDisable',

  // Data Access
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_BULK_UPDATE: 'data.bulkUpdate',
  DATA_BULK_DELETE: 'data.bulkDelete',

  // Security
  SECURITY_SETTINGS_CHANGE: 'security.settingsChange',
  SECURITY_API_KEY_CREATE: 'security.apiKeyCreate',
  SECURITY_API_KEY_REVOKE: 'security.apiKeyRevoke',

  // Compliance
  COMPLIANCE_REPORT_GENERATE: 'compliance.reportGenerate',
  COMPLIANCE_AUDIT_LOG_ACCESS: 'compliance.auditLogAccess',
} as const;

/**
 * Helper to audit Super Admin actions
 */
export async function auditSuperAdminAction(
  orgId: string,
  action: string,
  actorId: string,
  actorEmail: string,
  targetId?: string,
  targetEmail?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const normalizedOrgId = orgId?.trim();
  if (!normalizedOrgId) {
    logger.error("[AUDIT] CRITICAL: orgId missing for super admin action", {
      action,
      actorId,
      targetId,
    });
    return;
  }

  await audit({
    orgId: normalizedOrgId,
    actorId,
    actorEmail,
    action,
    target: targetEmail || targetId,
    targetType: 'user',
    meta: {
      ...meta,
      category: AuditCategories.SUPER_ADMIN,
      severity: 'critical',
    },
  });
}

/**
 * Helper to audit impersonation
 */
export async function auditImpersonation(
  orgId: string,
  actorId: string,
  actorEmail: string,
  targetId: string,
  targetEmail: string,
  action: 'start' | 'end',
  meta?: Record<string, unknown>
): Promise<void> {
  const normalizedOrgId = orgId?.trim();
  if (!normalizedOrgId) {
    logger.error("[AUDIT] CRITICAL: orgId missing for impersonation action", {
      actorId,
      targetId,
      action,
    });
    return;
  }

  await audit({
    orgId: normalizedOrgId,
    actorId,
    actorEmail,
    action: action === 'start' ? AuditActions.IMPERSONATE_START : AuditActions.IMPERSONATE_END,
    target: targetEmail,
    targetType: 'user',
    meta: {
      ...meta,
      category: AuditCategories.IMPERSONATION,
      severity: 'critical',
      targetId,
    },
  });
}
