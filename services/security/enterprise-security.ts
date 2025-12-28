/**
 * Enterprise Security Service
 * 
 * Implements:
 * - FIDO2/WebAuthn MFA
 * - JIT Privileged Access Management (PAM)
 * - Session Recording
 * - Zero-Trust Session Management
 * - Comprehensive Audit Logging
 * 
 * @module services/security/enterprise-security
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";
import type {
  WebAuthnCredential,
  WebAuthnChallenge,
  PamAccessRequest,
  PamApprovalPolicy,
  ZeroTrustSession,
  TrustFactor,
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
  GhostModeSession,
  ElevatedAccessType,
} from "@/types/security";
import type { ObjectId } from "mongodb";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SECURITY_CONFIG = {
  /** WebAuthn challenge validity (5 minutes) */
  WEBAUTHN_CHALLENGE_TTL_MS: 5 * 60 * 1000,
  /** PAM request expiry (1 hour) */
  PAM_REQUEST_EXPIRY_MS: 60 * 60 * 1000,
  /** Maximum PAM session duration (4 hours) */
  MAX_PAM_DURATION_MINUTES: 240,
  /** Break-glass max duration (1 hour) */
  BREAK_GLASS_MAX_DURATION_MINUTES: 60,
  /** Session recording retention (7 years) */
  RECORDING_RETENTION_DAYS: 2555,
  /** Zero-trust session timeout (30 minutes) */
  SESSION_TIMEOUT_MINUTES: 30,
  /** Trust score thresholds */
  TRUST_THRESHOLDS: {
    low: 25,
    medium: 50,
    high: 75,
    verified: 90,
  },
  /** Audit log hash algorithm */
  AUDIT_HASH_ALGORITHM: "sha256",
} as const;

// =============================================================================
// WEBAUTHN / FIDO2
// =============================================================================

/**
 * Generate WebAuthn registration challenge
 */
export function generateRegistrationChallenge(userId: ObjectId): WebAuthnChallenge {
  const challenge = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SECURITY_CONFIG.WEBAUTHN_CHALLENGE_TTL_MS);
  
  return {
    challenge_id: crypto.randomUUID(),
    challenge,
    user_id: userId,
    type: "registration",
    expires_at: expiresAt,
    used: false,
    created_at: new Date(),
  };
}

/**
 * Generate WebAuthn authentication challenge
 */
export function generateAuthenticationChallenge(): WebAuthnChallenge {
  const challenge = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SECURITY_CONFIG.WEBAUTHN_CHALLENGE_TTL_MS);
  
  return {
    challenge_id: crypto.randomUUID(),
    challenge,
    type: "authentication",
    expires_at: expiresAt,
    used: false,
    created_at: new Date(),
  };
}

/**
 * Validate challenge is not expired or used
 */
export function isChallengeValid(challenge: WebAuthnChallenge): boolean {
  if (challenge.used) {
    return false;
  }
  
  if (new Date() > challenge.expires_at) {
    return false;
  }
  
  return true;
}

/**
 * Create WebAuthn credential record
 */
export function createCredentialRecord(
  userId: ObjectId,
  credentialId: string,
  publicKey: string,
  deviceName: string,
  transports: string[] = [],
  aaguid?: string
): Omit<WebAuthnCredential, "last_used_at" | "revoked_at" | "revoked_reason"> {
  return {
    credential_id: credentialId,
    user_id: userId,
    public_key: publicKey,
    counter: 0,
    created_at: new Date(),
    device_name: deviceName,
    aaguid,
    transports,
    is_backup: false,
    status: "active",
  };
}

// =============================================================================
// JIT PRIVILEGED ACCESS MANAGEMENT (PAM)
// =============================================================================

/**
 * Create PAM access request
 */
export function createPamRequest(
  requesterId: ObjectId,
  accessType: ElevatedAccessType,
  targetResource: PamAccessRequest["target_resource"],
  justification: string,
  requestedDuration: number,
  ticketReference?: string,
  isBreakGlass: boolean = false
): Omit<PamAccessRequest, "request_id" | "created_at" | "updated_at"> {
  // Validate duration
  const maxDuration = isBreakGlass 
    ? SECURITY_CONFIG.BREAK_GLASS_MAX_DURATION_MINUTES
    : SECURITY_CONFIG.MAX_PAM_DURATION_MINUTES;
  
  if (requestedDuration > maxDuration) {
    throw new Error(`Requested duration exceeds maximum of ${maxDuration} minutes`);
  }
  
  return {
    requester_id: requesterId,
    access_type: accessType,
    target_resource: targetResource,
    justification,
    ticket_reference: ticketReference,
    status: "pending",
    requested_duration: requestedDuration,
    actions_performed: [],
    is_break_glass: isBreakGlass,
  };
}

