/**
 * Super Admin Types for God Mode Features
 * 
 * Supports:
 * - Tenant Management (freeze, suspend, offboard)
 * - Tenant Snapshots & Time Travel
 * - Kill Switch (session invalidation)
 * - Health Monitoring & Churn Prediction
 * 
 * @module types/superadmin
 */

import type { ObjectId } from "mongodb";

// =============================================================================
// TENANT CONFIGURATION (EXTENDED)
// =============================================================================

export type TenantStatus = 
  | "active"
  | "trial"
  | "suspended"
  | "frozen"
  | "offboarding"
  | "offboarded";

export type TenantTier = 
  | "free"
  | "starter"
  | "professional"
  | "enterprise"
  | "unlimited";

export interface TenantConfig {
  /** Tenant ID */
  tenant_id: ObjectId;
  /** Display name */
  name: string;
  /** URL slug */
  slug: string;
  /** Current status */
  status: TenantStatus;
  /** Subscription tier */
  tier: TenantTier;
  /** Feature flags */
  features: TenantFeatures;
  /** Usage limits */
  limits: TenantLimits;
  /** Compliance configuration */
  compliance: TenantCompliance;
  /** Branding settings */
  branding: TenantBranding;
  /** Health metrics */
  health: TenantHealth;
  /** Billing info */
  billing: TenantBilling;
  /** Created timestamp */
  created_at: Date;
  /** Last updated */
  updated_at: Date;
  /** Trial end date */
  trial_ends_at?: Date;
  /** Suspension reason */
  suspension_reason?: string;
  /** Frozen by (admin ID) */
  frozen_by?: ObjectId;
  /** Frozen at */
  frozen_at?: Date;
  /** Freeze reason */
  freeze_reason?: string;
}

export interface TenantFeatures {
  /** AI Copilot enabled */
  ai_copilot: boolean;
  /** ZATCA integration enabled */
  zatca_integration: boolean;
  /** Nafath identity required */
  nafath_required: boolean;
  /** Marketplace access */
  marketplace_access: boolean;
  /** White-label branding */
  white_label: boolean;
  /** API access */
  api_access: boolean;
  /** Advanced analytics */
  advanced_analytics: boolean;
  /** Custom workflows */
  custom_workflows: boolean;
  /** SSO/SAML */
  sso_enabled: boolean;
  /** Multi-property management */
  multi_property: boolean;
  /** IoT integration */
  iot_integration: boolean;
  /** BIM viewer */
  bim_viewer: boolean;
}

export interface TenantLimits {
  /** Max users */
  users: number;
  /** Storage in GB */
  storage_gb: number;
  /** API calls per minute */
  api_calls_per_min: number;
  /** Properties allowed */
  properties: number;
  /** Work orders per month */
  work_orders_per_month: number;
  /** Integrations allowed */
  integrations: number;
}

export interface TenantCompliance {
  /** Commercial Registration Number */
  commercial_reg_no?: string;
  /** VAT Number (15 digits) */
  vat_number?: string;
  /** ZATCA wave number */
  zatca_wave?: number;
  /** NCA compliant */
  nca_compliant: boolean;
  /** PDPL consented */
  pdpl_consented: boolean;
  /** Consent date */
  pdpl_consent_date?: Date;
  /** Data residency requirement */
  data_residency?: "sa" | "gcc" | "global";
}

export interface TenantBranding {
  /** Logo URL */
  logo_url?: string;
  /** Favicon URL */
  favicon_url?: string;
  /** Primary color (hex) */
  primary_color?: string;
  /** Secondary color (hex) */
  secondary_color?: string;
  /** Custom domain */
  custom_domain?: string;
  /** Email from name */
  email_from_name?: string;
  /** Email reply-to */
  email_reply_to?: string;
}

