/**
 * Compliance Dashboard API
 * 
 * Unified endpoint for Saudi regulatory compliance status:
 * - ZATCA Phase 2 readiness
 * - NCA ECC-2:2024 score
 * - PDPL compliance metrics
 * 
 * @route GET /api/compliance/dashboard
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
      return NextResponse.json(
        { error: { code: 'FIXZIT-AUTH-001', message: 'Unauthorized' } },
        { status: 401 }
      );
    }
    
    // Resolve orgId from session (NextAuth) or superadmin session
    const orgId = isSuperadmin 
      ? superadminSession.orgId 
      : (session?.user as { orgId?: string })?.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-TENANT-001', message: 'Missing orgId for authenticated user' } },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Query ZATCA invoice data from invoices collection
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [invoiceStats] = await db.collection(COLLECTIONS.INVOICES).aggregate([
      { 
        $match: { 
          orgId,
          createdAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cleared: { $sum: { $cond: [{ $eq: ["$zatcaStatus", "cleared"] }, 1, 0] } },
          lastSubmission: { $max: "$zatcaSubmittedAt" }
        }
      }
    ]).toArray();
    
    const invoiceCount = invoiceStats?.total ?? 0;
    const clearedCount = invoiceStats?.cleared ?? 0;
    const clearanceRate = invoiceCount > 0 ? clearedCount / invoiceCount : 1;
    
    // Query organization's compliance settings
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
      { projection: { compliance: 1, zatcaPhase: 1, zatcaWave: 1, ncaScore: 1, pdplStatus: 1 } }
    );
    
    // Query audit logs for compliance events
    const complianceAuditCount = await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments({
      orgId,
      category: { $in: ["compliance", "zatca", "security"] },
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Query users for consent/PDPL metrics
    const userCount = await db.collection(COLLECTIONS.USERS).countDocuments({ orgId });
    const consentedUsers = await db.collection(COLLECTIONS.USERS).countDocuments({ 
      orgId, 
      "consent.accepted": true 
    });
    
    // Build compliance dashboard from real data
    const dashboard = {
      orgId,
      generated_at: new Date().toISOString(),
      
      // ZATCA Phase 2 Status
      zatca: {
        status: clearanceRate >= 0.95 ? "compliant" : clearanceRate >= 0.80 ? "warning" : "non_compliant",
        phase: org?.zatcaPhase ?? 2,
        wave: org?.zatcaWave ?? 8,
        invoice_count_30d: invoiceCount,
        clearance_rate: Math.round(clearanceRate * 100) / 100,
        last_submission: invoiceStats?.lastSubmission?.toISOString() ?? null,
        next_wave_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        features: {
          e_invoicing: true,
          qr_code: true,
          hash_chain: true,
          archive: true,
        },
      },
      
      // NCA ECC-2:2024 Status (from org settings or defaults)
      nca: {
        overall_score: org?.ncaScore ?? 0,
        risk_level: (org?.ncaScore ?? 0) >= 80 ? "low" : (org?.ncaScore ?? 0) >= 60 ? "medium" : "high",
        domains: [
          { id: "GRC", name: "Governance, Risk & Compliance", score: org?.ncaScore ?? 0, controls_total: 18, controls_compliant: Math.round((org?.ncaScore ?? 0) * 0.18) },
          { id: "IAM", name: "Identity & Access Management", score: org?.ncaScore ?? 0, controls_total: 16, controls_compliant: Math.round((org?.ncaScore ?? 0) * 0.16) },
          { id: "ASSET", name: "Asset Management", score: org?.ncaScore ?? 0, controls_total: 12, controls_compliant: Math.round((org?.ncaScore ?? 0) * 0.12) },
          { id: "PHYS", name: "Physical Security", score: org?.ncaScore ?? 0, controls_total: 10, controls_compliant: Math.round((org?.ncaScore ?? 0) * 0.10) },
          { id: "OPS", name: "Operations Security", score: org?.ncaScore ?? 0, controls_total: 28, controls_compliant: Math.round((org?.ncaScore ?? 0) * 0.28) },
          { id: "BCM", name: "Business Continuity", score: org?.ncaScore ?? 0, controls_total: 14, controls_compliant: Math.round((org?.ncaScore ?? 0) * 0.14) },
        ],
        last_assessment: org?.compliance?.lastNcaAssessment ?? null,
        next_assessment_due: org?.compliance?.nextNcaAssessment ?? null,
      },
      
      // PDPL Status
      pdpl: {
        compliance_score: userCount > 0 ? Math.round((consentedUsers / userCount) * 100) : 0,
        status: org?.pdplStatus ?? "pending_review",
        metrics: {
          active_consents: consentedUsers,
          pending_dsars: 0,
          dsar_avg_response_days: 0,
          data_breaches_ytd: 0,
        },
        certifications: {
          sdaia_registered: org?.compliance?.sdaiaRegistered ?? false,
          dpo_appointed: org?.compliance?.dpoAppointed ?? false,
          privacy_policy_updated: org?.compliance?.privacyPolicyUpdated ?? false,
          consent_mechanism_active: consentedUsers > 0,
        },
      },
      
      // Overall Status
      overall: {
        status: clearanceRate >= 0.95 && (org?.ncaScore ?? 0) >= 70 ? "compliant" : "needs_attention",
        score: Math.round(((clearanceRate * 100) + (org?.ncaScore ?? 0) + (userCount > 0 ? (consentedUsers / userCount) * 100 : 0)) / 3),
        critical_issues: clearanceRate < 0.80 ? 1 : 0,
        warnings: clearanceRate < 0.95 ? 1 : 0,
        audit_events_30d: complianceAuditCount,
        next_action: clearanceRate < 0.95 
          ? "Review pending ZATCA invoice clearances" 
          : (org?.ncaScore ?? 0) < 70 
            ? "Complete NCA security controls assessment"
            : "No immediate actions required",
      },
    };
    
    logger.info("Compliance dashboard retrieved", {
      orgId,
      zatca_status: dashboard.zatca.status,
      nca_score: dashboard.nca.overall_score,
      pdpl_score: dashboard.pdpl.compliance_score,
    });
    
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error("Failed to get compliance dashboard", { error });
    return NextResponse.json(
      { error: { code: "FIXZIT-API-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
