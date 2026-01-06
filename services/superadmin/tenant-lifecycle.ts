/**
 * Tenant Lifecycle Service (God Mode)
 * 
 * Super Admin capabilities for tenant management:
 * - Tenant Snapshots (full state backup/restore)
 * - Kill Switch (instant tenant shutdown)
 * - Time Travel (point-in-time recovery)
 * - Ghost Mode (stealth access)
 * - Health Monitoring
 * 
 * TD-001: Migrated to COLLECTIONS constants for type-safe collection names
 * 
 * @module services/superadmin/tenant-lifecycle
 */

import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import crypto from "crypto";
import { COLLECTIONS } from "@/lib/db/collection-names";

// =============================================================================
// TYPES
// =============================================================================

export interface TenantSnapshot {
  _id: ObjectId;
  tenant_id: ObjectId;
  
  /** Snapshot metadata */
  name: string;
  description?: string;
  type: SnapshotType;
  
  /** Snapshot state */
  status: SnapshotStatus;
  
  /** Storage info */
  storage_location: string;
  size_bytes?: number; // Optional for pending snapshots, set when completed
  checksum?: string; // Optional for pending snapshots, set when completed
  encryption_key_id?: string;
  
  /** Contents */
  collections_included: string[];
  files_included: boolean;
  settings_included: boolean;
  
  /** Timestamps */
  created_at: Date;
  created_by: ObjectId;
  expires_at?: Date;
  
  /** Restoration history */
  restore_count: number;
  last_restored_at?: Date;
}

export type SnapshotType = 
  | "manual"
  | "scheduled"
  | "pre_migration"
  | "pre_update"
  | "compliance"
  | "offboarding";

export type SnapshotStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "expired"
  | "deleted";

export interface RestoreJob {
  _id: ObjectId;
  snapshot_id: ObjectId;
  tenant_id: ObjectId;
  
  /** Restore options */
  restore_mode: "full" | "partial" | "settings_only" | "data_only";
  collections_to_restore?: string[];
  
  /** Status */
  status: RestoreStatus;
  progress_percent: number;
  current_step: string;
  
  /** Results */
  records_restored: number;
  files_restored: number;
  errors: RestoreError[];
  
  /** Timestamps */
  started_at: Date;
  completed_at?: Date;
  initiated_by: ObjectId;
}

export type RestoreStatus =
  | "pending"
  | "preparing"
  | "restoring_data"
  | "restoring_files"
  | "verifying"
  | "completed"
  | "failed"
  | "rolled_back";

export interface RestoreError {
  collection: string;
  record_id?: string;
  error: string;
  severity: "warning" | "error" | "critical";
}

export interface KillSwitchEvent {
  _id: ObjectId;
  tenant_id: ObjectId;
  
  /** Event details */
  action: KillSwitchAction;
  reason: string;
  severity: "precautionary" | "security" | "compliance" | "critical";
  
  /** Affected areas */
  blocked_features: string[];
  blocked_users: boolean;
  blocked_api: boolean;
  blocked_payments: boolean;
  
  /** Timestamps */
  activated_at: Date;
  activated_by: ObjectId;
  scheduled_reactivation?: Date;
  deactivated_at?: Date;
  deactivated_by?: ObjectId;
  
  /** Audit */
  audit_trail: KillSwitchAuditEntry[];
}

export type KillSwitchAction =
  | "suspend_access"
  | "read_only"
  | "block_api"
  | "block_payments"
  | "full_lockdown"
  | "data_quarantine";

export interface KillSwitchAuditEntry {
  timestamp: Date;
  action: string;
  actor_id: ObjectId;
  details: string;
}

export interface TimeTravelRequest {
  _id: ObjectId;
  tenant_id: ObjectId;
  
  /** Request details */
  target_timestamp: Date;
  scope: TimeTravelScope;
  collections?: string[];
  
  /** Status */
  status: TimeTravelStatus;
  