export interface TenantHealth {
  /** Overall health score (0-100) */
  score: number;
  /** Last activity date */
  last_activity_at?: Date;
  /** Active users (last 30 days) */
  active_users_30d: number;
  /** Total users */
  total_users: number;
  /** User engagement rate */
  engagement_rate: number;
  /** Churn risk */
  churn_risk: "low" | "medium" | "high" | "critical";
  /** Churn risk factors */
  churn_factors: string[];
  /** NPS score */
  nps_score?: number;
  /** Support tickets (last 30 days) */
  support_tickets_30d: number;
  /** Feature adoption rate */
  feature_adoption: Record<string, number>;
}

export interface TenantBilling {
  /** Stripe customer ID */
  stripe_customer_id?: string;
  /** Current plan */
  plan_id?: string;
  /** Billing email */
  billing_email?: string;
  /** Payment method on file */
  has_payment_method: boolean;
  /** Current period end */
  current_period_end?: Date;
  /** MRR in cents */
  mrr_cents: number;
  /** Past due */
  is_past_due: boolean;
  /** Past due amount in cents */
  past_due_cents?: number;
}

// =============================================================================
// TENANT SNAPSHOTS
// =============================================================================

export type SnapshotType = 
  | "scheduled"
  | "manual"
  | "pre_migration"
  | "pre_offboard"
  | "emergency";

export type SnapshotStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "expired"
  | "restored";

