/**
 * @fileoverview AI Security Monitor - Intelligent threat detection
 * @module services/security/ai-security-monitor
 * 
 * Uses AI/ML patterns to detect security anomalies including:
 * - Unusual login patterns (time, location, device)
 * - Brute force attack detection
 * - Account compromise indicators
 * - Privilege escalation attempts
 * 
 * @features
 * - Real-time anomaly detection
 * - Risk scoring for authentication events
 * - Automated threat response
 * - Security alert generation
 * 
 * @compliance
 * - NIST Cybersecurity Framework
 * - ISO 27001 incident monitoring
 * 
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";
import { logSuspiciousActivity, RiskLevel } from "@/lib/auth/auditLogger";

// ============================================================================
// Types & Configuration
// ============================================================================

/**
 * Security alert severity levels
 */
export enum AlertSeverity {
  INFO = "INFO",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Security alert types
 */
export enum AlertType {
  BRUTE_FORCE = "BRUTE_FORCE",
  CREDENTIAL_STUFFING = "CREDENTIAL_STUFFING",
  IMPOSSIBLE_TRAVEL = "IMPOSSIBLE_TRAVEL",
  NEW_DEVICE = "NEW_DEVICE",
  UNUSUAL_TIME = "UNUSUAL_TIME",
  PRIVILEGE_ESCALATION = "PRIVILEGE_ESCALATION",
  MULTIPLE_FAILURES = "MULTIPLE_FAILURES",
  SUSPICIOUS_IP = "SUSPICIOUS_IP",
  ACCOUNT_TAKEOVER = "ACCOUNT_TAKEOVER",
  MFA_BYPASS_ATTEMPT = "MFA_BYPASS_ATTEMPT",
}

/**
 * Security alert structure
 */
export interface SecurityAlert {
  orgId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

/**
 * Threat indicator
 */
export interface ThreatIndicator {
  type: AlertType;
  score: number; // 0-100
  evidence: string[];
}

/**
 * Analysis result
 */
export interface SecurityAnalysisResult {
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  threats: ThreatIndicator[];
  recommendations: string[];
  shouldBlock: boolean;
  shouldNotify: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const SECURITY_CONFIG = {
  // Brute force thresholds
  bruteForceThreshold: 5, // failures per window
  bruteForceWindowMinutes: 15,
  
  // Credential stuffing
  credentialStuffingIPs: 3, // unique IPs trying same account
  credentialStuffingWindowHours: 1,
  
  // Time-based
  businessHoursStart: 6, // 6 AM
  businessHoursEnd: 22, // 10 PM
  
  // Risk thresholds
  blockThreshold: 80, // Auto-block if risk > 80
  notifyThreshold: 50, // Notify admin if risk > 50
};

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Analyze a login attempt for security risks
 */
export async function analyzeLoginAttempt(params: {
  orgId: string;
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp?: Date;
}): Promise<SecurityAnalysisResult> {
  const { orgId, userId, email, ipAddress, userAgent, success } = params;
  const timestamp = params.timestamp || new Date();
  
  const threats: ThreatIndicator[] = [];
  const recommendations: string[] = [];
  
  try {
    const db = await getDatabase();
    
    // 1. Check for brute force patterns
    const bruteForce = await detectBruteForce(db, orgId, email, ipAddress);
    if (bruteForce.detected) {
      threats.push({
        type: AlertType.BRUTE_FORCE,
        score: bruteForce.score,
        evidence: bruteForce.evidence,
      });
      recommendations.push("Consider temporarily blocking this IP");
    }
    
    // 2. Check for credential stuffing (many IPs, same account)
    const credStuffing = await detectCredentialStuffing(db, orgId, email);
    if (credStuffing.detected) {
      threats.push({
        type: AlertType.CREDENTIAL_STUFFING,
        score: credStuffing.score,
        evidence: credStuffing.evidence,
      });
      recommendations.push("Enforce password change for this account");
    }
    
    // 3. Check for unusual login time
    const unusualTime = checkUnusualTime(timestamp);
    if (unusualTime.detected) {
      threats.push({
        type: AlertType.UNUSUAL_TIME,
        score: unusualTime.score,
        evidence: unusualTime.evidence,
      });
    }
    
    // 4. Check for new device/location if user exists
    if (userId) {
      const newDevice = await detectNewDevice(db, orgId, userId, userAgent);
      if (newDevice.detected) {
        threats.push({
          type: AlertType.NEW_DEVICE,
          score: newDevice.score,
          evidence: newDevice.evidence,
        });
        recommendations.push("Verify device with user");
      }
      
      // 5. Check for impossible travel
      const impossibleTravel = await detectImpossibleTravel(db, orgId, userId, ipAddress);
      if (impossibleTravel.detected) {
        threats.push({
          type: AlertType.IMPOSSIBLE_TRAVEL,
          score: impossibleTravel.score,
          evidence: impossibleTravel.evidence,
        });
        recommendations.push("Account may be compromised - force re-authentication");
      }
    }
    
    // 6. Check IP reputation
    const suspiciousIP = await checkIPReputation(db, orgId, ipAddress);
    if (suspiciousIP.detected) {
      threats.push({
        type: AlertType.SUSPICIOUS_IP,
        score: suspiciousIP.score,
        evidence: suspiciousIP.evidence,
      });
      recommendations.push("Block or challenge requests from this IP");
    }
    
    // Calculate overall risk score
    const riskScore = calculateRiskScore(threats, success);
    const riskLevel = scoreToRiskLevel(riskScore);
    
    // Determine actions
    const shouldBlock = riskScore >= SECURITY_CONFIG.blockThreshold;
    const shouldNotify = riskScore >= SECURITY_CONFIG.notifyThreshold;
    
    // Create alert if high risk
    if (shouldNotify) {
      await createSecurityAlert({
        orgId,
        type: threats[0]?.type || AlertType.SUSPICIOUS_IP,
        severity: riskLevel === RiskLevel.CRITICAL ? AlertSeverity.CRITICAL :
                  riskLevel === RiskLevel.HIGH ? AlertSeverity.HIGH :
                  AlertSeverity.MEDIUM,
        title: `Security threat detected for ${email}`,
        description: threats.map(t => t.evidence.join(", ")).join("; "),
        userId,
        email,
        ipAddress,
        metadata: { threats, recommendations, riskScore },
      });
    }
    
    return {
      riskScore,
      riskLevel,
      threats,
      recommendations,
      shouldBlock,
      shouldNotify,
    };
  } catch (error) {
    logger.error("Security analysis failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId, // Use userId instead of email for logs (PII protection)
    });
    
    // FAIL-CLOSED: On security analysis error, block to prevent potential threats
    // This is security best practice - assume the worst if we can't verify safety
    return {
      riskScore: 100,
      riskLevel: RiskLevel.CRITICAL,
      threats: [{
        type: AlertType.SUSPICIOUS_IP,
        score: 100,
        evidence: ["Security analysis failed - treating as potential threat"],
      }],
      recommendations: ["Retry request - security analysis temporarily unavailable"],
      shouldBlock: true,
      shouldNotify: true,
    };
  }
}

// ============================================================================
// Detection Functions
// ============================================================================

interface DetectionResult {
  detected: boolean;
  score: number;
  evidence: string[];
}

/**
 * Detect brute force attacks
 */
async function detectBruteForce(
  db: Awaited<ReturnType<typeof getDatabase>>,
  orgId: string,
  email: string,
  ipAddress: string
): Promise<DetectionResult> {
  const since = new Date(Date.now() - SECURITY_CONFIG.bruteForceWindowMinutes * 60 * 1000);
  
  // Count failures from this IP
  const ipFailures = await db.collection("auth_logs").countDocuments({
    orgId,
    ipAddress,
    action: "LOGIN_FAILURE",
    timestamp: { $gte: since },
  });
  
  // Count failures for this email
  const emailFailures = await db.collection("auth_logs").countDocuments({
    orgId,
    email,
    action: "LOGIN_FAILURE",
    timestamp: { $gte: since },
  });
  
  const maxFailures = Math.max(ipFailures, emailFailures);
  
  if (maxFailures >= SECURITY_CONFIG.bruteForceThreshold) {
    return {
      detected: true,
      score: Math.min(100, 50 + (maxFailures - SECURITY_CONFIG.bruteForceThreshold) * 10),
      evidence: [
        `${ipFailures} failed attempts from IP in last ${SECURITY_CONFIG.bruteForceWindowMinutes} minutes`,
        `${emailFailures} failed attempts for account in last ${SECURITY_CONFIG.bruteForceWindowMinutes} minutes`,
      ],
    };
  }
  
  return { detected: false, score: 0, evidence: [] };
}

/**
 * Detect credential stuffing attacks
 */
async function detectCredentialStuffing(
  db: Awaited<ReturnType<typeof getDatabase>>,
  orgId: string,
  email: string
): Promise<DetectionResult> {
  const since = new Date(Date.now() - SECURITY_CONFIG.credentialStuffingWindowHours * 60 * 60 * 1000);
  
  // Count unique IPs trying this account
  const uniqueIPs = await db.collection("auth_logs").distinct("ipAddress", {
    orgId,
    email,
    action: "LOGIN_FAILURE",
    timestamp: { $gte: since },
  });
  
  if (uniqueIPs.length >= SECURITY_CONFIG.credentialStuffingIPs) {
    return {
      detected: true,
      score: Math.min(100, 40 + uniqueIPs.length * 15),
      evidence: [
        `${uniqueIPs.length} unique IPs attempted login in last hour`,
        `Possible credential stuffing attack`,
      ],
    };
  }
  
  return { detected: false, score: 0, evidence: [] };
}

/**
 * Check for unusual login time
 */
function checkUnusualTime(timestamp: Date): DetectionResult {
  // Convert to Riyadh time (UTC+3)
  const hour = timestamp.getUTCHours() + 3;
  const adjustedHour = hour >= 24 ? hour - 24 : hour;
  
  const isUnusual = adjustedHour < SECURITY_CONFIG.businessHoursStart || 
                    adjustedHour > SECURITY_CONFIG.businessHoursEnd;
  
  if (isUnusual) {
    return {
      detected: true,
      score: 20, // Low score, just a flag
      evidence: [`Login at unusual hour: ${adjustedHour}:00 Riyadh time`],
    };
  }
  
  return { detected: false, score: 0, evidence: [] };
}

/**
 * Detect new device login
 */
async function detectNewDevice(
  db: Awaited<ReturnType<typeof getDatabase>>,
  orgId: string,
  userId: string,
  userAgent: string
): Promise<DetectionResult> {
  // Get known user agents for this user
  const knownAgents = await db.collection("auth_logs").distinct("userAgent", {
    orgId,
    userId,
    action: "LOGIN_SUCCESS",
  });
  
  // Simple comparison (could be more sophisticated with device fingerprinting)
  const isNew = !knownAgents.some(known => 
    userAgent.includes(known.split("/")[0]) // Compare browser family
  );
  
  if (isNew && knownAgents.length > 0) {
    return {
      detected: true,
      score: 25, // Medium-low score
      evidence: [`New device detected: ${userAgent.substring(0, 50)}...`],
    };
  }
  
  return { detected: false, score: 0, evidence: [] };
}

/**
 * Detect impossible travel (login from far location in short time)
 */
async function detectImpossibleTravel(
  db: Awaited<ReturnType<typeof getDatabase>>,
  orgId: string,
  userId: string,
  ipAddress: string
): Promise<DetectionResult> {
  // Get last successful login
  const lastLogin = await db.collection("auth_logs").findOne(
    { orgId, userId, action: "LOGIN_SUCCESS" },
    { sort: { timestamp: -1 } }
  ) as { timestamp: Date; ipAddress?: string } | null;
  
  if (!lastLogin || !lastLogin.ipAddress) {
    return { detected: false, score: 0, evidence: [] };
  }
  
  // If same IP, no impossible travel
  if (lastLogin.ipAddress === ipAddress) {
    return { detected: false, score: 0, evidence: [] };
  }
  
  // Calculate time since last login
  const timeDeltaMs = Date.now() - new Date(lastLogin.timestamp).getTime();
  const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);
  
