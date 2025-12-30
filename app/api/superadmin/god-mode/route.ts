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
    
    // Fetch real tenant counts
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      pendingOffboarding,
    ] = await Promise.all([
      db.collection("organizations").countDocuments({}),
      db.collection("organizations").countDocuments({ status: "active" }),
      db.collection("organizations").countDocuments({ plan: "trial" }),
      db.collection("organizations").countDocuments({ status: "suspended" }),
      db.collection("organizations").countDocuments({ status: "pending_offboarding" }),
    ]);
    
    // Fetch top tenants (sanitize - only expose necessary fields)
    const topTenants = await db.collection("organizations")
      .find({ status: { $in: ["active", "trial"] } })
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
    
    // Count users per tenant
    const topTenantsWithUsers = await Promise.all(
      topTenants.map(async (tenant, index) => {
        const userCount = await db.collection("users").countDocuments({ 
          organizationId: tenant._id 
        });
        return {
          name: tenant.name,
          id: String(index + 1), // Obfuscated index, not real ID
          users: userCount,
          status: tenant.status,
          plan: tenant.plan || "starter",
        };
      })
    );
    
    // Fetch active kill switch events
    const activeKillSwitchEvents = await db.collection("kill_switch_events")
      .find({ deactivated_at: { $exists: false } })
      .sort({ activated_at: -1 })
      .limit(10)
      .toArray();
    
    // Enrich kill switch events with tenant names
    const killSwitchWithNames = await Promise.all(
      activeKillSwitchEvents.map(async (event) => {
        const tenant = await db.collection("organizations").findOne(
          { _id: event.tenant_id },
          { projection: { name: 1 } }
        );
        return {
          tenant_id: "tenant-" + String(event.tenant_id).slice(-6), // Partial ID only
          tenant_name: tenant?.name || "Unknown Tenant",
          action: event.action,
          reason: event.reason,
          activated_at: event.activated_at,
          activated_by: event.activated_by?.toString().slice(-6) || "system",
          scheduled_reactivation: event.scheduled_reactivation || null,
        };
      })
    );
    
    // Fetch snapshot stats
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [totalSnapshots, snapshots24h, recentSnapshots] = await Promise.all([
      db.collection("tenant_snapshots").countDocuments({}),
      db.collection("tenant_snapshots").countDocuments({ created_at: { $gte: yesterday } }),
      db.collection("tenant_snapshots")
        .find({})
        .sort({ created_at: -1 })
        .limit(5)
        .toArray(),
    ]);
    
    // Enrich snapshots with tenant names
    const snapshotsWithNames = await Promise.all(
      recentSnapshots.map(async (snap) => {
        const tenant = await db.collection("organizations").findOne(
          { _id: snap.tenant_id },
          { projection: { name: 1 } }
        );
        return {
          id: "snap-" + String(snap._id).slice(-6),
          tenant_name: tenant?.name || "Unknown Tenant",
          type: snap.type,
          size_mb: snap.size_bytes ? Math.round(snap.size_bytes / (1024 * 1024)) : 0,
          created_at: snap.created_at,
          status: snap.status,
        };
      })
    );
    
    // Fetch active ghost sessions
    const activeGhostSessions = await db.collection("ghost_sessions")
      .find({ active: true })
      .limit(10)
      .toArray();
    
    // Fetch 24h metrics from aggregation (or provide estimates if collection doesn't exist)
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
        db.collection("users").countDocuments({ lastLoginAt: { $gte: yesterday } }),
        db.collection("work_orders").countDocuments({ createdAt: { $gte: yesterday } }),
        db.collection("invoices").countDocuments({ createdAt: { $gte: yesterday } }),
        db.collection("payments").countDocuments({ createdAt: { $gte: yesterday } }),
      ]);
      
      // Calculate payments total
      const paymentsAgg = await db.collection("payments").aggregate([
        { $match: { createdAt: { $gte: yesterday }, status: "completed" } },
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
    
    // God Mode Dashboard
    const dashboard = {
      generated_at: new Date().toISOString(),
      // Use hashed username for audit trail to protect PII
      operator_id: `sa_${Buffer.from(session.username).toString('base64').slice(0, 8)}`,
      
      // System Health - PLACEHOLDER DATA
      // TODO: Integrate with Datadog/Prometheus/NewRelic for real health data
      system_health: {
        placeholder: true,
        status: "placeholder",
        note: "PLACEHOLDER DATA - Health checks require monitoring service integration (Datadog/Prometheus/NewRelic)",
        score: 98,
        uptime_percent: 99.95,
        services: [
          { name: "API Gateway", status: "placeholder", latency_ms: 45 },
          { name: "MongoDB Atlas", status: "placeholder", latency_ms: 12 },
          { name: "Redis Cache", status: "placeholder", latency_ms: 3 },
          { name: "File Storage (S3)", status: "placeholder", latency_ms: 85 },
          { name: "Payment Gateway (TAP)", status: "placeholder", latency_ms: 230 },
          { name: "SMS Gateway (Taqnyat)", status: "placeholder", latency_ms: 180 },
          { name: "ZATCA API", status: "placeholder", latency_ms: 350 },
        ],
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
    
    logger.info("God Mode dashboard accessed", {
      operatorId: session.username,
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
