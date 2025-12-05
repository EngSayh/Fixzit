"use server";

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
import CrmActivity from "@/server/models/CrmActivity";
import { UserRole, type UserRoleType } from "@/types/user";

const PayloadSchema = z.object({
  company: z.string().min(1),
  segment: z.string().optional(),
  revenue: z.number().nonnegative().optional(),
  employees: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  // Note: EMPLOYEE deprecated in STRICT v4 - MANAGER covers this use case
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

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof PayloadSchema>;
  try {
    payload = PayloadSchema.parse(await req.json());
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
    const account =
      (await CrmLead.findOne({
        company: payload.company.trim(),
        kind: "ACCOUNT",
      })) ??
      (await CrmLead.create({
        kind: "ACCOUNT",
        company: payload.company.trim(),
        segment: payload.segment,
        revenue: payload.revenue,
        employees: payload.employees,
        notes: payload.notes,
        stage: "CUSTOMER",
        status: "OPEN",
        value: payload.revenue ?? 0,
        probability: 0.9,
        owner: user.id,
        lastContactAt: new Date(),
      }));

    await CrmActivity.create({
      leadId: account._id,
      type: "HANDOFF",
      summary: payload.notes ?? "Shared with customer success",
      performedAt: new Date(),
      owner: user.id,
      company: account.company,
      leadStageSnapshot: account.stage,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[crm/accounts/share] Failed to share account", error as Error);
    return NextResponse.json(
      { error: "Failed to share account" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
    clearAuditContext();
  }
}
