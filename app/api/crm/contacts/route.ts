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
import CrmLead from "@/server/models/CrmLead";
import type { CrmLeadKind } from "@/server/models/CrmLead";
import { UserRole, type UserRoleType } from "@/types/user";

const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  // Note: EMPLOYEE deprecated in STRICT v4 - MANAGER covers this use case
]);

const LeadSchema = z.object({
  type: z.enum(["LEAD", "ACCOUNT"]).default("LEAD"),
  contact: z.string().min(1).optional(),
  company: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  segment: z.string().optional(),
  revenue: z.number().nonnegative().optional(),
  employees: z.number().int().nonnegative().optional(),
  source: z.string().optional(),
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

function estimateValue(
  kind: CrmLeadKind,
  revenue?: number,
  employees?: number,
) {
  if (revenue && revenue > 0) {
    return Math.max(Math.round(revenue * 0.15), 5000);
  }
  if (employees && employees > 0) {
    return Math.max(employees * 1000, 10000);
  }
  return kind === "ACCOUNT" ? 75000 : 25000;
}

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const url = new URL(req.url);
  const kind = url.searchParams.get("type")?.toUpperCase();
  const limitParam = Number(url.searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 25;
  const search = url.searchParams.get("search")?.trim();

  const filter: Record<string, unknown> = {};
  if (kind && (kind === "LEAD" || kind === "ACCOUNT")) {
    filter.kind = kind;
  }
  if (search) {
    filter.$or = [
      { company: new RegExp(search, "i") },
      { contactName: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
    ];
  }

  setTenantContext({ orgId: user.orgId });
  try {
    const [leads, total] = await Promise.all([
      CrmLead.find(filter).sort({ updatedAt: -1 }).limit(limit).lean(),
      CrmLead.countDocuments(filter),
    ]);
    return NextResponse.json({ leads, total });
  } catch (error) {
    logger.error("[crm/contacts] Failed to list leads", { error });
    return NextResponse.json(
      { error: "Failed to load CRM contacts" },
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

  let payload: z.infer<typeof LeadSchema>;
  try {
    payload = LeadSchema.parse(await req.json());
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
    timestamp: new Date(),
    ipAddress: getClientIP(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  try {
    const value = estimateValue(
      payload.type,
      payload.revenue,
      payload.employees,
    );
    const probability = payload.type === "ACCOUNT" ? 0.85 : 0.3;
    const stage = payload.type === "ACCOUNT" ? "CUSTOMER" : "QUALIFYING";
    const lead = await CrmLead.create({
      kind: payload.type,
      contactName: payload.contact,
      company: payload.company.trim(),
      email: payload.email?.trim(),
      phone: payload.phone?.trim(),
      segment: payload.segment?.trim(),
      revenue: payload.revenue,
      employees: payload.employees,
      notes: payload.notes,
      source: payload.source,
      stage,
      status: "OPEN",
      value,
      probability,
      owner: user.id,
      lastContactAt: new Date(),
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    logger.error("[crm/contacts] Failed to create lead", { error });
    return NextResponse.json(
      { error: "Failed to capture lead" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
    clearAuditContext();
  }
}
