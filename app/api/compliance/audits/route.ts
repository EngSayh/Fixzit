import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { UnauthorizedError } from "@/server/middleware/withAuthRbac";
import {
  setTenantContext,
  clearTenantContext,
} from "@/server/plugins/tenantIsolation";
import {
  setAuditContext,
  clearAuditContext,
} from "@/server/plugins/auditPlugin";
import { getClientIP } from "@/server/security/headers";
import ComplianceAudit from "@/server/models/ComplianceAudit";
import type {
  AuditStatus,
  AuditRiskLevel,
} from "@/server/models/ComplianceAudit";
import { UserRole, type UserRoleType } from "@/types/user";

const AuditStatuses: AuditStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "FOLLOW_UP",
  "COMPLETED",
];
const RiskLevels: AuditRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.AUDITOR,
]);

const AuditCreateSchema = z.object({
  name: z.string().min(1),
  owner: z.string().min(1),
  scope: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z
    .enum(AuditStatuses as [AuditStatus, ...AuditStatus[]])
    .default("PLANNED"),
  riskLevel: z
    .enum(RiskLevels as [AuditRiskLevel, ...AuditRiskLevel[]])
    .default("MEDIUM"),
  findings: z.number().min(0).optional(),
  openIssues: z.number().min(0).optional(),
  checklist: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  leadAuditor: z.string().min(1).optional(),
  supportingTeams: z.array(z.string().min(1)).optional(),
});

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
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status")?.toUpperCase();
  const riskFilter = url.searchParams.get("risk")?.toUpperCase();
  const search = url.searchParams.get("search")?.trim();
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 50;

  setTenantContext({ orgId: user.orgId });
  try {
    const filter: Record<string, unknown> = {};

    if (statusFilter && AuditStatuses.includes(statusFilter as AuditStatus)) {
      filter.status = statusFilter;
    }
    if (riskFilter && RiskLevels.includes(riskFilter as AuditRiskLevel)) {
      filter.riskLevel = riskFilter;
    }
    if (search) {
      // SECURITY: Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: new RegExp(escapedSearch, "i") },
        { owner: new RegExp(escapedSearch, "i") },
        { scope: new RegExp(escapedSearch, "i") },
        { tags: new RegExp(escapedSearch, "i") },
      ];
    }

    const [audits, total, inProgress, upcoming, completed, highRisk] =
      await Promise.all([
        ComplianceAudit.find(filter)
          .sort({ startDate: -1 })
          .limit(limit)
          .lean(),
        ComplianceAudit.countDocuments(),
        ComplianceAudit.countDocuments({ status: "IN_PROGRESS" }),
        ComplianceAudit.countDocuments({ status: "PLANNED" }),
        ComplianceAudit.countDocuments({ status: "COMPLETED" }),
        ComplianceAudit.countDocuments({ riskLevel: "HIGH" }),
      ]);

    return NextResponse.json({
      audits,
      stats: {
        total,
        upcoming,
        inProgress,
        completed,
        highRisk,
      },
      meta: {
        appliedFilters: {
          status: filter.status ?? "ALL",
          risk: filter.riskLevel ?? "ALL",
          search: search ?? null,
        },
      },
    });
  } catch (error) {
    logger.error("[compliance/audits] Failed to fetch audits", { error });
    return NextResponse.json(
      { error: "Failed to load audits" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
  }
}

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof AuditCreateSchema>;
  try {
    payload = AuditCreateSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.endDate < payload.startDate) {
    return NextResponse.json(
      { error: "End date must be after start date" },
      { status: 422 },
    );
  }

  await connectToDatabase();
  setTenantContext({ orgId: user.orgId });
  setAuditContext({
    userId: user.id,
    ipAddress: getClientIP(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
    timestamp: new Date(),
  });

  try {
    const audit = await ComplianceAudit.create({
      ...payload,
      checklist: payload.checklist ?? [],
      tags: payload.tags ?? [],
      supportingTeams: payload.supportingTeams ?? [],
    });

    return NextResponse.json({ audit }, { status: 201 });
  } catch (error) {
    logger.error("[compliance/audits] Failed to create audit", { error });
    return NextResponse.json(
      { error: "Failed to create audit plan" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
    clearAuditContext();
  }
}
