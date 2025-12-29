/**
 * @fileoverview Auth Audit Logger - Comprehensive authentication event logging
 * @module lib/auth/auditLogger
 * 
 * Provides centralized audit logging for all authentication and authorization events.
 * Writes to MongoDB auth_logs collection for compliance and security monitoring.
 * 
 * @features
 * - Login attempt logging (success/failure)
 * - Password change tracking
 * - Permission/role changes
 * - MFA enrollment and verification
 * - Session management events
 * - IP and device tracking
 * - Anomaly detection flags
 * 
 * @compliance
 * - ISO 27001 audit requirements
 * - PDPL (Saudi Personal Data Protection Law)
 * - SOC 2 Type II logging standards
 * 
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Authentication action types
 */
export enum AuthAction {
  // Authentication Events
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  LOGOUT = "LOGOUT",
  SESSION_CREATED = "SESSION_CREATED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  SESSION_INVALIDATED = "SESSION_INVALIDATED",
  
  // Password Events
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED",
  PASSWORD_POLICY_VIOLATION = "PASSWORD_POLICY_VIOLATION",
  
  // MFA Events
  MFA_ENABLED = "MFA_ENABLED",
  MFA_DISABLED = "MFA_DISABLED",
  MFA_VERIFIED = "MFA_VERIFIED",
  MFA_FAILED = "MFA_FAILED",
  MFA_RECOVERY_USED = "MFA_RECOVERY_USED",
  
  // Permission Events
  ROLE_ASSIGNED = "ROLE_ASSIGNED",
  ROLE_REVOKED = "ROLE_REVOKED",
  PERMISSION_GRANTED = "PERMISSION_GRANTED",
  PERMISSION_REVOKED = "PERMISSION_REVOKED",
  ACCESS_LEVEL_CHANGED = "ACCESS_LEVEL_CHANGED",
  
  // Account Events
  ACCOUNT_CREATED = "ACCOUNT_CREATED",
  ACCOUNT_ACTIVATED = "ACCOUNT_ACTIVATED",
  ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED",
  ACCOUNT_DELETED = "ACCOUNT_DELETED",
  
  // Email/Phone Verification
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  EMAIL_VERIFICATION_SENT = "EMAIL_VERIFICATION_SENT",
  PHONE_VERIFIED = "PHONE_VERIFIED",
  PHONE_VERIFICATION_SENT = "PHONE_VERIFICATION_SENT",
  
  // Security Events
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  BRUTE_FORCE_DETECTED = "BRUTE_FORCE_DETECTED",
  IP_BLOCKED = "IP_BLOCKED",
  DEVICE_REGISTERED = "DEVICE_REGISTERED",
  DEVICE_REMOVED = "DEVICE_REMOVED",
  
  // API Key Events
  API_KEY_CREATED = "API_KEY_CREATED",
  API_KEY_REVOKED = "API_KEY_REVOKED",
  API_KEY_USED = "API_KEY_USED",
}

/**
 * Risk level for security analysis
 */
export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Auth log entry structure
 */
export interface AuthLogEntry {
  // Identity
  orgId: string;
  userId?: string;
  email?: string;
  username?: string;
  
  // Event
  action: AuthAction;
  success: boolean;
  timestamp: Date;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  sessionId?: string;
  
  // Details
  metadata?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  
  // Security
  riskLevel?: RiskLevel;
  anomalyFlags?: string[];
  
  // Compliance
  gdprRelevant?: boolean;
  retentionDays?: number;
}

/**
 * Query options for auth logs
 */
export interface AuthLogQuery {
  orgId: string;
  userId?: string;
  action?: AuthAction | AuthAction[];
  fromDate?: Date;
  toDate?: Date;
  ipAddress?: string;
  riskLevel?: RiskLevel;
  success?: boolean;
  limit?: number;
  skip?: number;
}

/**
 * Auth log statistics
 */
export interface AuthLogStats {
  totalEvents: number;
  loginSuccessCount: number;
  loginFailureCount: number;
  mfaUsageRate: number;
  uniqueIPs: number;
  suspiciousActivityCount: number;
  periodStart: Date;
  periodEnd: Date;
}

// ============================================================================
// Auth Audit Logger Class
// ============================================================================

