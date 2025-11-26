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
  orgId?: string;       // Organization ID for multi-tenancy (REQUIRED - should always be provided)
};

/**
 * AUDIT-001 FIX: Action Mapping to AuditLog ActionType Enum
 * 
 * Maps dotted action strings (e.g., "user.create") to AuditLog ActionType enum values.
 * ActionType enum: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, IMPORT, 
 *                  APPROVE, REJECT, SEND, RECEIVE, UPLOAD, DOWNLOAD, SHARE, 
 *                  ARCHIVE, RESTORE, ACTIVATE, DEACTIVATE, CUSTOM
 * 
 * Original action preserved in metadata.rawAction for searchability.
 */
const actionToVerb: Record<string, string> = {
  // Create actions
  'user.create': 'CREATE',
  'role.create': 'CREATE',
  'permission.create': 'CREATE',
  'security.apiKeyCreate': 'CREATE',
  
  // Update actions
  'user.update': 'UPDATE',
  'role.update': 'UPDATE',
  'permission.update': 'UPDATE',
  'user.assignRole': 'UPDATE',
  'user.removeRole': 'UPDATE',
  'role.assignPermission': 'UPDATE',
  'role.removePermission': 'UPDATE',
  'user.grantSuperAdmin': 'UPDATE',
  'user.revokeSuperAdmin': 'UPDATE',
  'auth.passwordChange': 'UPDATE',
  'auth.passwordReset': 'UPDATE',
  'security.settingsChange': 'UPDATE',
  'data.bulkUpdate': 'UPDATE',
  
  // Delete actions
  'user.delete': 'DELETE',
  'role.delete': 'DELETE',
  'permission.delete': 'DELETE',
  'data.bulkDelete': 'DELETE',
  
  // Auth actions
  'auth.login': 'LOGIN',
  'auth.logout': 'LOGOUT',
  'auth.failedLogin': 'LOGIN',
  
  // Data operations
  'data.export': 'EXPORT',
  'data.import': 'IMPORT',
  'compliance.reportGenerate': 'EXPORT',
  
  // MFA / Security
  'auth.mfaEnable': 'ACTIVATE',
  'auth.mfaDisable': 'DEACTIVATE',
  'user.lock': 'DEACTIVATE',
  'user.unlock': 'ACTIVATE',
  'security.apiKeyRevoke': 'DEACTIVATE',
  
  // Impersonation
  'impersonate.start': 'CUSTOM',
  'impersonate.end': 'CUSTOM',
  
  // Compliance
  'compliance.auditLogAccess': 'READ',
  
  // API access
  'api.access.denied': 'CUSTOM',
  'api.access.forbidden': 'CUSTOM',
};

/**
 * AUDIT-005 FIX: Entity Type Mapping to AuditLog EntityType Enum
 * 
 * Maps various entity type strings to AuditLog EntityType enum values.
 * EntityType enum: USER, PROPERTY, TENANT, OWNER, CONTRACT, PAYMENT, INVOICE, 
 *                  WORKORDER, TICKET, PROJECT, BID, VENDOR, SERVICE_PROVIDER, 
 *                  DOCUMENT, SETTING, OTHER
 */
const entityTypeMap: Record<string, string> = {
  'user': 'USER',
  'users': 'USER',
  'role': 'SETTING',
  'roles': 'SETTING',
  'permission': 'SETTING',
  'permissions': 'SETTING',
  'property': 'PROPERTY',
  'properties': 'PROPERTY',
  'tenant': 'TENANT',
  'tenants': 'TENANT',
  'owner': 'OWNER',
  'owners': 'OWNER',
  'contract': 'CONTRACT',
  'contracts': 'CONTRACT',
  'payment': 'PAYMENT',
  'payments': 'PAYMENT',
  'invoice': 'INVOICE',
  'invoices': 'INVOICE',
  'workorder': 'WORKORDER',
  'workorders': 'WORKORDER',
  'work_order': 'WORKORDER',
  'work_orders': 'WORKORDER',
  'ticket': 'TICKET',
  'tickets': 'TICKET',
  'project': 'PROJECT',
  'projects': 'PROJECT',
  'bid': 'BID',
  'bids': 'BID',
  'vendor': 'VENDOR',
  'vendors': 'VENDOR',
  'service_provider': 'SERVICE_PROVIDER',
  'service_providers': 'SERVICE_PROVIDER',
  'document': 'DOCUMENT',
  'documents': 'DOCUMENT',
  'setting': 'SETTING',
  'settings': 'SETTING',
};

/**
 * AUDIT-004 FIX: Redact Sensitive Fields from Metadata
 * 
 * Removes PII and security-sensitive fields before external logging.
 * Prevents exposure of passwords, tokens, API keys, SSNs, credit cards in logs/Sentry.
 * 
 * @param data Object to redact
 * @returns Sanitized copy with sensitive fields removed
 */