  // If less than 1 hour since last login from different IP, flag as suspicious
  // This is a simplified heuristic - production would use GeoIP to calculate actual distance
  if (timeDeltaHours < 1) {
    return {
      detected: true,
      score: 70, // High score for very short time window
      evidence: [
        `IP changed from ${lastLogin.ipAddress} to ${ipAddress} within ${Math.round(timeDeltaHours * 60)} minutes`,
        "Possible account sharing or credential theft",
      ],
    };
  }
  
  // If less than 6 hours, moderate suspicion (would need GeoIP for distance)
  if (timeDeltaHours < 6) {
    // Flag IP change within 6 hours as moderate risk
    // In production, integrate MaxMind GeoIP to calculate:
    // - Distance between IPs (Haversine formula)
    // - Required travel speed = distance / timeDeltaHours
    // - Flag if speed > 800 km/h (impossible by land travel)
    return {
      detected: true,
      score: 40, // Moderate score for shorter time window
      evidence: [
        `IP changed from ${lastLogin.ipAddress} to ${ipAddress} within ${Math.round(timeDeltaHours)} hours`,
        "Consider verifying user identity - GeoIP distance check recommended",
      ],
    };
  }
  
  // Normal IP change after reasonable time
  return { detected: false, score: 0, evidence: [] };
}

/**
 * Check IP reputation
 */
async function checkIPReputation(
  db: Awaited<ReturnType<typeof getDatabase>>,
  orgId: string,
  ipAddress: string
): Promise<DetectionResult> {
  // Check our blocklist - respect expiresAt for non-permanent blocks
  const now = new Date();
  const blocked = await db.collection("blocked_ips").findOne({
    $or: [
      { 
        orgId, 
        ipAddress,
        $or: [
          { expiresAt: null },
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: now } }
        ]
      },
      { 
        orgId: "*", 
        ipAddress,
        $or: [
          { expiresAt: null },
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: now } }
        ]
      }, // Global blocklist
    ],
  });
  
  if (blocked) {
    return {
      detected: true,
      score: 90,
      evidence: [`IP ${ipAddress} is on blocklist: ${blocked.reason}`],
    };
  }
  
  // Check recent suspicious activity from this IP
  const suspiciousCount = await db.collection("auth_logs").countDocuments({
    orgId,
    ipAddress,
    $or: [
      { action: "SUSPICIOUS_ACTIVITY" },
      { action: "BRUTE_FORCE_DETECTED" },
    ],
    timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
  });
  
  if (suspiciousCount > 0) {
    return {
      detected: true,
      score: Math.min(70, 30 + suspiciousCount * 10),
      evidence: [`${suspiciousCount} suspicious events from this IP in last 7 days`],
    };
  }
  
  return { detected: false, score: 0, evidence: [] };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate overall risk score from threats
 */