  /** Results */
  preview_available: boolean;
  changes_detected: number;
  rollback_snapshot_id?: ObjectId;
  
  /** Approval tracking */
  approved_by?: ObjectId;
  
  /** Timestamps */
  requested_at: Date;
  requested_by: ObjectId;
  executed_at?: Date;
  preview_expires_at?: Date;
}

export type TimeTravelScope = 
  | "preview_only"
  | "single_collection"
  | "selected_collections"
  | "full_tenant";

export type TimeTravelStatus =
  | "analyzing"
  | "preview_ready"
  | "preview_expired"
  | "pending_approval"
  | "executing"
  | "completed"
  | "cancelled"
  | "failed";

// =============================================================================
// SNAPSHOT SERVICE
// =============================================================================

interface SnapshotOptions {
  name: string;
  description?: string;
  type?: SnapshotType;
  collections?: string[];
  include_files?: boolean;
  include_settings?: boolean;
  expires_in_days?: number;
  encrypt?: boolean;
}

/**
 * Create a tenant snapshot
 */
export async function createSnapshot(
  tenantId: ObjectId,
  createdBy: ObjectId,
  options: SnapshotOptions
): Promise<TenantSnapshot> {
  const db = await getDatabase();
  const snapshotId = new ObjectId();
  const timestamp = new Date();
  
  // Default collections if not specified
  const defaultCollections = [
    "users",
    "work_orders",
    "assets",
    "properties",
    "invoices",
    "settings",
    "permissions",
    "audit_logs",
  ];
  
  const collectionsToInclude = options.collections ?? defaultCollections;
  
  // Generate storage path
  const storageLocation = `/snapshots/${tenantId.toString()}/${timestamp.toISOString().split('T')[0]}/${snapshotId.toString()}.snapshot`;
  
  // Calculate expiry
  let expiresAt: Date | undefined;
  if (options.expires_in_days) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + options.expires_in_days);
  }
  
  const snapshot: TenantSnapshot = {
    _id: snapshotId,
    tenant_id: tenantId,
    name: options.name,
    description: options.description,
    type: options.type ?? "manual",
    status: "pending",
    storage_location: storageLocation,
    // size_bytes and checksum are undefined for pending snapshots
    // They will be set by the background job when snapshot completes
    size_bytes: undefined,
    checksum: undefined,
    encryption_key_id: options.encrypt ? `key-${snapshotId.toString()}` : undefined,
    collections_included: collectionsToInclude,
    files_included: options.include_files ?? false,
    settings_included: options.include_settings ?? true,
    created_at: timestamp,
    created_by: createdBy,
    expires_at: expiresAt,
    restore_count: 0,
  };
  
  // Persist snapshot to database
  await db.collection(COLLECTIONS.TENANT_SNAPSHOTS).insertOne(snapshot);
  
  logger.info("Tenant snapshot creation initiated", {
    snapshot_id: snapshotId.toString(),
    tenant_id: tenantId.toString(),
    type: snapshot.type,
    collections: collectionsToInclude.length,
  });
  
  // In production, this would trigger async snapshot job
  // await queueSnapshotJob(snapshot);
  
  return snapshot;
}

/**
 * Restore from a snapshot
 */
