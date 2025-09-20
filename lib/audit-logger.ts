/**
 * Comprehensive Audit Logging System
 * Tracks all user actions for compliance and security
 */

import type { AuditLog, FieldChange } from './types/ui';
import type { EnhancedUser } from './types/rbac';

export interface AuditEventData {
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: FieldChange[];
  metadata?: Record<string, any>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  compliance?: {
    regulation: string;
    requirement: string;
    retention: number; // days
  };
}

export interface AuditConfig {
  enabled: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  maxRetries: number;
  endpoint: string;
  enableLocalStorage: boolean;
  complianceMode: boolean;
}

class AuditLogger {
  private config: AuditConfig;
  private queue: AuditLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private retryCount: number = 0;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = {
      enabled: true,
      batchSize: 10,
      flushInterval: 5000, // 5 seconds
      maxRetries: 3,
      endpoint: '/api/audit/log',
      enableLocalStorage: true,
      complianceMode: process.env.NODE_ENV === 'production',
      ...config
    };

    this.startFlushTimer();
    this.setupUnloadHandler();
  }

  /**
   * Log a user action for audit purposes
   */
  async logAction(
    user: EnhancedUser | null,
    data: AuditEventData,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      requestId?: string;
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const auditLog: AuditLog = {
      id: this.generateId(),
      entityType: data.entityType || 'unknown',
      entityId: data.entityId || '',
      action: data.action,
      userId: user?.id || 'anonymous',
      userName: user ? `${user.firstName} ${user.lastName}` : 'Anonymous',
      timestamp: new Date().toISOString(),
      ipAddress: context?.ipAddress || this.getClientIpAddress(),
      userAgent: context?.userAgent || navigator.userAgent,
      changes: data.changes || [],
      metadata: {
        ...data.metadata,
        riskLevel: data.riskLevel || 'low',
        compliance: data.compliance,
        sessionId: context?.sessionId,
        requestId: context?.requestId,
        organizationId: user?.organizationId,
        userRole: user?.roles?.[0]?.name,
        permissions: user?.permissions,
        timestamp_client: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        referrer: typeof window !== 'undefined' ? document.referrer : undefined
      }
    };

    this.queue.push(auditLog);

    // Store in local storage for compliance mode
    if (this.config.enableLocalStorage && this.config.complianceMode) {
      this.storeLocalBackup(auditLog);
    }

    // Flush immediately for critical actions
    if (data.riskLevel === 'critical') {
      await this.flush(true);
    } else if (this.queue.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'session_expired' | 'password_change' | 'mfa_enabled' | 'mfa_disabled',
    user: EnhancedUser | null,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction(user, {
      action: `auth.${action}`,
      entityType: 'user',
      entityId: user?.id,
      riskLevel: action === 'login' ? 'medium' : 'high',
      compliance: {
        regulation: 'SOX',
        requirement: 'Authentication Tracking',
        retention: 2555 // 7 years
      },
      metadata: {
        ...metadata,
        authMethod: 'password', // TODO: detect actual auth method
        deviceFingerprint: this.generateDeviceFingerprint(),
        geoLocation: await this.getGeoLocation()
      }
    });
  }

  /**
   * Log data access and modifications
   */
  async logDataAccess(
    action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'import',
    entityType: string,
    entityId: string,
    user: EnhancedUser | null,
    changes?: FieldChange[],
    metadata?: Record<string, any>
  ): Promise<void> {
    const riskLevel = action === 'delete' || action === 'export' ? 'high' : 
                     action === 'update' || action === 'import' ? 'medium' : 'low';

    await this.logAction(user, {
      action: `data.${action}`,
      entityType,
      entityId,
      changes,
      riskLevel,
      compliance: {
        regulation: 'GDPR',
        requirement: 'Data Processing Tracking',
        retention: 1095 // 3 years
      },
      metadata: {
        ...metadata,
        dataClassification: this.classifyDataSensitivity(entityType),
        recordCount: changes?.length || 1
      }
    });
  }

  /**
   * Log system and admin actions
   */
  async logSystemAction(
    action: string,
    user: EnhancedUser | null,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction(user, {
      action: `system.${action}`,
      entityType: 'system',
      riskLevel: 'critical',
      compliance: {
        regulation: 'SOX',
        requirement: 'System Administration Tracking',
        retention: 2555 // 7 years
      },
      metadata: {
        ...metadata,
        systemVersion: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }

  /**
   * Log financial transactions and approvals
   */
  async logFinancialAction(
    action: 'create_invoice' | 'approve_payment' | 'reject_payment' | 'budget_change' | 'expense_claim',
    entityType: string,
    entityId: string,
    user: EnhancedUser | null,
    amount?: number,
    currency?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction(user, {
      action: `finance.${action}`,
      entityType,
      entityId,
      riskLevel: 'high',
      compliance: {
        regulation: 'SOX',
        requirement: 'Financial Transaction Tracking',
        retention: 2555 // 7 years
      },
      metadata: {
        ...metadata,
        amount,
        currency,
        approvalRequired: amount && amount > 1000,
        taxImplications: amount && amount > 500
      }
    });
  }

  /**
   * Flush pending audit logs to server
   */
  private async flush(force: boolean = false): Promise<void> {
    if (this.queue.length === 0) return;
    if (!force && this.queue.length < this.config.batchSize) return;

    const logs = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs,
          batch_id: this.generateId(),
          timestamp: new Date().toISOString(),
          client_info: {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Audit log failed: ${response.status}`);
      }

      this.retryCount = 0;
      
      // Clear local storage backup on successful flush
      if (this.config.enableLocalStorage) {
        this.clearLocalBackup(logs);
      }

    } catch (error) {
      console.error('Failed to send audit logs:', error);
      
      // Re-queue logs for retry
      this.queue.unshift(...logs);
      this.retryCount++;

      if (this.retryCount < this.config.maxRetries) {
        // Exponential backoff
        setTimeout(() => this.flush(true), Math.pow(2, this.retryCount) * 1000);
      } else {
        console.error('Max retries reached for audit logs. Storing locally.');
        this.storeLocalBackup(...logs);
      }
    }
  }

  /**
   * Store audit logs in local storage as backup
   */
  private storeLocalBackup(...logs: AuditLog[]): void {
    if (typeof window === 'undefined') return;

    try {
      const key = 'audit_logs_backup';
      const existing = localStorage.getItem(key);
      const backupLogs = existing ? JSON.parse(existing) : [];
      
      backupLogs.push(...logs);
      
      // Keep only last 1000 logs to prevent storage overflow
      if (backupLogs.length > 1000) {
        backupLogs.splice(0, backupLogs.length - 1000);
      }
      
      localStorage.setItem(key, JSON.stringify(backupLogs));
    } catch (error) {
      console.warn('Failed to store audit logs locally:', error);
    }
  }

  /**
   * Clear successfully sent logs from local backup
   */
  private clearLocalBackup(sentLogs: AuditLog[]): void {
    if (typeof window === 'undefined') return;

    try {
      const key = 'audit_logs_backup';
      const existing = localStorage.getItem(key);
      if (!existing) return;

      const backupLogs = JSON.parse(existing);
      const sentIds = new Set(sentLogs.map(log => log.id));
      const remaining = backupLogs.filter((log: AuditLog) => !sentIds.has(log.id));
      
      localStorage.setItem(key, JSON.stringify(remaining));
    } catch (error) {
      console.warn('Failed to clear local audit backup:', error);
    }
  }

  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Setup handler for page unload to flush remaining logs
   */
  private setupUnloadHandler(): void {
    if (typeof window === 'undefined') return;

    const handleUnload = () => {
      if (this.queue.length > 0) {
        // Use sendBeacon for reliable delivery during page unload
        navigator.sendBeacon(
          this.config.endpoint,
          JSON.stringify({
            logs: this.queue,
            batch_id: this.generateId(),
            timestamp: new Date().toISOString(),
            unload: true
          })
        );
        
        // Also store in local storage as backup
        this.storeLocalBackup(...this.queue);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  /**
   * Generate unique ID for audit logs
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address (best effort)
   */
  private getClientIpAddress(): string {
    // This will be resolved server-side for accurate IP
    return 'client-side';
  }

  /**
   * Generate device fingerprint for security tracking
   */
  private generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server-side';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      canvas.toDataURL()
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  /**
   * Get user's geo location (with permission)
   */
  private async getGeoLocation(): Promise<{ latitude?: number; longitude?: number; country?: string }> {
    if (typeof window === 'undefined') return {};

    try {
      // Try to get precise location (requires user permission)
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });

      return {
        latitude: Math.round(position.coords.latitude * 1000) / 1000, // 3 decimal precision
        longitude: Math.round(position.coords.longitude * 1000) / 1000
      };
    } catch {
      // Fallback to IP-based location (less precise, more privacy-friendly)
      try {
        const response = await fetch('/api/geo/location');
        if (response.ok) {
          const data = await response.json();
          return { country: data.country };
        }
      } catch {
        // Silent fail for geo location
      }
    }

    return {};
  }

  /**
   * Classify data sensitivity for compliance
   */
  private classifyDataSensitivity(entityType: string): 'public' | 'internal' | 'confidential' | 'restricted' {
    const sensitiveEntities = ['user', 'payment', 'finance', 'personal_data'];
    const confidentialEntities = ['work_order', 'property', 'contract'];
    const restrictedEntities = ['audit', 'system', 'security'];

    if (restrictedEntities.includes(entityType)) return 'restricted';
    if (sensitiveEntities.includes(entityType)) return 'confidential';
    if (confidentialEntities.includes(entityType)) return 'internal';
    return 'public';
  }

  /**
   * Destroy the audit logger and clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush(true);
  }
}

// Singleton instance
let auditLogger: AuditLogger | null = null;

export function getAuditLogger(config?: Partial<AuditConfig>): AuditLogger {
  if (!auditLogger) {
    auditLogger = new AuditLogger(config);
  }
  return auditLogger;
}

// Convenience functions for common audit actions
export const audit = {
  auth: (action: Parameters<AuditLogger['logAuth']>[0], user: EnhancedUser | null, metadata?: Record<string, any>) =>
    getAuditLogger().logAuth(action, user, metadata),

  data: (action: Parameters<AuditLogger['logDataAccess']>[0], entityType: string, entityId: string, user: EnhancedUser | null, changes?: FieldChange[], metadata?: Record<string, any>) =>
    getAuditLogger().logDataAccess(action, entityType, entityId, user, changes, metadata),

  system: (action: string, user: EnhancedUser | null, metadata?: Record<string, any>) =>
    getAuditLogger().logSystemAction(action, user, metadata),

  finance: (action: Parameters<AuditLogger['logFinancialAction']>[0], entityType: string, entityId: string, user: EnhancedUser | null, amount?: number, currency?: string, metadata?: Record<string, any>) =>
    getAuditLogger().logFinancialAction(action, entityType, entityId, user, amount, currency, metadata),

  custom: (user: EnhancedUser | null, data: AuditEventData, context?: Parameters<AuditLogger['logAction']>[2]) =>
    getAuditLogger().logAction(user, data, context)
};

export default AuditLogger;