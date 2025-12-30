/**
 * Security Types for Enterprise Security Features
 * 
 * Supports:
 * - FIDO2/WebAuthn MFA
 * - JIT Privileged Access Management (PAM)
 * - Session Recording
 * - Zero-Trust Architecture
 * - Audit Logging
 * 
 * @module types/security
 */

import type { ObjectId } from "mongodb";

// =============================================================================
// FIDO2/WEBAUTHN TYPES
// =============================================================================

export interface WebAuthnCredential {
  /** Credential ID (Base64URL encoded) */
  credential_id: string;
  /** User ID this credential belongs to */
  user_id: ObjectId;
  /** Public key in COSE format */
  public_key: string;
  /** Signature counter for replay protection */
  counter: number;
  /** Credential creation date */
  created_at: Date;
  /** Last used date */
  last_used_at?: Date;
  /** Device name (user provided) */
  device_name: string;
  /** Authenticator AAGUID */
  aaguid?: string;
  /** Transports (usb, nfc, ble, internal) */
  transports: string[];
  /** Is this a backup key */
  is_backup: boolean;
  /** Status */
  status: "active" | "revoked" | "suspended";
  /** Revocation reason */
  revoked_reason?: string;
  /** Revoked at */
  revoked_at?: Date;
}

export interface WebAuthnChallenge {
  /** Challenge ID */
  challenge_id: string;
  /** The actual challenge (Base64URL) */
  challenge: string;
  /** User ID for registration, or null for authentication */
  user_id?: ObjectId;
  /** Challenge type */
  type: "registration" | "authentication";
  /** Challenge expiry (5 minutes) */
  expires_at: Date;
  /** Whether challenge has been used */
  used: boolean;
  created_at: Date;
}

// =============================================================================
// JIT PRIVILEGED ACCESS MANAGEMENT (PAM)
// =============================================================================

export type ElevatedAccessType =
  | "superadmin_full"
  | "tenant_admin"
  | "data_export"
  | "user_impersonation"
  | "config_change"
  | "security_override"
  | "emergency_break_glass";

export type PamRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "in_use"
  | "completed"
  | "revoked";