export async function restoreFromSnapshot(
  snapshotId: ObjectId,
  tenantId: ObjectId,
  initiatedBy: ObjectId,
  options: {
    mode?: RestoreJob["restore_mode"];
    collections?: string[];
    create_backup_first?: boolean;
  } = {},
  getSnapshot?: (id: ObjectId) => Promise<TenantSnapshot | null>
): Promise<RestoreJob> {
  // Validate snapshot exists and belongs to tenant
  let snapshot: TenantSnapshot | null = null;
  if (getSnapshot) {
    snapshot = await getSnapshot(snapshotId);
  } else {
    // Fallback to database lookup if getSnapshot not provided
    const db = await getDatabase();
    snapshot = await db.collection(COLLECTIONS.TENANT_SNAPSHOTS).findOne({
      _id: snapshotId,
    }) as TenantSnapshot | null;
  }
  
  if (!snapshot) {
    throw new Error(`Snapshot ${snapshotId.toString()} not found`);
  }
  
  // Verify snapshot belongs to the target tenant
  if (!snapshot.tenant_id.equals(tenantId)) {
    throw new Error(`Snapshot ${snapshotId.toString()} does not belong to tenant ${tenantId.toString()}`);
  }
  
  // Verify snapshot is in completed status
  if (snapshot.status !== "completed") {
    throw new Error(`Snapshot ${snapshotId.toString()} is not ready (status: ${snapshot.status})`);
  }
  
  const db = await getDatabase();
  const jobId = new ObjectId();
  
  const restoreJob: RestoreJob = {
    _id: jobId,
    snapshot_id: snapshotId,
    tenant_id: tenantId,
    restore_mode: options.mode ?? "full",
    collections_to_restore: options.collections,
    status: "pending",
    progress_percent: 0,
    current_step: "Initializing restore job",
    records_restored: 0,
    files_restored: 0,
    errors: [],
    started_at: new Date(),
    initiated_by: initiatedBy,
  };
  
  // Persist restore job to database
  await db.collection(COLLECTIONS.RESTORE_JOBS).insertOne(restoreJob);
  
  logger.info("Tenant restore initiated", {
    job_id: jobId.toString(),
    snapshot_id: snapshotId.toString(),
    tenant_id: tenantId.toString(),
    mode: restoreJob.restore_mode,
  });
  
  // If pre-restore backup is requested, await it to ensure it succeeds before proceeding
  if (options.create_backup_first) {
    try {
      const preRestoreSnapshot = await createSnapshot(tenantId, initiatedBy, {
        name: `Pre-restore backup (${new Date().toISOString()})`,
        type: "pre_migration",
        expires_in_days: 30,
      });
      
      // Update restore job with pre-restore snapshot reference
      await db.collection(COLLECTIONS.RESTORE_JOBS).updateOne(
        { _id: jobId },
        { $set: { pre_restore_snapshot_id: preRestoreSnapshot._id } }
      );
      
      logger.info("Pre-restore backup created", {
        job_id: jobId.toString(),
        snapshot_id: preRestoreSnapshot._id.toString(),
      });
    } catch (backupError) {
      logger.error("Failed to create pre-restore backup - aborting restore", {
        job_id: jobId.toString(),
        tenant_id: tenantId.toString(),
        error: backupError instanceof Error ? backupError.message : String(backupError),
      });
      
      // Update job status to failed
      await db.collection(COLLECTIONS.RESTORE_JOBS).updateOne(
        { _id: jobId },
        { $set: { status: "failed", error: "Pre-restore backup failed" } }
      );
      
      throw new Error("Pre-restore backup failed - restore aborted");
    }
  }
  
  // In production, queue restore job
  // await queueRestoreJob(restoreJob);
  
  return restoreJob;
}

/**
 * Calculate snapshot hash for integrity verification
 */