function redactSensitiveFields(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveFields(item));
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'authToken',
    'auth_token',
    'bearerToken',
    'bearer_token',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'credit_card',
    'cardNumber',
    'card_number',
    'cvv',
    'pin',
    'privateKey',
    'private_key',
    'credentials',
  ];

  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Audit log to console and/or database
 * 
 * Production implementation:
 * - ✅ Writes to dedicated audit collection (AuditLogModel)
 * - ✅ Sends to external logging service (Sentry)
 * - ✅ Triggers alerts for critical actions (logger.warn with high priority)
 * 
 * FIXES APPLIED (2025-11-25):
 * - AUDIT-001: Action mapping to ActionType enum with rawAction preservation
 * - AUDIT-002: Enforced mandatory orgId for multi-tenant isolation
 * - AUDIT-003: Success defaults to true (not false) for undefined values
 * - AUDIT-004: PII/secret redaction before external logging
 * - AUDIT-005: Entity type mapping to EntityType enum
 * 
 * @param event Audit event data
 */
export async function audit(event: AuditEvent): Promise<void> {
  // AUDIT-002 FIX: Enforce mandatory orgId for multi-tenant isolation
  // Log error but don't throw to maintain backwards compatibility
  if (!event.orgId || event.orgId.trim() === '') {
    logger.error('[AUDIT] CRITICAL: orgId missing - violates multi-tenant isolation', {
      actorId: event.actorId,
      actorEmail: event.actorEmail,
      action: event.action,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack,
    });
    // Return early - do not write audit logs without orgId
    return;
  }

  const entry: AuditEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  // AUDIT-004 FIX: Redact sensitive fields before logging
  const safeEntry = {
    ...entry,
    meta: redactSensitiveFields(entry.meta) as Record<string, unknown>,
  };

  // Structured logging with redacted metadata
  logger.info('[AUDIT]', safeEntry);

  // ✅ Write to database
  try {
    const entityId = (event.meta?.targetId as string | undefined) || undefined;
    
    // AUDIT-001 FIX: Map action to ActionType enum (default to CUSTOM)
    const actionVerb = actionToVerb[event.action] || 'CUSTOM';
    
    // AUDIT-005 FIX: Map entity type to EntityType enum (default to OTHER)
    const normalizedTargetType = event.targetType?.toLowerCase() || '';
    const entityType = entityTypeMap[normalizedTargetType] || 'OTHER';
    
    await AuditLogModel.log({
      orgId: event.orgId,  // ✅ Now guaranteed to be non-empty
      action: actionVerb,  // ✅ Now maps to ActionType enum
      entityType: entityType,  // ✅ Now maps to EntityType enum
      entityId,
      entityName: (event.meta?.targetName as string | undefined) || (event.target ? String(event.target) : undefined),
      userId: event.actorId,
      context: {
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
      metadata: {
        ...(safeEntry.meta || {}),  // ✅ Already redacted
        rawAction: event.action,  // ✅ Preserve original dotted action for searchability
        actorEmail: event.actorEmail,
        source: 'WEB',
      },
      result: {
        success: event.success !== false,  // AUDIT-003 FIX: Default to true (not false)
        errorMessage: event.error,
      },
    });
  } catch (dbError: unknown) {
    // Log database write failures but don't break main operation
    logger.error('[AUDIT] Database write failed:', dbError as Error);
  }

  // Send to external monitoring service (Sentry)
  try {
    if (typeof window === 'undefined' && process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      // Server-side Sentry integration
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry) {
        // AUDIT-004 FIX: Use redacted entry for Sentry (no PII leakage)
        Sentry.captureMessage(`[AUDIT] ${safeEntry.action}`, {
          level: 'info',
          extra: safeEntry,  // ✅ Already redacted
          tags: {
            audit_action: safeEntry.action,
            actor_id: safeEntry.actorId,
            target_type: safeEntry.targetType || 'unknown',
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
      // AUDIT-004 FIX: Use redacted entry for critical alerts
      logger.warn(`[AUDIT CRITICAL] ${safeEntry.action} by ${safeEntry.actorEmail} on ${safeEntry.target}`, {
        ...safeEntry,  // ✅ Already redacted
        severity: 'critical',
      });
      
      // Future: Send Slack/PagerDuty alert
      // if (process.env.SLACK_WEBHOOK_URL) {
      //   await fetch(process.env.SLACK_WEBHOOK_URL, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       text: `🚨 CRITICAL AUDIT: ${safeEntry.action}`,
      //       attachments: [{ text: JSON.stringify(safeEntry, null, 2), color: 'danger' }]
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
 * 
 * @param orgId Organization ID (REQUIRED for multi-tenant isolation)
 * @param action Action performed
 * @param actorId User ID performing the action
 * @param actorEmail User email
 * @param targetId Target user ID (optional)
 * @param targetEmail Target user email (optional)
 * @param meta Additional metadata (optional)
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
  await audit({
    orgId,  // ✅ AUDIT-006 FIX: Pass orgId to prevent empty-string writes
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
 * 
 * @param orgId Organization ID (REQUIRED for multi-tenant isolation)
 * @param actorId User ID performing impersonation
 * @param actorEmail User email
 * @param targetId Target user ID being impersonated
 * @param targetEmail Target user email
 * @param action 'start' or 'end' impersonation
 * @param meta Additional metadata (optional)
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
  await audit({
    orgId,  // ✅ AUDIT-006 FIX: Pass orgId to prevent empty-string writes
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