export interface TenantSnapshot {
  /** Snapshot ID */
  snapshot_id: ObjectId;
  /** Tenant this snapshot belongs to */
  tenant_id: ObjectId;
  /** Snapshot type */
  type: SnapshotType;
  /** Status */
  status: SnapshotStatus;
  /** Snapshot reason/description */
  description: string;
  /** Created by (admin ID) */
  created_by: ObjectId;
  /** S3 URL to snapshot archive */
  storage_url?: string;
  /** Snapshot size in bytes */
  size_bytes?: number;
  /** Collections included */
  collections_included: string[];
  /** Document counts per collection */
  document_counts: Record<string, number>;
  /** Encryption key ID */
  encryption_key_id?: string;
  /** Checksum for integrity */
  checksum?: string;
  /** Started at */
  started_at?: Date;
  /** Completed at */
  completed_at?: Date;
  /** Error message if failed */
  error_message?: string;
  /** Retention days */
  retention_days: number;
  /** Expires at */
  expires_at: Date;
  /** Can be restored */
  is_restorable: boolean;
  /** Restored count */
  restore_count: number;
  /** Last restored at */
  last_restored_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SnapshotRestoreJob {
  /** Job ID */
  job_id: ObjectId;
  /** Snapshot being restored */
  snapshot_id: ObjectId;
  /** Tenant ID */
  tenant_id: ObjectId;
  /** Initiated by */
  initiated_by: ObjectId;
  /** Status */
  status: "pending" | "restoring" | "completed" | "failed" | "rolled_back";
  /** Restore mode */
  mode: "full" | "partial" | "point_in_time";
  /** Collections to restore (if partial) */
  collections?: string[];
  /** Pre-restore snapshot ID (for rollback) */
  pre_restore_snapshot_id?: ObjectId;
  /** Progress percentage */
  progress_percent: number;
  /** Documents restored */
  documents_restored: number;
  /** Documents total */
  documents_total: number;
  /** Error message */
  error_message?: string;
  /** Dry run mode */
  is_dry_run: boolean;
  /** Dry run results */
  dry_run_results?: Record<string, unknown>;
  /** Started at */
  started_at?: Date;
  /** Completed at */
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// KILL SWITCH
// =============================================================================

export interface KillSwitchEvent {
  /** Event ID */
  event_id: ObjectId;
  /** Target type */
  target_type: "tenant" | "user" | "ip" | "session";
  /** Target ID */
  target_id: string;
  /** Action taken */
  action: "invalidate_sessions" | "disable_access" | "block_ip" | "freeze_tenant";
  /** Reason */
  reason: string;
  /** Severity */
  severity: "warning" | "critical" | "emergency";
  /** Initiated by */
  initiated_by: ObjectId;
  /** Sessions invalidated count */
  sessions_invalidated: number;
  /** Affected users count */
  affected_users: number;
  /** Notification sent */
  notification_sent: boolean;
  /** Expiry (null for permanent) */
  expires_at?: Date;
  /** Is active */
  is_active: boolean;
  /** Revoked by */
  revoked_by?: ObjectId;
  /** Revoked at */
  revoked_at?: Date;
  /** Revoke reason */
  revoke_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// TENANT OFFBOARDING
// =============================================================================

export type OffboardingStatus =
  | "initiated"
  | "data_export"
  | "grace_period"
  | "final_warning"
  | "archiving"
  | "completed"
  | "cancelled";

export interface TenantOffboarding {
  /** Offboarding ID */
  offboarding_id: ObjectId;
  /** Tenant being offboarded */
  tenant_id: ObjectId;
  /** Status */
  status: OffboardingStatus;
  /** Initiated by */
  initiated_by: ObjectId;
  /** Reason */
  reason: string;
  /** Detailed notes */
  notes: string[];
  /** Grace period end */
  grace_period_end: Date;
  /** Data export requested */
  data_export_requested: boolean;
  /** Data export job ID */
  data_export_job_id?: ObjectId;
  /** Data export completed */
  data_export_completed: boolean;
  /** Final snapshot ID */
  final_snapshot_id?: ObjectId;
  /** Admin contacts notified */
  admins_notified: ObjectId[];
  /** Notification dates */
  notification_dates: Date[];
  /** Cancellation deadline */
  cancellation_deadline: Date;
  /** Cancelled by */
  cancelled_by?: ObjectId;
  /** Cancellation reason */
  cancellation_reason?: string;
  /** Completed at */
  completed_at?: Date;
  /** Data retention end (for legal hold) */
  data_retention_end?: Date;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// SYSTEM HEALTH & MONITORING
// =============================================================================

export interface SystemHealthMetric {
  /** Metric ID */
  metric_id: ObjectId;
  /** Metric name */
  name: string;
  /** Category */
  category: "database" | "api" | "storage" | "queue" | "external";
  /** Current value */
  value: number;
  /** Unit */
  unit: string;
  /** Threshold for warning */
  warning_threshold: number;
  /** Threshold for critical */
  critical_threshold: number;
  /** Current status */
  status: "healthy" | "warning" | "critical" | "unknown";
  /** Last check */
  last_checked_at: Date;
  /** Historical values (last 24h) */
  history_24h: Array<{ timestamp: Date; value: number }>;
  /** Trend */
  trend: "improving" | "stable" | "degrading";
}

export interface ServiceStatus {
  /** Service name */
  name: string;
  /** Status */
  status: "operational" | "degraded" | "outage" | "maintenance";
  /** Last incident */
  last_incident?: Date;
  /** Uptime percentage (30 days) */
  uptime_30d: number;
  /** Response time (ms) */
  response_time_ms: number;
  /** Dependencies */
  dependencies: string[];
  /** Last health check */
  last_check: Date;
}

// =============================================================================
// AI INSIGHTS FOR ADMIN
// =============================================================================

export interface AdminAiInsight {
  /** Insight ID */
  insight_id: ObjectId;
  /** Category */
  category: "churn" | "growth" | "security" | "compliance" | "performance";
  /** Severity */
  severity: "info" | "warning" | "critical";
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Affected tenants */
  affected_tenant_ids: ObjectId[];
  /** Recommended actions */
  recommendations: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Data points used */
  data_points: Record<string, unknown>;
  /** Generated at */
  generated_at: Date;
  /** Expires at (for time-sensitive insights) */
  expires_at?: Date;
  /** Dismissed by */
  dismissed_by?: ObjectId;
  /** Dismissed at */
  dismissed_at?: Date;
  /** Action taken */
  action_taken?: string;
  /** Action taken by */
  action_taken_by?: ObjectId;
  /** Action taken at */
  action_taken_at?: Date;
}