export function calculateSnapshotChecksum(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// =============================================================================
// KILL SWITCH SERVICE
// =============================================================================

interface KillSwitchOptions {
  action: KillSwitchAction;
  reason: string;
  severity: KillSwitchEvent["severity"];
  block_users?: boolean;
  block_api?: boolean;
  block_payments?: boolean;
  blocked_features?: string[];
  scheduled_reactivation?: Date;
  notify_tenant?: boolean;
}

/**
 * Activate kill switch for a tenant
 */
export async function activateKillSwitch(
  tenantId: ObjectId,
  activatedBy: ObjectId,
  options: KillSwitchOptions
): Promise<KillSwitchEvent> {
  const db = await getDatabase();
  const eventId = new ObjectId();
  const timestamp = new Date();
  
  // Determine blocked features based on action
  const blockedFeatures = options.blocked_features ?? getDefaultBlockedFeatures(options.action);
  
  const event: KillSwitchEvent = {
    _id: eventId,
    tenant_id: tenantId,
    action: options.action,
    reason: options.reason,
    severity: options.severity,
    blocked_features: blockedFeatures,
    blocked_users: options.block_users ?? (options.action === "full_lockdown" || options.action === "suspend_access"),
    blocked_api: options.block_api ?? (options.action === "full_lockdown" || options.action === "block_api"),
    blocked_payments: options.block_payments ?? (options.action === "full_lockdown" || options.action === "block_payments"),
    activated_at: timestamp,
    activated_by: activatedBy,
    scheduled_reactivation: options.scheduled_reactivation,
    audit_trail: [
      {
        timestamp,
        action: "kill_switch_activated",
        actor_id: activatedBy,
        details: `Kill switch activated: ${options.action} - ${options.reason}`,
      },
    ],
  };
  
  // Use transaction to ensure atomicity of kill switch activation
  const session = await mongoose.connection.getClient().startSession();
  try {
    await session.withTransaction(async () => {
      // Persist kill switch event to database
      await db.collection(COLLECTIONS.KILL_SWITCH_EVENTS).insertOne(event, { session });
      
      // Update tenant status
      await db.collection(COLLECTIONS.ORGANIZATIONS).updateOne(
        { _id: tenantId },
        { 
          $set: { 
            status: "suspended",
            kill_switch_active: true,
            kill_switch_event_id: eventId,
            updatedAt: timestamp,
          }
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  
  logger.warn("Kill switch activated", {
    event_id: eventId.toString(),
    tenant_id: tenantId.toString(),
    action: options.action,
    severity: options.severity,
    reason: options.reason,
  });
  
  // In production:
  // 1. Invalidate all active sessions
  // 2. Send notifications if requested
  // 3. Trigger compliance logging
  
  return event;
}

/**
 * Deactivate kill switch
 * @param event - The kill switch event to deactivate
 * @param deactivatedBy - The user deactivating the kill switch
 * @param callerTenantId - The tenant ID of the caller (for ownership validation)
 * @param notes - Optional notes for the deactivation
 */
export async function deactivateKillSwitch(
  event: KillSwitchEvent,
  deactivatedBy: ObjectId,
  callerTenantId?: string,
  notes?: string
): Promise<KillSwitchEvent> {
  const db = await getDatabase();
  const timestamp = new Date();
  
  // Use atomic findOneAndUpdate with conditional filter to prevent races
  // Filter ensures: event exists, not already deactivated, and caller has access
  const filter: Record<string, unknown> = {
    _id: event._id,
    deactivated_at: { $exists: false },
  };
  
  // Add tenant ownership check if callerTenantId is provided
  if (callerTenantId) {
    filter.tenant_id = new ObjectId(callerTenantId);
  }
  
  const updateResult = await db.collection(COLLECTIONS.KILL_SWITCH_EVENTS).findOneAndUpdate(
    filter,
    {
      $set: {
        deactivated_at: timestamp,
        deactivated_by: deactivatedBy,
      },
      $push: {
        audit_trail: {
          timestamp,
          action: "kill_switch_deactivated",
          actor_id: deactivatedBy,
          details: notes ?? "Kill switch deactivated",
        },
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    { returnDocument: "after" }
  );
  
  if (!updateResult) {
    // Either not found, already deactivated, or access denied
    if (callerTenantId && event.tenant_id.toString() !== callerTenantId) {
      throw new Error(`Access denied: Cannot deactivate kill switch for different tenant`);
    }
    throw new Error(`Kill switch event ${event._id.toString()} is already deactivated or not found`);
  }
  
  // Restore tenant status in a transaction
  const session = await mongoose.connection.getClient().startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection(COLLECTIONS.ORGANIZATIONS).updateOne(
        { _id: event.tenant_id },
        {
          $set: {
            status: "active",
            kill_switch_active: false,
            updatedAt: timestamp,
          },
          $unset: {
            kill_switch_event_id: "",
          },
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  
  logger.info("Kill switch deactivated", {
    event_id: event._id.toString(),
    tenant_id: event.tenant_id.toString(),
    duration_minutes: Math.round((timestamp.getTime() - event.activated_at.getTime()) / 60000),
  });
  
  return updateResult as unknown as KillSwitchEvent;
}

function getDefaultBlockedFeatures(action: KillSwitchAction): string[] {
  switch (action) {
    case "full_lockdown":
      return ["*"]; // All features blocked
    case "suspend_access":
      return ["login", "dashboard", "work_orders", "reports"];
    case "read_only":
      return ["create", "update", "delete", "upload", "payment"];
    case "block_api":
      return ["api_v1", "api_v2", "webhooks", "integrations"];
    case "block_payments":
      return ["payment", "invoice_create", "subscription"];
    case "data_quarantine":
      return ["export", "download", "api_read", "reports"];
    default:
      return [];
  }
}

// =============================================================================
// TIME TRAVEL SERVICE
// =============================================================================

interface TimeTravelOptions {
  target_timestamp: Date;
  scope: TimeTravelScope;
  collections?: string[];
  preview_only?: boolean;
}

/**
 * Initiate time travel (point-in-time analysis/recovery)
 */
export async function initiateTimeTravel(
  tenantId: ObjectId,
  requestedBy: ObjectId,
  options: TimeTravelOptions
): Promise<TimeTravelRequest> {
  const db = await getDatabase();
  const requestId = new ObjectId();
  const timestamp = new Date();
  
  // Validate target timestamp
  const oldestAllowed = new Date();
  oldestAllowed.setDate(oldestAllowed.getDate() - 90); // 90 day retention
  
  if (options.target_timestamp < oldestAllowed) {
    throw new Error(`Time travel limited to last 90 days. Earliest available: ${oldestAllowed.toISOString()}`);
  }
  
  if (options.target_timestamp > timestamp) {
    throw new Error("Cannot time travel to the future");
  }
  
  // Preview expires after 1 hour
  const previewExpiry = new Date();
  previewExpiry.setHours(previewExpiry.getHours() + 1);
  
  const request: TimeTravelRequest = {
    _id: requestId,
    tenant_id: tenantId,
    target_timestamp: options.target_timestamp,
    scope: options.scope,
    collections: options.collections,
    status: "analyzing",
    preview_available: false,
    changes_detected: 0,
    requested_at: timestamp,
    requested_by: requestedBy,
    preview_expires_at: previewExpiry,
  };
  
  // Persist time travel request to database
  await db.collection(COLLECTIONS.TIME_TRAVEL_REQUESTS).insertOne(request);
  
  logger.info("Time travel initiated", {
    request_id: requestId.toString(),
    tenant_id: tenantId.toString(),
    target: options.target_timestamp.toISOString(),
    scope: options.scope,
  });
  
  // In production, this would:
  // 1. Query oplog/change streams for changes since target_timestamp
  // 2. Build a preview of what would be restored
  // 3. Calculate data diff
  
  return request;
}

/**
 * Execute time travel (restore to point in time)
 */
export async function executeTimeTravel(
  request: TimeTravelRequest,
  approvedBy: ObjectId
): Promise<TimeTravelRequest> {
  if (request.status !== "preview_ready" && request.status !== "pending_approval") {
    throw new Error(`Cannot execute time travel in status: ${request.status}`);
  }
  
  // Validate preview window has not expired
  if (request.preview_expires_at) {
    const expiresAt = new Date(request.preview_expires_at);
    if (expiresAt <= new Date()) {
      // Persist the expired status to database
      const db = await getDatabase();
      await db.collection(COLLECTIONS.TIME_TRAVEL_REQUESTS).updateOne(
        { _id: request._id },
        { $set: { status: "preview_expired", updatedAt: new Date() } }
      );
      return {
        ...request,
        status: "preview_expired",
      };
    }
  }
  
  const timestamp = new Date();
  
  // Create rollback snapshot first
  const rollbackSnapshot = await createSnapshot(request.tenant_id, approvedBy, {
    name: `Pre-time-travel backup (${timestamp.toISOString()})`,
    type: "pre_migration",
    expires_in_days: 7, // Keep for 7 days in case of issues
  });
  
  const updatedRequest: TimeTravelRequest = {
    ...request,
    status: "executing",
    rollback_snapshot_id: rollbackSnapshot._id,
    executed_at: timestamp,
  };
  
  // Persist the updated request to database
  const db = await getDatabase();
  await db.collection(COLLECTIONS.TIME_TRAVEL_REQUESTS).updateOne(
    { _id: request._id },
    {
      $set: {
        status: updatedRequest.status,
        rollback_snapshot_id: updatedRequest.rollback_snapshot_id,
        executed_at: updatedRequest.executed_at,
        approved_by: approvedBy,
      },
    }
  );
  
  logger.info("Time travel execution started", {
    request_id: request._id.toString(),
    tenant_id: request.tenant_id.toString(),
    rollback_snapshot: rollbackSnapshot._id.toString(),
  });
  
  // In production:
  // 1. Lock tenant (activate mild kill switch)
  // 2. Apply reverse operations from oplog
  // 3. Verify data integrity
  // 4. Unlock tenant
  
  return updatedRequest;
}

// =============================================================================
// GHOST MODE
// =============================================================================

export interface GhostSession {
  _id: ObjectId;
  admin_id: ObjectId;
  tenant_id: ObjectId;
  target_user_id?: ObjectId; // User to impersonate
  
  /** Session config */
  mode: "observe" | "impersonate" | "assist";
  permissions: GhostPermission[];
  
  /** Status */
  active: boolean;
  
  /** Audit */
  started_at: Date;
  ended_at?: Date;
  actions_performed: GhostAction[];
  
  /** Security */
  session_token: string;
  ip_address: string;
  user_agent: string;
}

export type GhostPermission =
  | "view_all"
  | "view_pii"
  | "view_financials"
  | "modify_data"
  | "modify_settings"
  | "create_records"
  | "delete_records";

export interface GhostAction {
  timestamp: Date;
  type: string;
  resource: string;
  resource_id?: string;
  details: string;
  ip_address: string;
}

/**
 * Start ghost mode session
 */
export async function startGhostSession(
  adminId: ObjectId,
  tenantId: ObjectId,
  options: {
    mode: GhostSession["mode"];
    target_user_id?: ObjectId;
    permissions: GhostPermission[];
    ip_address: string;
    user_agent: string;
  }
): Promise<{ session: GhostSession; token: string }> {
  const db = await getDatabase();
  const sessionId = new ObjectId();
  const plaintextToken = crypto.randomBytes(32).toString("hex");
  // Store only the hash of the token, not the plaintext
  const hashedToken = crypto.createHash("sha256").update(plaintextToken).digest("hex");
  
  const session: GhostSession = {
    _id: sessionId,
    admin_id: adminId,
    tenant_id: tenantId,
    target_user_id: options.target_user_id,
    mode: options.mode,
    permissions: options.permissions,
    active: true,
    started_at: new Date(),
    actions_performed: [],
    session_token: hashedToken, // Store hash, not plaintext
    ip_address: options.ip_address,
    user_agent: options.user_agent,
  };
  
  // Persist ghost session to database for audit and lifecycle tracking
  await db.collection(COLLECTIONS.GHOST_SESSIONS).insertOne(session);
  
  // Log without exposing token
  logger.warn("Ghost mode session started", {
    session_id: sessionId.toString(),
    admin_id: adminId.toString(),
    tenant_id: tenantId.toString(),
    mode: options.mode,
    permissions: options.permissions,
    // session_token intentionally excluded from logs
  });
  
  // Return session and plaintext token separately (token only returned once)
  return { session, token: plaintextToken };
}

/**
 * Log ghost mode action and persist to database
 */
export async function logGhostAction(
  session: GhostSession,
  action: Omit<GhostAction, "timestamp">
): Promise<GhostSession> {
  const db = await getDatabase();
  
  const loggedAction: GhostAction = {
    ...action,
    timestamp: new Date(),
  };
  
  const updatedSession: GhostSession = {
    ...session,
    actions_performed: [...session.actions_performed, loggedAction],
  };
  
  // Persist action to database
  await db.collection(COLLECTIONS.GHOST_SESSIONS).updateOne(
    { _id: session._id },
    {
      $push: { actions_performed: loggedAction },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MongoDB $push operator typing
    } as any
  );
  
  return updatedSession;
}

/**
 * End ghost mode session
 */
export async function endGhostSession(session: GhostSession): Promise<GhostSession> {
  const db = await getDatabase();
  const endedAt = new Date();
  
  const endedSession: GhostSession = {
    ...session,
    active: false,
    ended_at: endedAt,
  };
  
  // Persist session end to database
  // Note: Do NOT set actions_performed here - it would overwrite concurrent logGhostAction updates
  await db.collection(COLLECTIONS.GHOST_SESSIONS).updateOne(
    { _id: session._id },
    {
      $set: {
        active: false,
        ended_at: endedAt,
      },
    }
  );
  
  logger.info("Ghost mode session ended", {
    session_id: session._id.toString(),
    admin_id: session.admin_id.toString(),
    tenant_id: session.tenant_id.toString(),
    duration_minutes: Math.round((endedAt.getTime() - session.started_at.getTime()) / 60000),
    actions_count: session.actions_performed.length,
  });
  
  return endedSession;
}

// =============================================================================
// HEALTH MONITORING
// =============================================================================

export interface TenantHealth {
  tenant_id: ObjectId;
  checked_at: Date;
  
  /** Overall status */
  status: "healthy" | "degraded" | "critical" | "offline";
  score: number; // 0-100
  
  /** Component health */
  components: ComponentHealthStatus[];
  
  /** Recent incidents */
  active_incidents: number;
  recent_errors_24h: number;
  
  /** Performance */
  avg_response_time_ms: number;
  error_rate_percent: number;
  
  /** Usage */
  active_users_24h: number;
  api_requests_24h: number;
  storage_used_mb: number;
  storage_limit_mb: number;
}

export interface ComponentHealthStatus {
  name: string;
  status: "healthy" | "degraded" | "critical" | "unknown";
  latency_ms?: number;
  error_count?: number;
  last_check: Date;
}

/**
 * Calculate tenant health score
 */
export function calculateTenantHealth(metrics: {
  error_rate: number;
  avg_response_time_ms: number;
  uptime_percent: number;
  storage_usage_percent: number;
  active_incidents: number;
}): { score: number; status: TenantHealth["status"] } {
  let score = 100;
  
  // Error rate penalty (max 30 points)
  score -= Math.min(30, metrics.error_rate * 100);
  
  // Response time penalty (max 20 points)
  if (metrics.avg_response_time_ms > 500) {
    score -= Math.min(20, (metrics.avg_response_time_ms - 500) / 100);
  }
  
  // Uptime penalty (max 25 points)
  score -= Math.min(25, (100 - metrics.uptime_percent) * 5);
  
  // Storage penalty (max 15 points)
  if (metrics.storage_usage_percent > 80) {
    score -= Math.min(15, (metrics.storage_usage_percent - 80));
  }
  
  // Active incidents penalty (max 10 points)
  score -= Math.min(10, metrics.active_incidents * 5);
  
  score = Math.max(0, Math.round(score));
  
  let status: TenantHealth["status"];
  if (score >= 90) status = "healthy";
  else if (score >= 70) status = "degraded";
  else if (score >= 40) status = "critical";
  else status = "offline";
  
  return { score, status };
}
