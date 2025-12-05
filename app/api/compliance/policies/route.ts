import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import {
  setAuditContext,
  clearAuditContext,
} from "@/server/plugins/auditPlugin";
import { getClientIP } from "@/server/security/headers";
import CompliancePolicy from "@/server/models/CompliancePolicy";
import type {
  CompliancePolicyCategory,
  CompliancePolicyStatus,
} from "@/server/models/CompliancePolicy";
import { UserRole, type UserRoleType } from "@/types/user";

const Statuses: CompliancePolicyStatus[] = [
  "DRAFT",
  "UNDER_REVIEW",
  "ACTIVE",
  "RETIRED",
];
const Categories: CompliancePolicyCategory[] = [
  "OPERATIONS",
  "FINANCE",
  "HR",
  "SAFETY",
  "COMPLIANCE",
  "VENDOR",
];
const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.AUDITOR,
]);

const PolicySchema = z.object({
  title: z.string().min(2),
  owner: z.string().min(1),
  summary: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  category: z
    .enum(
      Categories as [CompliancePolicyCategory, ...CompliancePolicyCategory[]],
    )
    .default("COMPLIANCE"),
  status: z
    .enum(Statuses as [CompliancePolicyStatus, ...CompliancePolicyStatus[]])
    .default("DRAFT"),
  version: z.string().min(1).default("1.0"),
  reviewFrequencyDays: z.number().min(30).max(720).default(365),
  effectiveFrom: z.coerce.date().optional(),
  reviewDate: z.coerce.date().optional(),
  tags: z.array(z.string().min(1)).optional(),
  relatedDocuments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        type: z.string().optional(),
      }),
    )
    .optional(),
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
  const categoryFilter = url.searchParams.get("category")?.toUpperCase();
  const search = url.searchParams.get("search")?.trim();
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 50;

  setTenantContext({ orgId: user.orgId });
  try {
    const filter: Record<string, unknown> = {};
    if (
      statusFilter &&
      Statuses.includes(statusFilter as CompliancePolicyStatus)
    ) {
      filter.status = statusFilter;
    }
    if (
      categoryFilter &&
      Categories.includes(categoryFilter as CompliancePolicyCategory)
    ) {
      filter.category = categoryFilter;
    }
    if (search) {
      // SECURITY: Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: new RegExp(escapedSearch, "i") },
        { owner: new RegExp(escapedSearch, "i") },
        { tags: new RegExp(escapedSearch, "i") },
      ];
    }

    const now = new Date();
    const [policies, activeCount, drafts, underReview, dueForReview] =
      await Promise.all([
        CompliancePolicy.find(filter)
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean(),
        CompliancePolicy.countDocuments({ status: "ACTIVE" }),
        CompliancePolicy.countDocuments({ status: "DRAFT" }),
        CompliancePolicy.countDocuments({ status: "UNDER_REVIEW" }),
        CompliancePolicy.countDocuments({
          status: { $in: ["ACTIVE", "UNDER_REVIEW"] },
          reviewDate: { $lte: now },
        }),
      ]);

    return NextResponse.json({
      policies,
      stats: {
        active: activeCount,
        drafts,
        underReview,
        dueForReview,
      },
      meta: {
        appliedFilters: {
          status: filter.status ?? "ALL",
          category: filter.category ?? "ALL",
          search: search ?? null,
        },
      },
    });
  } catch (error) {
    logger.error("[compliance/policies] Failed to fetch policies", error as Error);
    return NextResponse.json(
      { error: "Failed to load policies" },
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

  let payload: z.infer<typeof PolicySchema>;
  try {
    payload = PolicySchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
    const policy = await CompliancePolicy.create({
      ...payload,
      tags: payload.tags ?? [],
      relatedDocuments: payload.relatedDocuments ?? [],
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "Policy with this title already exists" },
        { status: 409 },
      );
    }
    logger.error("[compliance/policies] Failed to create policy", error as Error);
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
    clearAuditContext();
  }
}
