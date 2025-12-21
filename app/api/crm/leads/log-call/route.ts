"use server";

/**
 * @fileoverview CRM Log Call API
 * @description Logs sales call activities for CRM leads and accounts,
 * creating or updating lead records with call notes.
 * 
 * @module api/crm/leads/log-call
 * @requires SUPER_ADMIN, CORPORATE_ADMIN, ADMIN, MANAGER, FM_MANAGER, or PROPERTY_MANAGER role
 * 
 * @endpoints
 * - POST /api/crm/leads/log-call - Log a call activity for a lead
 * 
 * @requestBody
 * - contact: (required) Contact person name
 * - company: (required) Company name
 * - email: Contact email
 * - phone: Contact phone number
 * - notes: (required) Call notes/summary
 * 
 * @behavior
 * - Creates new lead if company doesn't exist
 * - Updates existing lead contact info if found
 * - Creates CRM activity record with call details
 * 
 * @security
 * - RBAC: Admin and management roles
 * - Tenant-scoped: Calls are logged per organization
 * - Audit context for tracking changes
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { isUnauthorizedError } from "@/server/utils/isUnauthorizedError";
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
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  // Note: EMPLOYEE deprecated in STRICT v4 - MANAGER covers this use case
]);

const PayloadSchema = z.object({
  contact: z.string().min(1),
  company: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().min(1),
});

function isUnauthenticatedError(error: unknown): boolean {
  return (
    isUnauthorizedError(error) ||
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
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "crm-leads:log-call",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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
    const lead =
      (await CrmLead.findOne({ 
        orgId: user.orgId, // 🔒 TENANT SCOPE: Enforce org isolation
        company: payload.company.trim() 
      }).sort({
        updatedAt: -1,
      })) ??
      (await CrmLead.create({
        orgId: user.orgId, // 🔒 TENANT SCOPE: Enforce org isolation
        kind: "LEAD",
        contactName: payload.contact,
        company: payload.company.trim(),
        email: payload.email?.trim(),
        phone: payload.phone?.trim(),
        notes: payload.notes,
        stage: "QUALIFYING",
        status: "OPEN",
        value: 15000,
        probability: 0.25,
        owner: user.id,
        lastContactAt: new Date(),
      }));

    lead.lastContactAt = new Date();
    await lead.save();

    await CrmActivity.create({
      orgId: user.orgId, // 🔒 TENANT SCOPE: Enforce org isolation
      leadId: lead._id,
      type: "CALL",
      summary: payload.notes,
      contactName: payload.contact,
      company: payload.company,
      owner: user.id,
      performedAt: new Date(),
      leadStageSnapshot: lead.stage,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[crm/leads/log-call] Failed to log call", error as Error);
    return NextResponse.json({ error: "Failed to log call" }, { status: 500 });
  } finally {
    clearTenantContext();
    clearAuditContext();
  }
}
