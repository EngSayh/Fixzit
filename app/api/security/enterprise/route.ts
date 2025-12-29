/**
 * Enterprise Security API
 * 
 * Security posture dashboard:
 * - Zero-Trust status
 * - MFA/WebAuthn enrollment
 * - PAM sessions
 * - Audit events
 * 
 * @route GET /api/security/enterprise
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    
    // Demo mode requires explicit environment flag AND no auth
    const isDemoEnabled = process.env.ENABLE_SECURITY_DEMO === "true";
    const isDemo = isDemoEnabled && !session?.user;
    
    // Require authentication unless demo mode is explicitly enabled
    if (!session?.user && !isDemo) {
      logger.warn("[security/enterprise] Unauthenticated access attempt", { reason: isDemoEnabled ? "demo_enabled_but_no_session" : "demo_disabled" });
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Authentication required" } },
        { status: 401 }
      );
    }
    
    // Skip authorization only in explicit demo mode
    if (!isDemo) {
      // Authorization: require super-admin privileges OR explicit security:read permission
      const user = session?.user as { role?: string; roles?: string[]; isSuperAdmin?: boolean } | undefined;
      if (!user) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-002", message: "Forbidden - User not found" } },
          { status: 403 }
        );
      }
      const isSuperAdmin = user.isSuperAdmin === true || user.role === "SUPER_ADMIN";
      const roles = (user.roles ?? []).map(r => r.toLowerCase());
      const hasSecurityPermission = roles.includes("security:read");
      const isAuthorized = isSuperAdmin || hasSecurityPermission;
      if (!isAuthorized) {
        logger.warn("[security/enterprise] Unauthorized access attempt", { userId: (session?.user as { id?: string })?.id });
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-002", message: "Forbidden - Super admin or security:read permission required" } },
          { status: 403 }
        );
      }
    }
    
    // Enterprise Security Dashboard
    const securityDashboard = {
      generated_at: new Date().toISOString(),
      is_demo: isDemo,
      org_id: isDemo ? "demo" : ((session?.user as { orgId?: string })?.orgId ?? "1"),
      
      // Zero-Trust Status
      zero_trust: {
        enabled: true,
        mode: "enforce" as const,
        score: 87,
        policies: {
          total: 12,
          active: 11,
          violations_24h: 3,
        },
        device_trust: {
          enrolled: 45,
          compliant: 42,
          non_compliant: 3,
        },
        network_segmentation: {
          enabled: true,
          microsegments: 8,
        },
      },
      
      // Authentication Status
      authentication: {
        mfa_enrollment_rate: 94.5,
        webauthn_enabled: true,
        webauthn_enrolled_users: 38,
        total_users: 45,
        passwordless_rate: 84.4,
        sso_configured: true,
        sso_provider: "Microsoft Entra ID",
        login_attempts_24h: {
          successful: 234,
          failed: 12,
          blocked: 3,
        },
      },
      
      // Privileged Access Management (PAM)
      pam: {
        jit_enabled: true,
        active_sessions: 2,
        sessions_24h: 15,
        avg_session_duration_min: 23,
        pending_requests: 1,
        recent_sessions: [
          {
            id: "pam-001",
            user: "user-001",
            resource: "Production Database",
            started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            status: "active",
          },
          {
            id: "pam-002",
            user: "user-002",
            resource: "Kubernetes Cluster",
            started_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
            expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            status: "expired",
          },
        ],
      },
      
      // Threat Detection
      threats: {
        severity_high: 0,
        severity_medium: 2,
        severity_low: 5,
        recent: [
          {
            id: "threat-001",
            type: "suspicious_login",
            severity: "medium",
            description: "Login from new location (Jeddah) for user user-003",
            detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: "investigating",
            ip_address: "41.xxx.xxx.xxx",
          },
          {
            id: "threat-002",
            type: "excessive_api_calls",
            severity: "low",
            description: "Unusual API call volume from service account",
            detected_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            status: "resolved",
          },
        ],
      },
      
      // Audit Log Summary
      audit: {
        events_24h: 1247,
        by_category: {
          authentication: 456,
          authorization: 234,
          data_access: 389,
          configuration: 45,
          admin_action: 123,
        },
        high_risk_events: 3,
        exported_reports: 2,
      },
      
      // Compliance Alignment
      compliance: {
        nca_security_controls: {
          implemented: 98,
          total: 108,
          percentage: 90.7,
        },
        iso27001_ready: true,
        soc2_status: "in_progress",
        last_audit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        next_audit: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
      
      // Quick Actions
      quick_actions: [
        { id: "view_audit_log", label: "View Full Audit Log", icon: "scroll" },
        { id: "revoke_sessions", label: "Revoke All Sessions", icon: "shield-off" },
        { id: "export_report", label: "Export Security Report", icon: "file-down" },
        { id: "threat_hunt", label: "Start Threat Hunt", icon: "search" },
        { id: "pam_request", label: "Request Privileged Access", icon: "key" },
      ],
    };
    
    logger.info("Enterprise security dashboard accessed", {
      userId: session?.user?.id ?? "demo",
      zero_trust_score: securityDashboard.zero_trust.score,
      threats_high: securityDashboard.threats.severity_high,
    });
    
    return NextResponse.json(securityDashboard);
  } catch (error) {
    logger.error("Failed to get security dashboard", { error });
    return NextResponse.json(
      { error: { code: "FIXZIT-API-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
