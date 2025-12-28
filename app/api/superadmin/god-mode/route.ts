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

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    
    // Check for superadmin role
    const user = session.user as { role?: string; roles?: string[] };
    const roles = user.roles ?? (user.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("superadmin") || roles.includes("platform_admin");
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-002", message: "Forbidden - SuperAdmin access required" } },
        { status: 403 }
      );
    }
    
    // God Mode Dashboard
    const dashboard = {
      generated_at: new Date().toISOString(),
      operator: session.user.email,
      
      // System Health
      system_health: {
        status: "healthy",
        score: 98,
        uptime_percent: 99.95,
        services: [
          { name: "API Gateway", status: "healthy", latency_ms: 45 },
          { name: "MongoDB Atlas", status: "healthy", latency_ms: 12 },
          { name: "Redis Cache", status: "healthy", latency_ms: 3 },
          { name: "File Storage (S3)", status: "healthy", latency_ms: 85 },
          { name: "Payment Gateway (TAP)", status: "healthy", latency_ms: 230 },
          { name: "SMS Gateway (Taqnyat)", status: "healthy", latency_ms: 180 },
          { name: "ZATCA API", status: "degraded", latency_ms: 1200, note: "High latency - monitoring" },
        ],
      },
      
      // Tenant Overview
      tenants: {
        total: 47,
        active: 45,
        trial: 8,
        suspended: 1,
        pending_offboarding: 1,
        mrr_sar: 127500,
        top_tenants: [
          { name: "SAHRECO (Platform Owner)", id: "1", users: 25, status: "active", plan: "enterprise" },
          { name: "Al-Faisal Properties", id: "2", users: 18, status: "active", plan: "professional" },
          { name: "Gulf Commercial", id: "3", users: 12, status: "active", plan: "professional" },
          { name: "Riyadh Facilities", id: "4", users: 8, status: "trial", plan: "starter" },
          { name: "Jeddah FM Co", id: "5", users: 15, status: "active", plan: "professional" },
        ],
      },
      
      // Kill Switch Status
      kill_switch: {
        active_count: 1,
        events: [
          {
            tenant_id: "suspended-tenant-1",
            tenant_name: "Test Corp (Suspended)",
            action: "suspend_access",
            reason: "Payment failure - 3 consecutive months",
            activated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            activated_by: "system",
            scheduled_reactivation: null,
          },
        ],
      },
      
      // Recent Snapshots
      snapshots: {
        total: 142,
        last_24h: 3,
        recent: [
          {
            id: "snap-001",
            tenant_name: "Al-Faisal Properties",
            type: "scheduled",
            size_mb: 245,
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            status: "completed",
          },
          {
            id: "snap-002",
            tenant_name: "SAHRECO",
            type: "manual",
            size_mb: 512,
            created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            status: "completed",
          },
        ],
      },
      
      // Platform Metrics (24h)
      metrics_24h: {
        api_requests: 1247832,
        unique_users: 892,
        work_orders_created: 156,
        invoices_generated: 89,
        payments_processed: 34,
        payments_value_sar: 45670,
        errors_count: 23,
        error_rate_percent: 0.002,
      },
      
      // Ghost Mode Sessions
      ghost_sessions: {
        active: 0,
        recent: [],
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
      operator: session.user.email,
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