export interface PamAccessRequest {
  /** Request ID */
  request_id: ObjectId;
  /** User requesting access */
  requester_id: ObjectId;
  /** Type of elevated access */
  access_type: ElevatedAccessType;
  /** Target resource (tenant, user, system) */
  target_resource: {
    type: "tenant" | "user" | "system" | "data";
    id?: ObjectId;
    name: string;
  };
  /** Business justification */
  justification: string;
  /** Ticket/Issue reference */
  ticket_reference?: string;
  /** Current status */
  status: PamRequestStatus;
  /** Requested duration (minutes) */
  requested_duration: number;
  /** Approver ID */
  approved_by?: ObjectId;
  /** Approval timestamp */
  approved_at?: Date;
  /** Denial reason */
  denial_reason?: string;
  /** Access start time */
  access_start?: Date;
  /** Access end time */
  access_end?: Date;
  /** Session recording reference */
  session_recording_ref?: string;
  /** Actions performed during access */
  actions_performed: PamAction[];
  /** Emergency break-glass flag */
  is_break_glass: boolean;
  /** Break-glass approver (for dual authorization) */
  break_glass_approver?: ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface PamAction {
  /** Action timestamp */
  timestamp: Date;
  /** Action type */
  action: string;
  /** Target affected */
  target: string;
  /** Parameters/details */
  details: Record<string, unknown>;
  /** Result of action */
  result: "success" | "failure" | "partial";
  /** Error message if failed */
  error?: string;
}

export interface PamApprovalPolicy {
  /** Policy ID */
  policy_id: ObjectId;
  /** Access type this policy applies to */
  access_type: ElevatedAccessType;
  /** Required approvers count */
  required_approvers: number;
  /** Who can approve */
  approver_roles: string[];
  /** Maximum duration allowed (minutes) */
  max_duration: number;
  /** Auto-approve conditions */
  auto_approve_conditions?: {
    working_hours_only: boolean;
    ip_allowlist?: string[];
    max_requests_per_day?: number;
  };
  /** Require MFA before access */
  require_mfa: boolean;
  /** Require session recording */
  require_recording: boolean;
  /** Notification settings */
  notifications: {
    on_request: string[];
    on_approval: string[];
    on_access_start: string[];
    on_access_end: string[];
  };
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// SESSION RECORDING
// =============================================================================

export interface SessionRecording {
  /** Recording ID */
  recording_id: ObjectId;
  /** PAM request that triggered this recording */
  pam_request_id: ObjectId;
  /** User being recorded */
  user_id: ObjectId;
  /** Session type */
  session_type: "web" | "api" | "cli" | "impersonation";
  /** Recording status */
  status: "recording" | "completed" | "failed" | "archived";
  /** S3 URL to recording file */
  storage_url: string;
  /** Recording format */
  format: "rrweb" | "terminal_cast" | "api_log";
  /** File size in bytes */
  file_size?: number;
  /** Duration in seconds */
  duration_seconds?: number;
  /** Encryption key ID (for at-rest encryption) */
  encryption_key_id: string;
  /** Start time */
  started_at: Date;
  /** End time */
  ended_at?: Date;
  /** Retention policy */
  retention_days: number;
  /** Scheduled deletion date */
  delete_after: Date;
  /** Metadata */
  metadata: {
    ip_address: string;
    user_agent: string;
    actions_count: number;
    pages_visited?: string[];
  };
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// ZERO-TRUST SESSION
// =============================================================================

export type SessionTrustLevel = "none" | "low" | "medium" | "high" | "verified";

export interface ZeroTrustSession {
  /** Session ID */
  session_id: ObjectId;
  /** User ID */
  user_id: ObjectId;
  /** Current trust level */
  trust_level: SessionTrustLevel;
  /** Trust factors verified */
  trust_factors: TrustFactor[];
  /** Device fingerprint */
  device_fingerprint: string;
  /** IP address */
  ip_address: string;
  /** Geolocation */
  geolocation?: {
    country: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  /** Is known device */
  is_known_device: boolean;
  /** Risk score (0-100) */
  risk_score: number;
  /** Risk factors detected */
  risk_factors: string[];
  /** Session start */
  started_at: Date;
  /** Last activity */
  last_activity_at: Date;
  /** Session expiry */
  expires_at: Date;
  /** Is active */
  is_active: boolean;
  /** Termination reason if ended */
  termination_reason?: "logout" | "timeout" | "admin_revoked" | "security_violation";
  created_at: Date;
  updated_at: Date;
}

export interface TrustFactor {
  /** Factor type */
  type: "password" | "otp" | "fido2" | "nafath" | "email_verified" | "device_known" | "ip_allowlisted";
  /** When this factor was verified */
  verified_at: Date;
  /** Expiry of this verification */
  expires_at: Date;
  /** Trust score contribution (0-25 each) */
  score_contribution: number;
}

// =============================================================================
// COMPREHENSIVE AUDIT LOG
// =============================================================================

export type AuditCategory =
  | "authentication"
  | "authorization"
  | "data_access"
  | "data_modification"
  | "data_deletion"
  | "admin_action"
  | "security_event"
  | "compliance_event"
  | "system_event";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface AuditLogEntry {
  /** Log entry ID */
  log_id: ObjectId;
  /** Timestamp (immutable) */
  timestamp: Date;
  /** Actor (user or system) */
  actor: {
    type: "user" | "system" | "service" | "anonymous";
    user_id?: ObjectId;
    service_name?: string;
    ip_address?: string;
    user_agent?: string;
  };
  /** Tenant context */
  tenant_id?: ObjectId;
  /** Event category */
  category: AuditCategory;
  /** Specific action */
  action: string;
  /** Severity level */
  severity: AuditSeverity;
  /** Resource affected */
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  /** Before state (for modifications) */
  before?: Record<string, unknown>;
  /** After state (for modifications) */
  after?: Record<string, unknown>;
  /** Additional details */
  details: Record<string, unknown>;
  /** Result of the action */
  result: "success" | "failure" | "partial";
  /** Error details if failed */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  /** Correlation ID for tracing */
  correlation_id?: string;
  /** Related audit log IDs */
  related_logs?: ObjectId[];
  /** Tags for filtering */
  tags: string[];
  /** Hash for tamper detection */
  integrity_hash: string;
  /** Previous log hash (chain integrity) */
  previous_hash?: string;
}

// =============================================================================
// IP ALLOWLIST
// =============================================================================

export interface IpAllowlistEntry {
  /** Entry ID */
  entry_id: ObjectId;
  /** Tenant ID (null for global) */
  tenant_id?: ObjectId;
  /** IP address or CIDR range */
  ip_range: string;
  /** Description */
  description: string;
  /** Is CIDR range */
  is_cidr: boolean;
  /** Created by */
  created_by: ObjectId;
  /** Expiry (null for permanent) */
  expires_at?: Date;
  /** Is active */
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// RATE LIMITING
// =============================================================================

export interface RateLimitConfig {
  /** Config ID */
  config_id: ObjectId;
  /** Tenant ID (null for global) */
  tenant_id?: ObjectId;
  /** Endpoint pattern */
  endpoint_pattern: string;
  /** HTTP methods affected */
  methods: string[];
  /** Requests per window */
  limit: number;
  /** Window size in seconds */
  window_seconds: number;
  /** Burst allowance */
  burst?: number;
  /** Skip for authenticated users */
  skip_authenticated: boolean;
  /** Skip for specific IPs */
  skip_ips: string[];
  /** Custom response on limit */
  limit_response?: {
    status_code: number;
    message: string;
    retry_after_header: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// GHOST MODE (USER IMPERSONATION)
// =============================================================================

export interface GhostModeSession {
  /** Session ID */
  session_id: ObjectId;
  /** Super admin performing impersonation */
  admin_user_id: ObjectId;
  /** User being impersonated */
  target_user_id: ObjectId;
  /** Tenant context */
  tenant_id: ObjectId;
  /** PAM request that authorized this */
  pam_request_id: ObjectId;
  /** Session recording reference */
  recording_id: ObjectId;
  /** Reason for impersonation */
  reason: string;
  /** Ticket reference */
  ticket_reference?: string;
  /** Started at */
  started_at: Date;
  /** Ended at */
  ended_at?: Date;
  /** Maximum allowed duration (minutes) */
  max_duration: number;
  /** Actions performed */
  actions: GhostModeAction[];
  /** Is active */
  is_active: boolean;
  /** Termination reason */
  termination_reason?: "manual" | "timeout" | "revoked";
}

export interface GhostModeAction {
  timestamp: Date;
  action_type: string;
  path: string;
  method: string;
  body_hash?: string;
  response_status: number;
}
