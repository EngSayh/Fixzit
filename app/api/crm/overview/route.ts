"use server";

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

const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.EMPLOYEE,
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
    if (!user || !user.orgId || !ALLOWED_ROLES.has(user.role)) {
      return null;
    }
    return user;
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return null;
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  setTenantContext({ orgId: user.orgId });
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
      CrmLead.countDocuments({ kind: "LEAD" }),
      CrmLead.aggregate([
        { $match: { kind: "LEAD", status: "OPEN" } },
        {
          $group: { _id: null, total: { $sum: "$value" }, count: { $sum: 1 } },
        },
      ]),
      CrmLead.countDocuments({ status: "WON" }),
      CrmLead.aggregate([{ $group: { _id: "$stage", total: { $sum: 1 } } }]),
      CrmLead.find({ kind: "ACCOUNT" }).sort({ revenue: -1 }).limit(5).lean(),
      CrmActivity.find().sort({ performedAt: -1 }).limit(6).lean(),
      CrmActivity.countDocuments({
        type: "CALL",
        performedAt: { $gte: sevenDaysAgo },
      }),
      CrmActivity.countDocuments({
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
    logger.error("[crm/overview] Failed to load dashboard data", { error });
    return NextResponse.json(
      { error: "Failed to load CRM overview" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
  }
}
