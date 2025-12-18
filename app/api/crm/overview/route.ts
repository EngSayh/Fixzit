"use server";

/**
 * @fileoverview CRM Overview Dashboard API
 * @description Provides aggregated CRM statistics and metrics for dashboard
 * display including pipeline value, lead counts, and top accounts.
 * 
 * @module api/crm/overview
 * @requires SUPER_ADMIN, CORPORATE_ADMIN, ADMIN, MANAGER, OWNER, or SUPPORT_AGENT role
 * 
 * @endpoints
 * - GET /api/crm/overview - Fetch CRM dashboard statistics
 * 
 * @response
 * - totalLeads: Total number of leads
 * - openPipeline: Value of open opportunities
 * - wonDeals: Number of closed-won deals
 * - stageCounts: Breakdown by pipeline stage
 * - topAccounts: Top accounts by value
 * - recentActivity: Activities from last 7 days
 * 
 * @security
 * - RBAC: Admin, management, owner, and support roles
 * - PHASE-3: FM/Property-specific roles excluded (no CRM use case)
 * - Tenant-scoped: All aggregations filtered by orgId
 * - CRM-001 FIX: Multi-tenant isolation enforced
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import {
  getSessionUser,
  UnauthorizedError,
} from "@/server/middleware/withAuthRbac";
import {
  setTenantContext,
  clearTenantContext,
} from "@/server/plugins/tenantIsolation";
import CrmLead from "@/server/models/CrmLead";
import CrmActivity from "@/server/models/CrmActivity";
import { UserRole, type UserRoleType } from "@/types/user";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// PHASE-3 FIX: CRM access aligned with STRICT v4.1 canonical matrix
// CRM should be accessible to: Super Admin, Admin/Corporate Admin, Team Members, Corporate Owner
// NOT to: Technician, Tenant, Vendor (they have no CRM use case)
const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER, // Maps to TEAM_MEMBER in FM domain
  UserRole.OWNER, // CORPORATE_OWNER - may need CRM for customer management
  UserRole.SUPPORT_AGENT, // CRM access for support
  // PHASE-3: Explicitly exclude FM/Property-specific roles
  // UserRole.FM_MANAGER - NO CRM access
  // UserRole.PROPERTY_MANAGER - NO CRM access
  // UserRole.TECHNICIAN - NO CRM access
  // UserRole.TENANT - NO CRM access
  // UserRole.VENDOR - NO CRM access
]);

function isUnauthenticatedError(error: unknown): boolean {
  return (
    error instanceof UnauthorizedError ||
    (error instanceof Error &&
      error.message.toLowerCase().includes("unauthenticated"))
  );
}

async function resolveUser(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const normalizedRole = typeof user?.role === "string"
      ? (user.role.toUpperCase() as UserRoleType)
      : (user?.roles?.[0]?.toUpperCase() as UserRoleType | undefined);

    if (!user || !user.orgId || !normalizedRole || !ALLOWED_ROLES.has(normalizedRole)) {
      return null;
    }

    // Return user with normalized role to avoid case/alias drift
    return { ...user, role: normalizedRole };
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return null;
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "crm-overview",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  setTenantContext({ orgId: user.orgId });
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // CRM-001 FIX: All queries MUST be org-scoped per STRICT v4 multi-tenant isolation
    // Without orgId filter, aggregations expose cross-org CRM data
    const orgFilter = { orgId: user.orgId };

    const [
      totalLeads,
      openPipeline,
      wonDeals,
      stageCounts,
      topAccounts,
      activities,
      recentCalls,
      recentEmails,
    ] = await Promise.all([
      // CRM-001 FIX: Add orgId to all countDocuments and aggregations
      CrmLead.countDocuments({ ...orgFilter, kind: "LEAD" }),
      // AUDIT-2025-12-19: Added maxTimeMS to aggregates
      CrmLead.aggregate([
        { $match: { ...orgFilter, kind: "LEAD", status: "OPEN" } },
        {
          $group: { _id: null, total: { $sum: "$value" }, count: { $sum: 1 } },
        },
      ], { maxTimeMS: 10_000 }),
      CrmLead.countDocuments({ ...orgFilter, status: "WON" }),
      CrmLead.aggregate([
        { $match: orgFilter }, // CRM-001 FIX: Scope stage aggregation to org
        { $group: { _id: "$stage", total: { $sum: 1 } } },
      ], { maxTimeMS: 10_000 }),
      CrmLead.find({ ...orgFilter, kind: "ACCOUNT" }).sort({ revenue: -1 }).limit(5).lean(),
      CrmActivity.find(orgFilter).sort({ performedAt: -1 }).limit(6).lean(),
      CrmActivity.countDocuments({
        ...orgFilter,
        type: "CALL",
        performedAt: { $gte: sevenDaysAgo },
      }),
      CrmActivity.countDocuments({
        ...orgFilter,
        type: "EMAIL",
        performedAt: { $gte: sevenDaysAgo },
      }),
    ]);

    const pipelineTotal = openPipeline[0]?.total ?? 0;
    const pipelineCount = openPipeline[0]?.count ?? 0;
    const avgDealSize =
      pipelineCount > 0 ? Math.round(pipelineTotal / pipelineCount) : 0;
    const conversionRate =
      totalLeads > 0 ? Number(((wonDeals / totalLeads) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      totals: {
        leads: totalLeads,
        pipelineValue: pipelineTotal,
        avgDealSize,
        conversionRate,
        activeAccounts: topAccounts.length,
      },
      stages: stageCounts.map((entry) => ({
        stage: entry._id,
        total: entry.total,
      })),
      topAccounts: topAccounts.map((account) => ({
        id: account._id,
        company: account.company,
        revenue: account.revenue ?? 0,
        segment: account.segment ?? null,
        owner: account.owner ?? null,
        notes: account.notes ?? null,
      })),
      recentActivities: activities.map((activity) => ({
        id: activity._id,
        type: activity.type,
        summary: activity.summary,
        performedAt: activity.performedAt,
        contactName: activity.contactName ?? null,
        company: activity.company ?? null,
        leadStage: activity.leadStageSnapshot ?? null,
      })),
      activityCounters: {
        calls7d: recentCalls,
        emails7d: recentEmails,
      },
    });
  } catch (error) {
    logger.error("[crm/overview] Failed to load dashboard data", error as Error);
    return NextResponse.json(
      { error: "Failed to load CRM overview" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
  }
}