const AUTH_LOGS_COLLECTION = "auth_logs";

/**
 * Log an authentication event
 */
export async function logAuthEvent(entry: AuthLogEntry): Promise<string | null> {
  try {
    const db = await getDatabase();
    const collection = db.collection(AUTH_LOGS_COLLECTION);
    
    // Enrich entry with defaults
    const enrichedEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
      riskLevel: entry.riskLevel || calculateRiskLevel(entry),
      retentionDays: entry.retentionDays || 2555, // 7 years default
      createdAt: new Date(),
    };
    
    // Detect anomalies
    const anomalies = await detectAnomalies(enrichedEntry);
    if (anomalies.length > 0) {
      enrichedEntry.anomalyFlags = anomalies;
      // Only set to HIGH if current level is undefined or lower than HIGH (preserve CRITICAL)
      if (!enrichedEntry.riskLevel || enrichedEntry.riskLevel === RiskLevel.LOW) {
        enrichedEntry.riskLevel = RiskLevel.HIGH;
      }
    }
    
    const result = await collection.insertOne(enrichedEntry);
    
    // Log high-risk events
    if (enrichedEntry.riskLevel === RiskLevel.HIGH || enrichedEntry.riskLevel === RiskLevel.CRITICAL) {
      logger.warn("High-risk auth event logged", {
        action: entry.action,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        riskLevel: enrichedEntry.riskLevel,
        anomalies,
      });
    }
    
    return result.insertedId.toString();
  } catch (error) {
    logger.error("Failed to log auth event", {
      error: error instanceof Error ? error.message : "Unknown error",
      action: entry.action,
      userId: entry.userId,
    });
    return null;
  }
}

/**
 * Query auth logs with filters
 */
export async function queryAuthLogs(query: AuthLogQuery): Promise<AuthLogEntry[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection(AUTH_LOGS_COLLECTION);
    
    // Build query filter
    const filter: Record<string, unknown> = {
      orgId: query.orgId,
    };
    
    if (query.userId) filter.userId = query.userId;
    if (query.ipAddress) filter.ipAddress = query.ipAddress;
    if (query.riskLevel) filter.riskLevel = query.riskLevel;
    if (typeof query.success === "boolean") filter.success = query.success;
    
    if (query.action) {
      filter.action = Array.isArray(query.action)
        ? { $in: query.action }
        : query.action;
    }
    
    if (query.fromDate || query.toDate) {
      filter.timestamp = {};
      if (query.fromDate) (filter.timestamp as Record<string, Date>).$gte = query.fromDate;
      if (query.toDate) (filter.timestamp as Record<string, Date>).$lte = query.toDate;
    }
    
    const results = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(query.skip || 0)
      .limit(query.limit || 100)
      .toArray();
    
    return results as unknown as AuthLogEntry[];
  } catch (error) {
    logger.error("Failed to query auth logs", {
      error: error instanceof Error ? error.message : "Unknown error",
      query,
    });
    return [];
  }
}

/**
 * Get auth log statistics for a period
 */
export async function getAuthLogStats(
  orgId: string,
  fromDate: Date,
  toDate: Date
): Promise<AuthLogStats> {
  try {
    const db = await getDatabase();
    const collection = db.collection(AUTH_LOGS_COLLECTION);
    
    const pipeline = [
      {
        $match: {
          orgId,
          timestamp: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $facet: {
          total: [{ $count: "count" }],
          loginSuccess: [
            { $match: { action: AuthAction.LOGIN_SUCCESS } },
            { $count: "count" },
          ],
          loginFailure: [
            { $match: { action: AuthAction.LOGIN_FAILURE } },
            { $count: "count" },
          ],
          mfaVerified: [
            { $match: { action: AuthAction.MFA_VERIFIED } },
            { $count: "count" },
          ],
          suspicious: [
            { $match: { action: AuthAction.SUSPICIOUS_ACTIVITY } },
            { $count: "count" },
          ],
          uniqueIPs: [
            { $group: { _id: "$ipAddress" } },
            { $count: "count" },
          ],
        },
      },
    ];
    
    const [result] = await collection.aggregate(pipeline).toArray();
    
    const totalLogins = (result.loginSuccess[0]?.count || 0) + (result.loginFailure[0]?.count || 0);
    const mfaUsed = result.mfaVerified[0]?.count || 0;
    
    return {
      totalEvents: result.total[0]?.count || 0,
      loginSuccessCount: result.loginSuccess[0]?.count || 0,
      loginFailureCount: result.loginFailure[0]?.count || 0,
      mfaUsageRate: totalLogins > 0 ? (mfaUsed / totalLogins) * 100 : 0,
      uniqueIPs: result.uniqueIPs[0]?.count || 0,
      suspiciousActivityCount: result.suspicious[0]?.count || 0,
      periodStart: fromDate,
      periodEnd: toDate,
    };
  } catch (error) {
    logger.error("Failed to get auth log stats", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
    });
    return {
      totalEvents: 0,
      loginSuccessCount: 0,
      loginFailureCount: 0,
      mfaUsageRate: 0,
      uniqueIPs: 0,
      suspiciousActivityCount: 0,
      periodStart: fromDate,
      periodEnd: toDate,
    };
  }
}