function calculateRiskScore(threats: ThreatIndicator[], success: boolean): number {
  if (threats.length === 0) {
    return success ? 0 : 10; // Failed login without other indicators
  }
  
  // Sum threat scores with diminishing returns
  let totalScore = 0;
  const sortedThreats = [...threats].sort((a, b) => b.score - a.score);
  
  for (let i = 0; i < sortedThreats.length; i++) {
    // Each subsequent threat adds less (70% of its value)
    totalScore += sortedThreats[i].score * Math.pow(0.7, i);
  }
  
  // Cap at 100
  return Math.min(100, Math.round(totalScore));
}

/**
 * Convert score to risk level
 */
function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return RiskLevel.CRITICAL;
  if (score >= 60) return RiskLevel.HIGH;
  if (score >= 30) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

// ============================================================================
// Alert Management
// ============================================================================

/**
 * Create a security alert
 */
export async function createSecurityAlert(
  alert: Omit<SecurityAlert, "createdAt" | "acknowledged" | "resolved">
): Promise<string | null> {
  try {
    const db = await getDatabase();
    
    const fullAlert: SecurityAlert = {
      ...alert,
      createdAt: new Date(),
      acknowledged: false,
      resolved: false,
    };
    
    const result = await db.collection("security_alerts").insertOne(fullAlert);
    
    // Also log to auth_logs
    await logSuspiciousActivity(
      alert.orgId,
      alert.description,
      alert.userId,
      alert.email,
      alert.ipAddress,
      alert.metadata
    );
    
    logger.warn("Security alert created", {
      alertId: result.insertedId.toString(),
      type: alert.type,
      severity: alert.severity,
      orgId: alert.orgId,
    });
    
    return result.insertedId.toString();
  } catch (error) {
    logger.error("Failed to create security alert", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Get security alerts for an organization
 */
export async function getSecurityAlerts(
  orgId: string,
  options: {
    severity?: AlertSeverity;
    acknowledged?: boolean;
    resolved?: boolean;
    limit?: number;
    skip?: number;
  } = {}
): Promise<SecurityAlert[]> {
  try {
    const db = await getDatabase();
    
    const filter: Record<string, unknown> = { orgId };
    
    if (options.severity) filter.severity = options.severity;
    if (typeof options.acknowledged === "boolean") filter.acknowledged = options.acknowledged;
    if (typeof options.resolved === "boolean") filter.resolved = options.resolved;
    
    const alerts = await db.collection("security_alerts")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .toArray();
    
    return alerts as unknown as SecurityAlert[];
  } catch (error) {
    logger.error("Failed to get security alerts", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
    });
    return [];
  }
}

/**
 * Acknowledge a security alert
 * @param orgId - Organization ID for tenant isolation
 * @param alertId - Alert ID to acknowledge
 * @param acknowledgedBy - User who acknowledged
 */
export async function acknowledgeAlert(
  orgId: string,
  alertId: string,
  acknowledgedBy: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection("security_alerts").updateOne(
      { _id: new ObjectId(alertId), orgId },
      {
        $set: {
          acknowledged: true,
          acknowledgedBy,
          acknowledgedAt: new Date(),
        },
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    logger.error("Failed to acknowledge alert", {
      error: error instanceof Error ? error.message : "Unknown error",
      alertId,
      orgId,
    });
    return false;
  }
}

/**
 * Resolve a security alert
 * @param orgId - Organization ID for tenant isolation
 * @param alertId - Alert ID to resolve
 * @param resolvedBy - User who resolved
 * @param resolutionNotes - Notes about the resolution
 */
export async function resolveAlert(
  orgId: string,
  alertId: string,
  resolvedBy: string,
  resolutionNotes: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection("security_alerts").updateOne(
      { _id: new ObjectId(alertId), orgId },
      {
        $set: {
          resolved: true,
          resolvedBy,
          resolvedAt: new Date(),
          resolutionNotes,
        },
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    logger.error("Failed to resolve alert", {
      error: error instanceof Error ? error.message : "Unknown error",
      alertId,
      orgId,
    });
    return false;
  }
}

// ============================================================================
// IP Blocking
// ============================================================================

/**
 * Block an IP address
 */
export async function blockIP(
  orgId: string,
  ipAddress: string,
  reason: string,
  durationHours?: number
): Promise<void> {
  try {
    const db = await getDatabase();
    
    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null; // Permanent if no duration
    
    await db.collection("blocked_ips").updateOne(
      { orgId, ipAddress },
      {
        $set: {
          reason,
          blockedAt: new Date(),
          expiresAt,
        },
      },
      { upsert: true }
    );
    
    logger.warn("IP blocked", { orgId, ipAddress, reason, expiresAt });
  } catch (error) {
    logger.error("Failed to block IP", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      ipAddress,
    });
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(
  orgId: string,
  ipAddress: string
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection("blocked_ips").deleteOne({ orgId, ipAddress });
    logger.info("IP unblocked", { orgId, ipAddress });
  } catch (error) {
    logger.error("Failed to unblock IP", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      ipAddress,
    });
  }
}

/**
 * Check if IP is blocked
 */
export async function isIPBlocked(
  orgId: string,
  ipAddress: string
): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const db = await getDatabase();
    
    const entry = await db.collection("blocked_ips").findOne({
      $and: [
        {
          $or: [
            { orgId, ipAddress },
            { orgId: "*", ipAddress },
          ],
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        },
      ],
    });
    
    if (entry) {
      return { blocked: true, reason: entry.reason };
    }
    
    return { blocked: false };
  } catch (error) {
    logger.error("Failed to check IP block status", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      ipAddress,
    });
    // Fail-closed: Block on DB errors to maintain security
    return { blocked: true, reason: "db-error" };
  }
}