/**
 * Approve PAM request
 */
export function approvePamRequest(
  request: PamAccessRequest,
  approverId: ObjectId
): PamAccessRequest {
  if (request.status !== "pending") {
    throw new Error(`Cannot approve request in ${request.status} status`);
  }
  
  const now = new Date();
  const accessEnd = new Date(now);
  accessEnd.setMinutes(accessEnd.getMinutes() + request.requested_duration);
  
  return {
    ...request,
    status: "approved",
    approved_by: approverId,
    approved_at: now,
    access_start: now,
    access_end: accessEnd,
    updated_at: now,
  };
}

/**
 * Deny PAM request
 */
export function denyPamRequest(
  request: PamAccessRequest,
  approverId: ObjectId,
  reason: string
): PamAccessRequest {
  if (request.status !== "pending") {
    throw new Error(`Cannot deny request in ${request.status} status`);
  }
  
  return {
    ...request,
    status: "denied",
    approved_by: approverId,
    denial_reason: reason,
    updated_at: new Date(),
  };
}

/**
 * Start PAM session
 */
export function startPamSession(
  request: PamAccessRequest,
  recordingRef: string
): PamAccessRequest {
  if (request.status !== "approved") {
    throw new Error("Cannot start session for non-approved request");
  }
  
  return {
    ...request,
    status: "in_use",
    access_start: new Date(),
    session_recording_ref: recordingRef,
    updated_at: new Date(),
  };
}

/**
 * End PAM session
 */
