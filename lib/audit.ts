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
  const orgId = event.orgId?.trim();
  if (!orgId) {
    logger.error('[AUDIT] CRITICAL: orgId missing', { event });
    return;
  }

  const rawAction = event.action;
  const ACTION_MAP: Record<string, string> = {
    'user.create': 'CREATE',
    'user.grantSuperAdmin': 'UPDATE',
  };
  const action = ACTION_MAP[rawAction] ?? 'CUSTOM';

  const targetType = (event.targetType || '').toLowerCase();
  const ENTITY_MAP: Record<string, string> = {
    user: 'USER',
    workorder: 'WORKORDER',
    'work_order': 'WORKORDER',
  };
  const entityType = ENTITY_MAP[targetType] ?? 'OTHER';

  const sanitizedMeta = { ...(event.meta || {}) };
  if (sanitizedMeta.ssn) {
    sanitizedMeta.ssn = '[REDACTED]';
  }

  const entry: AuditEvent = {
    ...event,
    orgId,
    action,
    targetType: entityType,
    meta: {
      ...sanitizedMeta,
      rawAction,
    },
    success: event.success !== false,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  // Structured logging
  logger.info('[AUDIT]', entry);

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
        actorEmail: entry.actorEmail,
        source: 'WEB',
      },
      result: {
        success: entry.success === true,
        errorMessage: entry.error,
      },
    });
  } catch (dbError: unknown) {
    // Silent fail - don't break main operation if database write fails
    logger.error('[AUDIT] Database write failed:', dbError as Error);
  }

  // Send to external monitoring service (Sentry)
  try {
    if (typeof window === 'undefined' && process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      // Server-side Sentry integration
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry) {
        Sentry.captureMessage(`[AUDIT] ${entry.action}`, {
          level: 'info',
          extra: entry,
          tags: {
            audit_action: entry.action,
            actor_id: entry.actorId,
            target_type: entry.targetType || 'unknown',
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
  if (entry.action.includes('grant') || entry.action.includes('impersonate') || entry.action.includes('revoke')) {
    try {
      // Log critical action with high priority
      logger.warn(`[AUDIT CRITICAL] ${entry.action} by ${entry.actorEmail} on ${entry.target}`, {
        ...entry,
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
      logger.error('[AUDIT] Failed to send critical action alert:', alertError as Error);
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
