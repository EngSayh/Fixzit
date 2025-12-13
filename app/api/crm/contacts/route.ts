/**
 * @fileoverview CRM Contacts API
 * @description Manages CRM leads and accounts including creation, listing,
 * and contact information management for sales pipeline tracking.
 * 
 * @module api/crm/contacts
 * @requires SUPER_ADMIN, CORPORATE_ADMIN, ADMIN, MANAGER, FM_MANAGER, PROPERTY_MANAGER, or SUPPORT_AGENT role
 * 
 * @endpoints
 * - GET /api/crm/contacts - List leads/accounts with filtering
 * - POST /api/crm/contacts - Create a new lead or account
 * 
 * @requestBody (POST)
 * - type: LEAD or ACCOUNT (default: LEAD)
 * - company: (required) Company name
 * - contact: Contact person name
 * - email: Contact email
 * - phone: Contact phone number
 * - notes: Additional notes
 * - segment: Market segment classification
 * - revenue: Annual revenue (for value estimation)
 * - employees: Employee count (for value estimation)
 * - source: Lead source (web, referral, etc.)
 * 
 * @features
 * - Automatic deal value estimation based on revenue/employees
 * - Lead-to-Account conversion support
 * - Activity logging for interactions
 * 
 * @security
 * - RBAC: Admin, management, and support roles
 * - STRICT v4: EMPLOYEE role removed, use SUPPORT_AGENT for CRM
 * - Tenant-scoped: Contacts are isolated by organization
 */
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
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// 🔒 STRICT v4: CRM access restricted to Admin roles + SUPPORT_AGENT sub-role
// EMPLOYEE role removed - use specific sub-roles (SUPPORT_AGENT for CRM access)
const ALLOWED_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.SUPPORT_AGENT, // STRICT v4: CRM-specific sub-role
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
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "crm-contacts:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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
    // SECURITY: Escape regex special characters to prevent ReDoS
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { company: new RegExp(escapedSearch, "i") },
      { contactName: new RegExp(escapedSearch, "i") },
      { email: new RegExp(escapedSearch, "i") },
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
    logger.error("[crm/contacts] Failed to list leads", error as Error);
    return NextResponse.json(
      { error: "Failed to load CRM contacts" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for writes
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "crm-contacts:create",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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
    logger.error("[crm/contacts] Failed to create lead", error as Error);
    return NextResponse.json(
      { error: "Failed to capture lead" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
    clearAuditContext();
  }
}