export function endPamSession(request: PamAccessRequest): PamAccessRequest {
  if (request.status !== "in_use") {
    throw new Error("Cannot end session that is not in use");
  }
  
  return {
    ...request,
    status: "completed",
    access_end: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Log PAM action
 */
export function logPamAction(
  request: PamAccessRequest,
  action: string,
  target: string,
  details: Record<string, unknown>,
  result: "success" | "failure" | "partial",
  error?: string
): PamAccessRequest {
  const newAction = {
    timestamp: new Date(),
    action,
    target,
    details,
    result,
    error,
  };
  
  return {
    ...request,
    actions_performed: [...request.actions_performed, newAction],
    updated_at: new Date(),
  };
}

/**
 * Check if PAM session is still valid
 */
export function isPamSessionValid(request: PamAccessRequest): boolean {
  if (request.status !== "in_use") {
    return false;
  }
  
  if (!request.access_end) {
    return false;
  }
  
  return new Date() < request.access_end;
}

/**
 * Get default approval policy for access type
 */
export function getDefaultApprovalPolicy(
  accessType: ElevatedAccessType
): Omit<PamApprovalPolicy, "policy_id" | "created_at" | "updated_at"> {
  const policies: Record<ElevatedAccessType, Omit<PamApprovalPolicy, "policy_id" | "created_at" | "updated_at">> = {
    superadmin_full: {
      access_type: "superadmin_full",
      required_approvers: 2,
      approver_roles: ["SUPER_ADMIN", "SECURITY_ADMIN"],
      max_duration: 240,
      require_mfa: true,
      require_recording: true,
      notifications: {
        on_request: ["security@fixzit.app"],
        on_approval: ["security@fixzit.app", "admin@fixzit.app"],
        on_access_start: ["security@fixzit.app"],
        on_access_end: ["security@fixzit.app"],
      },
    },
    tenant_admin: {
      access_type: "tenant_admin",
      required_approvers: 1,
      approver_roles: ["SUPER_ADMIN"],
      max_duration: 120,
      require_mfa: true,
      require_recording: true,
      notifications: {
        on_request: ["support@fixzit.app"],
        on_approval: ["support@fixzit.app"],
        on_access_start: [],
        on_access_end: [],
      },
    },
    data_export: {
      access_type: "data_export",
      required_approvers: 2,
      approver_roles: ["SUPER_ADMIN", "PRIVACY_ADMIN"],
      max_duration: 60,
      require_mfa: true,
      require_recording: true,
      notifications: {
        on_request: ["privacy@fixzit.app"],
        on_approval: ["privacy@fixzit.app", "security@fixzit.app"],
        on_access_start: ["privacy@fixzit.app"],
        on_access_end: ["privacy@fixzit.app"],
      },
    },
    user_impersonation: {
      access_type: "user_impersonation",
      required_approvers: 1,
      approver_roles: ["SUPER_ADMIN", "SUPPORT_LEAD"],
      max_duration: 30,
      require_mfa: true,
      require_recording: true,
      notifications: {
        on_request: ["support@fixzit.app"],
        on_approval: ["support@fixzit.app"],
        on_access_start: [],
        on_access_end: [],
      },
    },
    config_change: {
      access_type: "config_change",
      required_approvers: 1,
      approver_roles: ["SUPER_ADMIN", "TECH_LEAD"],
      max_duration: 60,
      require_mfa: true,
      require_recording: true,
      notifications: {
        on_request: ["devops@fixzit.app"],
        on_approval: ["devops@fixzit.app"],
        on_access_start: [],
        on_access_end: [],
      },
    },
    security_override: {
      access_type: "security_override",
      required_approvers: 2,
      approver_roles: ["SUPER_ADMIN", "SECURITY_ADMIN"],
      max_duration: 30,
      require_mfa: true,
      require_recording: true,
      notifications: {
        on_request: ["security@fixzit.app", "cto@fixzit.app"],
        on_approval: ["security@fixzit.app", "cto@fixzit.app"],
        on_access_start: ["security@fixzit.app"],
        on_access_end: ["security@fixzit.app"],
      },
    },
    emergency_break_glass: {
      access_type: "emergency_break_glass",
      required_approvers: 1, // Can self-approve in emergency
      approver_roles: ["SUPER_ADMIN"],
      max_duration: 60,
      require_mfa: true,
      require_recording: true,
      notifications: {
        on_request: ["security@fixzit.app", "cto@fixzit.app", "ceo@fixzit.app"],
        on_approval: ["security@fixzit.app", "cto@fixzit.app", "ceo@fixzit.app"],
        on_access_start: ["security@fixzit.app", "cto@fixzit.app"],
        on_access_end: ["security@fixzit.app", "cto@fixzit.app"],
      },
    },
  };
  
  return policies[accessType];
}

// =============================================================================
// ZERO-TRUST SESSION MANAGEMENT
// =============================================================================

/**
 * Create zero-trust session
 */
export function createZeroTrustSession(
  userId: ObjectId,
  deviceFingerprint: string,
  ipAddress: string,
  isKnownDevice: boolean
): Omit<ZeroTrustSession, "session_id" | "created_at" | "updated_at"> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMinutes(expiresAt.getMinutes() + SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES);
  
  // Initial trust factors
  const trustFactors: TrustFactor[] = [];
  let riskScore = 50; // Start neutral
  const riskFactors: string[] = [];
  
  if (!isKnownDevice) {
    riskScore += 20;
    riskFactors.push("unknown_device");
  }
  
  // Calculate initial trust level
  const trustLevel = calculateTrustLevel(0); // No factors verified yet
  
  return {
    user_id: userId,
    trust_level: trustLevel,
    trust_factors: trustFactors,
    device_fingerprint: deviceFingerprint,
    ip_address: ipAddress,
    is_known_device: isKnownDevice,
    risk_score: riskScore,
    risk_factors: riskFactors,
    started_at: now,
    last_activity_at: now,
    expires_at: expiresAt,
    is_active: true,
  };
}

/**
 * Add trust factor to session
 */
export function addTrustFactor(
  session: ZeroTrustSession,
  factorType: TrustFactor["type"],
  scoreContribution: number = 25
): ZeroTrustSession {
  const now = new Date();
  const expiresAt = new Date(now);
  
  // Different factors have different validity periods
  const validityHours: Record<TrustFactor["type"], number> = {
    password: 24,
    otp: 1,
    fido2: 8,
    nafath: 24,
    email_verified: 720, // 30 days
    device_known: 720,
    ip_allowlisted: 24,
  };
  
  expiresAt.setHours(expiresAt.getHours() + validityHours[factorType]);
  
  const newFactor: TrustFactor = {
    type: factorType,
    verified_at: now,
    expires_at: expiresAt,
    score_contribution: scoreContribution,
  };
  
  const updatedFactors = [...session.trust_factors, newFactor];
  const totalScore = updatedFactors.reduce((sum, f) => sum + f.score_contribution, 0);
  
  return {
    ...session,
    trust_factors: updatedFactors,
    trust_level: calculateTrustLevel(totalScore),
    last_activity_at: now,
    updated_at: now,
  };
}

/**
 * Calculate trust level from score
 */
function calculateTrustLevel(score: number): ZeroTrustSession["trust_level"] {
  if (score >= SECURITY_CONFIG.TRUST_THRESHOLDS.verified) return "verified";
  if (score >= SECURITY_CONFIG.TRUST_THRESHOLDS.high) return "high";
  if (score >= SECURITY_CONFIG.TRUST_THRESHOLDS.medium) return "medium";
  if (score >= SECURITY_CONFIG.TRUST_THRESHOLDS.low) return "low";
  return "none";
}

/**
 * Check if session has required trust level
 */
export function hasRequiredTrustLevel(
  session: ZeroTrustSession,
  requiredLevel: ZeroTrustSession["trust_level"]
): boolean {
  const levels: ZeroTrustSession["trust_level"][] = ["none", "low", "medium", "high", "verified"];
  const currentIndex = levels.indexOf(session.trust_level);
  const requiredIndex = levels.indexOf(requiredLevel);
  
  return currentIndex >= requiredIndex;
}

/**
 * Refresh session timeout
 */
export function refreshSession(session: ZeroTrustSession): ZeroTrustSession {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMinutes(expiresAt.getMinutes() + SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES);
  
  return {
    ...session,
    last_activity_at: now,
    expires_at: expiresAt,
    updated_at: now,
  };
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

let previousAuditHash: string = "0".repeat(64);

/**
 * Create audit log entry with chain integrity
 */
export function createAuditLogEntry(
  category: AuditCategory,
  action: string,
  severity: AuditSeverity,
  actor: AuditLogEntry["actor"],
  resource: AuditLogEntry["resource"],
  details: Record<string, unknown>,
  result: "success" | "failure" | "partial",
  tenantId?: ObjectId,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  correlationId?: string
): Omit<AuditLogEntry, "log_id"> {
  const timestamp = new Date();
  
  // Calculate integrity hash
  const dataToHash = JSON.stringify({
    timestamp: timestamp.toISOString(),
    category,
    action,
    actor,
    resource,
    details,
    previous_hash: previousAuditHash,
  });
  
  const integrityHash = crypto
    .createHash(SECURITY_CONFIG.AUDIT_HASH_ALGORITHM)
    .update(dataToHash)
    .digest("hex");
  
  const entry: Omit<AuditLogEntry, "log_id"> = {
    timestamp,
    actor,
    tenant_id: tenantId,
    category,
    action,
    severity,
    resource,
    before,
    after,
    details,
    result,
    correlation_id: correlationId,
    tags: [],
    integrity_hash: integrityHash,
    previous_hash: previousAuditHash,
  };
  
  // Update previous hash for chain
  previousAuditHash = integrityHash;
  
  // Log to structured logger as well
  logger.info(`Audit: ${category}/${action}`, {
    audit: true,
    category,
    action,
    severity,
    result,
    actor: actor.type === "user" ? actor.user_id?.toString() : actor.service_name,
    resource: `${resource.type}:${resource.id || resource.name}`,
  });
  
  return entry;
}

/**
 * Verify audit log chain integrity
 */
export function verifyAuditChain(
  logs: AuditLogEntry[]
): { valid: boolean; brokenAt?: number; error?: string } {
  if (logs.length === 0) {
    return { valid: true };
  }
  
  for (let i = 1; i < logs.length; i++) {
    const previousLog = logs[i - 1];
    const currentLog = logs[i];
    
    if (currentLog.previous_hash !== previousLog.integrity_hash) {
      return {
        valid: false,
        brokenAt: i,
        error: `Chain broken at log index ${i}: expected previous_hash ${previousLog.integrity_hash}, got ${currentLog.previous_hash}`,
      };
    }
  }
  
  return { valid: true };
}

// =============================================================================
// GHOST MODE (USER IMPERSONATION)
// =============================================================================

/**
 * Create ghost mode session
 */
export function createGhostModeSession(
  adminUserId: ObjectId,
  targetUserId: ObjectId,
  tenantId: ObjectId,
  pamRequestId: ObjectId,
  recordingId: ObjectId,
  reason: string,
  maxDuration: number = 30,
  ticketReference?: string
): Omit<GhostModeSession, "session_id"> {
  return {
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    tenant_id: tenantId,
    pam_request_id: pamRequestId,
    recording_id: recordingId,
    reason,
    ticket_reference: ticketReference,
    started_at: new Date(),
    max_duration: maxDuration,
    actions: [],
    is_active: true,
  };
}

/**
 * Log ghost mode action
 */
export function logGhostModeAction(
  session: GhostModeSession,
  actionType: string,
  path: string,
  method: string,
  responseStatus: number,
  bodyHash?: string
): GhostModeSession {
  const newAction = {
    timestamp: new Date(),
    action_type: actionType,
    path,
    method,
    body_hash: bodyHash,
    response_status: responseStatus,
  };
  
  return {
    ...session,
    actions: [...session.actions, newAction],
  };
}

/**
 * End ghost mode session
 */
export function endGhostModeSession(
  session: GhostModeSession,
  reason: "manual" | "timeout" | "revoked"
): GhostModeSession {
  return {
    ...session,
    ended_at: new Date(),
    is_active: false,
    termination_reason: reason,
  };
}

/**
 * Check if ghost mode session is still valid
 */
export function isGhostModeSessionValid(session: GhostModeSession): boolean {
  if (!session.is_active) {
    return false;
  }
  
  const now = new Date();
  const maxEndTime = new Date(session.started_at);
  maxEndTime.setMinutes(maxEndTime.getMinutes() + session.max_duration);
  
  return now < maxEndTime;
}