/**
 * Get recent failed login attempts for a user
 */
export async function getRecentFailedLogins(
  orgId: string,
  userId: string,
  windowMinutes: number = 30
): Promise<number> {
  try {
    const db = await getDatabase();
    const collection = db.collection(AUTH_LOGS_COLLECTION);
    
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const count = await collection.countDocuments({
      orgId,
      userId,
      action: AuthAction.LOGIN_FAILURE,
      timestamp: { $gte: since },
    });
    
    return count;
  } catch (error) {
    logger.error("Failed to get recent failed logins", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
    return 0;
  }
}

/**
 * Get user's recent login history
 */
export async function getUserLoginHistory(
  orgId: string,
  userId: string,
  limit: number = 10
): Promise<AuthLogEntry[]> {
  return queryAuthLogs({
    orgId,
    userId,
    action: [AuthAction.LOGIN_SUCCESS, AuthAction.LOGIN_FAILURE],
    limit,
  });
}

/**
 * Check if IP has suspicious activity
 */
export async function isIPSuspicious(
  orgId: string,
  ipAddress: string,
  windowMinutes: number = 60
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const collection = db.collection(AUTH_LOGS_COLLECTION);
    
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    // Check for multiple failed logins from this IP
    const failedCount = await collection.countDocuments({
      orgId,
      ipAddress,
      action: AuthAction.LOGIN_FAILURE,
      timestamp: { $gte: since },
    });
    
    // More than 10 failed attempts in the window is suspicious
    return failedCount > 10;
  } catch (error) {
    logger.error("Failed to check IP suspicion", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      ipAddress,
    });
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate risk level based on event type
 */
function calculateRiskLevel(entry: AuthLogEntry): RiskLevel {
  // High-risk actions
  const highRiskActions = [
    AuthAction.MFA_DISABLED,
    AuthAction.ROLE_ASSIGNED,
    AuthAction.ROLE_REVOKED,
    AuthAction.PERMISSION_GRANTED,
    AuthAction.PERMISSION_REVOKED,
    AuthAction.ACCOUNT_DELETED,
    AuthAction.API_KEY_CREATED,
  ];
  
  // Critical actions
  const criticalActions = [
    AuthAction.BRUTE_FORCE_DETECTED,
    AuthAction.SUSPICIOUS_ACTIVITY,
    AuthAction.IP_BLOCKED,
  ];
  
  // Medium-risk actions
  const mediumRiskActions = [
    AuthAction.PASSWORD_CHANGED,
    AuthAction.PASSWORD_RESET_COMPLETED,
    AuthAction.ACCOUNT_LOCKED,
    AuthAction.ACCOUNT_UNLOCKED,
    AuthAction.LOGIN_FAILURE,
  ];
  
  if (criticalActions.includes(entry.action)) {
    return RiskLevel.CRITICAL;
  }
  
  if (highRiskActions.includes(entry.action)) {
    return RiskLevel.HIGH;
  }
  
  if (mediumRiskActions.includes(entry.action)) {
    return RiskLevel.MEDIUM;
  }
  
  return RiskLevel.LOW;
}

/**
 * Detect anomalies in the auth event
 */
async function detectAnomalies(entry: AuthLogEntry): Promise<string[]> {
  const anomalies: string[] = [];
  
  try {
    // Skip anomaly detection for some actions
    if ([AuthAction.SESSION_EXPIRED, AuthAction.LOGOUT].includes(entry.action)) {
      return anomalies;
    }
    
    const db = await getDatabase();
    const collection = db.collection(AUTH_LOGS_COLLECTION);
    
    if (entry.userId && entry.ipAddress) {
      // Check for new IP for this user
      const userIPs = await collection.distinct("ipAddress", {
        orgId: entry.orgId,
        userId: entry.userId,
        action: AuthAction.LOGIN_SUCCESS,
      });
      
      if (userIPs.length > 0 && !userIPs.includes(entry.ipAddress)) {
        anomalies.push("NEW_IP_ADDRESS");
      }
    }
    
    if (entry.ipAddress) {
      // Check for rapid login attempts from this IP
      const recentFromIP = await collection.countDocuments({
        orgId: entry.orgId,
        ipAddress: entry.ipAddress,
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 mins
      });
      
      if (recentFromIP > 20) {
        anomalies.push("RAPID_REQUESTS_FROM_IP");
      }
    }
    
    // Check for unusual time (outside business hours - 6 AM to 10 PM Riyadh)
    const hour = entry.timestamp.getUTCHours() + 3; // UTC+3 for Riyadh
    const adjustedHour = hour >= 24 ? hour - 24 : hour;
    if (adjustedHour < 6 || adjustedHour > 22) {
      anomalies.push("UNUSUAL_HOUR");
    }
    
  } catch (error) {
    logger.error("Failed to detect anomalies", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
  
  return anomalies;
}

// ============================================================================
// Convenience Functions for Common Events
// ============================================================================

/**
 * Log a successful login
 */
export async function logLoginSuccess(
  orgId: string,
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string
): Promise<string | null> {
  return logAuthEvent({
    orgId,
    userId,
    email,
    action: AuthAction.LOGIN_SUCCESS,
    success: true,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    sessionId,
  });
}

/**
 * Log a failed login attempt
 */
export async function logLoginFailure(
  orgId: string,
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  return logAuthEvent({
    orgId,
    email,
    action: AuthAction.LOGIN_FAILURE,
    success: false,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    errorMessage: reason,
  });
}

/**
 * Log a password change
 */
export async function logPasswordChange(
  orgId: string,
  userId: string,
  email: string,
  changedBy: string,
  ipAddress?: string
): Promise<string | null> {
  return logAuthEvent({
    orgId,
    userId,
    email,
    action: AuthAction.PASSWORD_CHANGED,
    success: true,
    timestamp: new Date(),
    ipAddress,
    metadata: { changedBy },
  });
}

/**
 * Log MFA enablement
 */
export async function logMFAEnabled(
  orgId: string,
  userId: string,
  email: string,
  mfaType: string,
  ipAddress?: string
): Promise<string | null> {
  return logAuthEvent({
    orgId,
    userId,
    email,
    action: AuthAction.MFA_ENABLED,
    success: true,
    timestamp: new Date(),
    ipAddress,
    metadata: { mfaType },
  });
}

/**
 * Log role assignment
 */
export async function logRoleAssignment(
  orgId: string,
  userId: string,
  email: string,
  roleId: string,
  roleName: string,
  assignedBy: string,
  ipAddress?: string
): Promise<string | null> {
  return logAuthEvent({
    orgId,
    userId,
    email,
    action: AuthAction.ROLE_ASSIGNED,
    success: true,
    timestamp: new Date(),
    ipAddress,
    metadata: { roleId, roleName, assignedBy },
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  orgId: string,
  description: string,
  userId?: string,
  email?: string,
  ipAddress?: string,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  return logAuthEvent({
    orgId,
    userId,
    email,
    action: AuthAction.SUSPICIOUS_ACTIVITY,
    success: false,
    timestamp: new Date(),
    ipAddress,
    riskLevel: RiskLevel.CRITICAL, // Suspicious activity should be CRITICAL severity
    errorMessage: description,
    metadata,
  });
}
