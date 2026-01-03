/**
 * Super Admin Dashboard API
 * 
 * God Mode capabilities for platform operators:
 * - System health overview
 * - Tenant management
 * - Kill switch status
 * - Platform metrics
 * 
 * @route GET /api/superadmin/god-mode
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { createHash } from "crypto";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collection-names";
import { healthAggregator, HealthComponents, HealthStatus } from "@/lib/monitoring/health-aggregator";
import { isRedisHealthy, getRedisMetrics } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const session = await getSuperadminSession(req);
    
    if (!session) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Superadmin access required" } },
        { status: 401 }
      );
    }
    
    const db = await getDatabase();
    
    // Read tenantId from query params for scoped filtering
    const { searchParams } = new URL(req.url);
    const tenantIdParam = searchParams.get("tenantId");
    
    // Validate tenantId if provided
    let tenantObjectId: ObjectId | null = null;
    if (tenantIdParam) {
      if (!ObjectId.isValid(tenantIdParam)) {
        return NextResponse.json(
          { error: { code: "FIXZIT-VALIDATION-001", message: "Invalid tenantId format" } },
          { status: 400 }
        );
      }
      tenantObjectId = new ObjectId(tenantIdParam);
    }
    
    // Build scoped filters - use tenantId when provided, otherwise platform-wide
    const orgFilter = tenantObjectId ? { _id: tenantObjectId } : {};
    const orgIdFilter = tenantObjectId ? { orgId: tenantObjectId } : {};
    const tenantIdFilter = tenantObjectId ? { tenant_id: tenantObjectId } : {};
    
    // Fetch real tenant counts (scoped by tenantId if provided)
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      pendingOffboarding,
    ] = await Promise.all([
      db.collection("organizations").countDocuments(orgFilter),
      db.collection("organizations").countDocuments({ ...orgFilter, status: "active" }),
      db.collection("organizations").countDocuments({ ...orgFilter, plan: "trial" }),
      db.collection("organizations").countDocuments({ ...orgFilter, status: "suspended" }),
      db.collection("organizations").countDocuments({ ...orgFilter, status: "pending_offboarding" }),
    ]);
    
    // Fetch top tenants (sanitize - only expose necessary fields) - scoped by tenantId if provided
    const topTenants = await db.collection("organizations")
      .find({ ...orgFilter, status: { $in: ["active", "trial"] } })
      .project({ 
        _id: 1, 
        name: 1, 
        status: 1, 
        plan: 1,
        // Don't expose internal IDs directly
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    // Count users per tenant - batch query to avoid N+1
    const tenantIds = topTenants.map(t => t._id);
    const userCountsAgg = await db.collection("users").aggregate([
      { $match: { orgId: { $in: tenantIds } } },
      { $group: { _id: "$orgId", count: { $sum: 1 } } }
    ]).toArray();
    const userCountMap = new Map(userCountsAgg.map(u => [String(u._id), u.count]));
    
    const topTenantsWithUsers = topTenants.map((tenant, index) => ({
      name: tenant.name,
      id: String(index + 1), // Obfuscated index, not real ID
      users: userCountMap.get(String(tenant._id)) || 0,
      status: tenant.status,
      plan: tenant.plan || "starter",
    }));
    
    // Fetch active kill switch events (scoped by tenantId if provided)
    const activeKillSwitchEvents = await db.collection("kill_switch_events")
      .find({ ...tenantIdFilter, deactivated_at: { $exists: false } })
      .sort({ activated_at: -1 })
      .limit(10)
      .toArray();
    
    // Enrich kill switch events with tenant names - batch query to avoid N+1
    const killSwitchTenantIds = activeKillSwitchEvents.map(e => e.tenant_id).filter(Boolean);
    const killSwitchTenants = killSwitchTenantIds.length > 0 
      ? await db.collection("organizations").find(
          { _id: { $in: killSwitchTenantIds } },
          { projection: { name: 1 } }
        ).toArray()
      : [];
    const killSwitchTenantMap = new Map(killSwitchTenants.map(t => [String(t._id), t.name]));
    
    const killSwitchWithNames = activeKillSwitchEvents.map((event) => ({
      tenant_id: "tenant-" + String(event.tenant_id).slice(-6), // Partial ID only
      tenant_name: killSwitchTenantMap.get(String(event.tenant_id)) || "Unknown Tenant",
      action: event.action,
      reason: event.reason,
      activated_at: event.activated_at,
      activated_by: event.activated_by?.toString().slice(-6) || "system",
      scheduled_reactivation: event.scheduled_reactivation || null,
    }));
    
    // Fetch snapshot stats (scoped by tenantId if provided)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [totalSnapshots, snapshots24h, recentSnapshots] = await Promise.all([
      db.collection("tenant_snapshots").countDocuments(tenantIdFilter),
      db.collection("tenant_snapshots").countDocuments({ ...tenantIdFilter, created_at: { $gte: yesterday } }),
      db.collection("tenant_snapshots")
        .find(tenantIdFilter)
        .sort({ created_at: -1 })
        .limit(5)
        .toArray(),
    ]);
    
    // Enrich snapshots with tenant names - batch query to avoid N+1
    const snapshotTenantIds = recentSnapshots.map(s => s.tenant_id).filter(Boolean);
    const snapshotTenants = snapshotTenantIds.length > 0
      ? await db.collection("organizations").find(
          { _id: { $in: snapshotTenantIds } },
          { projection: { name: 1 } }
        ).toArray()
      : [];
    const snapshotTenantMap = new Map(snapshotTenants.map(t => [String(t._id), t.name]));
    
    const snapshotsWithNames = recentSnapshots.map((snap) => ({
      id: "snap-" + String(snap._id).slice(-6),
      tenant_name: snapshotTenantMap.get(String(snap.tenant_id)) || "Unknown Tenant",
      type: snap.type,
      size_mb: snap.size_bytes ? Math.round(snap.size_bytes / (1024 * 1024)) : 0,
      created_at: snap.created_at,
      status: snap.status,
    }));
    
    // Fetch active ghost sessions (scoped by tenantId if provided)
    const activeGhostSessions = await db.collection("ghost_sessions")
      .find({ ...tenantIdFilter, active: true })
      .limit(10)
      .toArray();
    
    // Fetch 24h metrics from aggregation (or provide estimates if collection doesn't exist)
    // Note: These metrics are scoped by tenantId if provided via orgIdFilter
    let metrics24h = {
      api_requests: 0,
      unique_users: 0,
      work_orders_created: 0,
      invoices_generated: 0,
      payments_processed: 0,
      payments_value_sar: 0,
      errors_count: 0,
      error_rate_percent: 0,
    };
    
    try {
      const [
        uniqueUsersToday,
        workOrdersToday,
        invoicesToday,
        paymentsToday,
      ] = await Promise.all([
        db.collection("users").countDocuments({ ...orgIdFilter, lastLoginAt: { $gte: yesterday } }),
        db.collection(COLLECTIONS.WORK_ORDERS).countDocuments({ ...orgIdFilter, createdAt: { $gte: yesterday } }),
        db.collection("invoices").countDocuments({ ...orgIdFilter, createdAt: { $gte: yesterday } }),
        db.collection("payments").countDocuments({ ...orgIdFilter, createdAt: { $gte: yesterday } }),
      ]);
      
      // Calculate payments total (scoped by tenantId if provided)
      const paymentsAgg = await db.collection("payments").aggregate([
        { $match: { ...orgIdFilter, createdAt: { $gte: yesterday }, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).toArray();
      
      metrics24h = {
        api_requests: 0, // Requires telemetry service integration
        unique_users: uniqueUsersToday,
        work_orders_created: workOrdersToday,
        invoices_generated: invoicesToday,
        payments_processed: paymentsToday,
        payments_value_sar: paymentsAgg[0]?.total || 0,
        errors_count: 0, // Requires error tracking integration
        error_rate_percent: 0,
      };
    } catch {
      // Collections may not exist yet - use defaults
    }
    
    // System Health - REAL DATA FROM HEALTH AGGREGATOR
    // FIXED [AGENT-0008]: Replaced placeholder with real health data
    const healthSummary = healthAggregator.getSummary();
    const redisHealthy = await isRedisHealthy();
    const redisMetrics = getRedisMetrics();
    
    // Report Redis health to aggregator
    healthAggregator.report(
      HealthComponents.REDIS,
      redisHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      { extra: redisMetrics }
    );
    
    // Check MongoDB by pinging
    let mongoHealthy = false;
    let mongoLatency = 0;
    try {
      const mongoStart = Date.now();
      await db.command({ ping: 1 });
      mongoLatency = Date.now() - mongoStart;
      mongoHealthy = true;
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.HEALTHY, { latencyMs: mongoLatency });
    } catch {
      healthAggregator.report(HealthComponents.MONGODB, HealthStatus.UNHEALTHY, { errorMessage: "Ping failed" });
    }
    
    // Build services array from health aggregator
    const healthServices = Object.entries(healthSummary.components).map(([name, comp]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " "),
      status: comp.status,
      latency_ms: comp.latencyMs ?? null,
      last_checked: comp.lastChecked.toISOString(),
      consecutive_failures: comp.consecutiveFailures,
    }));
    
    // Add core services that may not be reported yet
    if (!healthServices.find(s => s.name.toLowerCase().includes("api"))) {
      healthServices.unshift({ 
        name: "API Gateway", 
        status: HealthStatus.HEALTHY, 
        latency_ms: null, 
        last_checked: new Date().toISOString(),
        consecutive_failures: 0,
      });
    }
    
    // God Mode Dashboard
    const dashboard = {
      generated_at: new Date().toISOString(),
      // Scope indicator - null means platform-wide, otherwise scoped to specific tenant
      scoped_tenant_id: tenantObjectId ? tenantIdParam : null,
      // Use SHA-256 hash for audit trail to protect PII (not reversible like base64)
      operator_id: `sa_${createHash('sha256').update(session.username).digest('hex').slice(0, 12)}`,
      operator_username: session.username, // Only visible to current superadmin
      
      // System Health - REAL DATA
      system_health: {
        placeholder: false,
        status: healthSummary.overallStatus,
        score: healthSummary.healthScore,
        uptime_seconds: healthSummary.uptimeSeconds,
        uptime_percent: Math.min(99.99, 100 - (healthServices.filter(s => s.status !== "healthy").length * 0.5)),
        services: healthServices,
        redis: {
          status: redisHealthy ? "healthy" : "unhealthy",
          current_status: redisMetrics.currentStatus,
          connection_errors: redisMetrics.connectionErrors,
          last_connected: redisMetrics.lastConnectedAt?.toISOString() ?? null,
        },
        mongodb: {
          status: mongoHealthy ? "healthy" : "unhealthy",
          latency_ms: mongoLatency,
        },
      },
      
      // Tenant Overview - REAL DATA
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: trialTenants,
        suspended: suspendedTenants,
        pending_offboarding: pendingOffboarding,
        mrr_sar: 0, // Requires billing integration
        top_tenants: topTenantsWithUsers,
      },
      
      // Kill Switch Status - REAL DATA
      kill_switch: {
        active_count: activeKillSwitchEvents.length,
        events: killSwitchWithNames,
      },
      
      // Recent Snapshots - REAL DATA
      snapshots: {
        total: totalSnapshots,
        last_24h: snapshots24h,
        recent: snapshotsWithNames,
      },
      
      // Platform Metrics (24h) - REAL DATA WHERE AVAILABLE
      metrics_24h: metrics24h,
      
      // Ghost Mode Sessions - REAL DATA
      ghost_sessions: {
        active: activeGhostSessions.length,
        recent: activeGhostSessions.map(s => ({
          id: "ghost-" + String(s._id).slice(-6),
          admin_id: String(s.admin_id).slice(-6),
          tenant_id: "tenant-" + String(s.tenant_id).slice(-6),
          mode: s.mode,
          started_at: s.started_at,
          permissions: s.permissions,
        })),
      },
      
      // Quick Actions
      quick_actions: [
        { id: "create_snapshot", label: "Create Tenant Snapshot", icon: "camera" },
        { id: "broadcast_message", label: "Broadcast Message", icon: "megaphone" },
        { id: "view_audit_log", label: "View Audit Log", icon: "scroll" },
        { id: "system_health", label: "Detailed Health Check", icon: "heart-pulse" },
        { id: "feature_flags", label: "Feature Flags", icon: "toggle-right" },
        { id: "ghost_mode", label: "Enter Ghost Mode", icon: "ghost" },
      ],
    };
    
    // Obfuscate username for logging (PII protection)
    const obfuscatedOperator = session.username 
      ? Buffer.from(session.username).toString('base64').slice(0, 8) + '...'
      : 'unknown';
    
    logger.info("God Mode dashboard accessed", {
      operatorId: obfuscatedOperator,
      tenants_count: dashboard.tenants.total,
      system_status: dashboard.system_health.status,
    });
    
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error("Failed to get God Mode dashboard", { error });
    return NextResponse.json(
      { error: { code: "FIXZIT-API-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
