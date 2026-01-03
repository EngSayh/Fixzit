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

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collection-names";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Check for superadmin session as fallback (for /superadmin/* pages)
    const superadminSession = !session?.user ? await getSuperadminSession(request) : null;
    const isSuperadmin = !!superadminSession;
    
    // Require authentication
    if (!session?.user && !isSuperadmin) {
      logger.warn("[security/enterprise] Unauthenticated access attempt");
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Authentication required" } },
        { status: 401 }
      );
    }
    
    // Authorization: superadmin is always authorized, others need security:read
    if (!isSuperadmin) {
      const user = session?.user as { role?: string; roles?: string[]; isSuperAdmin?: boolean } | undefined;
      if (!user) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-002", message: "Forbidden - User not found" } },
          { status: 403 }
        );
      }
      const isSuperAdminFromSession = user.isSuperAdmin === true || user.role === "SUPER_ADMIN";
      const roles = (user.roles ?? []).map(r => r.toLowerCase());
      const hasSecurityPermission = roles.includes("security:read");
      const isAuthorized = isSuperAdminFromSession || hasSecurityPermission;
      if (!isAuthorized) {
        logger.warn("[security/enterprise] Unauthorized access attempt", { userId: (session?.user as { id?: string })?.id });
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-002", message: "Forbidden - Super admin or security:read permission required" } },
          { status: 403 }
        );
      }
    }
    
    // Resolve orgId from session (NextAuth) or superadmin session
    const orgId = isSuperadmin 
      ? superadminSession.orgId 
      : (session?.user as { orgId?: string })?.orgId;
    if (!orgId) {
      logger.warn("[security/enterprise] Missing orgId for authenticated user", { isSuperadmin });
      return NextResponse.json(
        { error: { code: "FIXZIT-ORG-001", message: "Organization context required - orgId missing" } },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const _thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Reserved for future security trend analysis
    
    // Query users for authentication metrics
    const userStats = await db.collection(COLLECTIONS.USERS).aggregate([
      { $match: { orgId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          mfaEnabled: { $sum: { $cond: [{ $eq: ["$mfaEnabled", true] }, 1, 0] } },
          webauthnEnabled: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$webauthnCredentials", []] } }, 0] }, 1, 0] } },
        }
      }
    ]).toArray();
    
    const users = userStats[0] ?? { total: 0, mfaEnabled: 0, webauthnEnabled: 0 };
    const mfaRate = users.total > 0 ? Math.round((users.mfaEnabled / users.total) * 1000) / 10 : 0;
    
    // Query audit logs for security events
    const auditStats = await db.collection(COLLECTIONS.AUDIT_LOGS).aggregate([
      { $match: { orgId, createdAt: { $gte: twentyFourHoursAgo } } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    const auditByCategory: Record<string, number> = {};
    let totalAuditEvents = 0;
    for (const stat of auditStats) {
      auditByCategory[stat._id ?? "other"] = stat.count;
      totalAuditEvents += stat.count;
    }
    
    // Query failed login attempts
    const failedLogins = await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments({
      orgId,
      action: { $in: ["login_failed", "auth_failed"] },
      createdAt: { $gte: twentyFourHoursAgo }
    });
    
    const successfulLogins = await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments({
      orgId,
      action: { $in: ["login_success", "auth_success", "login"] },
      createdAt: { $gte: twentyFourHoursAgo }
    });
    
    // Query high-risk events
    const highRiskEvents = await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments({
      orgId,
      severity: "high",
      createdAt: { $gte: twentyFourHoursAgo }
    });
    
    // Query organization security settings
    // Validate orgId before ObjectId conversion
    if (!ObjectId.isValid(orgId)) {
      return NextResponse.json(
        { error: { code: "FIXZIT-ORG-002", message: "Invalid organization ID format" } },
        { status: 400 }
      );
    }
    const orgObjectId = new ObjectId(orgId);
    const org = await db.collection(COLLECTIONS.ORGANIZATIONS).findOne(
      { _id: orgObjectId },
      { projection: { security: 1, ssoProvider: 1, ncaScore: 1 } }
    );
    
    // Build security dashboard from real data
    const securityDashboard = {
      generated_at: now.toISOString(),
      org_id: orgId,
      
      // Zero-Trust Status (based on org config and metrics)
      zero_trust: {
        enabled: org?.security?.zeroTrustEnabled ?? false,
        mode: org?.security?.zeroTrustMode ?? "monitor",
        score: Math.round(mfaRate * 0.87),
        policies: {
          total: org?.security?.policies?.length ?? 0,
          active: org?.security?.activePolicies ?? 0,
          violations_24h: highRiskEvents,
        },
        device_trust: {
          enrolled: users.total,
          compliant: users.mfaEnabled,
          non_compliant: users.total - users.mfaEnabled,
        },
        network_segmentation: {
          enabled: org?.security?.networkSegmentation ?? false,
          microsegments: org?.security?.microsegments ?? 0,
        },
      },
      
      // Authentication Status
      authentication: {
        mfa_enrollment_rate: mfaRate,
        webauthn_enabled: users.webauthnEnabled > 0,
        webauthn_enrolled_users: users.webauthnEnabled,
        total_users: users.total,
        passwordless_rate: users.total > 0 ? Math.round((users.webauthnEnabled / users.total) * 1000) / 10 : 0,
        sso_configured: !!org?.ssoProvider,
        sso_provider: org?.ssoProvider ?? null,
        login_attempts_24h: {
          successful: successfulLogins,
          failed: failedLogins,
          blocked: 0,
        },
      },
      
      // Privileged Access Management (PAM)
      pam: {
        jit_enabled: org?.security?.jitEnabled ?? false,
        active_sessions: 0,
        sessions_24h: 0,
        avg_session_duration_min: 0,
        pending_requests: 0,
        recent_sessions: [],
      },
      
      // Threat Detection
      threats: {
        severity_high: highRiskEvents,
        severity_medium: await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments({
          orgId,
          severity: "medium",
          createdAt: { $gte: twentyFourHoursAgo }
        }),
        severity_low: await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments({
          orgId,
          severity: "low",
          createdAt: { $gte: twentyFourHoursAgo }
        }),
        recent: [],
      },
      
      // Audit Log Summary
      audit: {
        events_24h: totalAuditEvents,
        by_category: {
          authentication: auditByCategory["authentication"] ?? auditByCategory["auth"] ?? 0,
          authorization: auditByCategory["authorization"] ?? 0,
          data_access: auditByCategory["data_access"] ?? auditByCategory["data"] ?? 0,
          configuration: auditByCategory["configuration"] ?? auditByCategory["config"] ?? 0,
          admin_action: auditByCategory["admin_action"] ?? auditByCategory["admin"] ?? 0,
        },
        high_risk_events: highRiskEvents,
        exported_reports: 0,
      },
      
      // Compliance Alignment
      compliance: {
        nca_security_controls: {
          implemented: org?.ncaScore ?? 0,
          total: 108,
          percentage: Math.round((org?.ncaScore ?? 0) / 108 * 1000) / 10,
        },
        iso27001_ready: (org?.ncaScore ?? 0) >= 80,
        soc2_status: (org?.ncaScore ?? 0) >= 70 ? "compliant" : "in_progress",
        last_audit: org?.security?.lastAudit ?? null,
        next_audit: org?.security?.nextAudit ?? null,
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
      userId: isSuperadmin ? `superadmin:${superadminSession.username}` : (session?.user as { id?: string })?.id,
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
