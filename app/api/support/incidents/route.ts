import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { SupportTicket } from "@/server/models/SupportTicket";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { z } from "zod";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { logger } from "@/lib/logger";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import {
  clearTenantContext,
  setTenantContext,
} from "@/server/plugins/tenantIsolation";
// Accepts client diagnostic bundles and auto-creates a support ticket.
// This is non-blocking for the user flow; returns 202 on insert.
/**
 * @openapi
 * /api/support/incidents:
 *   get:
 *     summary: support/incidents operations
 *     tags: [support]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  const native = await getDatabase();

  const body = await req.json();
  const schema = z.object({
    code: z.string().max(50).optional(),
    message: z.string().max(500).optional(),
    details: z.string().max(4000).optional(),
    stack: z.string().max(4000).optional(),
    severity: z.enum(["CRITICAL", "P0", "P1", "P2", "P3"]).optional(),
    category: z.string().max(50).optional(),
    incidentId: z.string().max(64).optional(),
    incidentKey: z.string().max(128).optional(),
    userContext: z
      .object({
        userId: z.string().optional(),
        tenant: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
      .optional(),
    clientContext: z.record(z.string(), z.unknown()).optional(),
  });
  let safe: z.infer<typeof schema>;
  try {
    safe = schema.parse(body);
  } catch (_err: unknown) {
    const issues =
      _err && typeof _err === "object" && "issues" in _err
        ? (_err as { issues: unknown[] }).issues
        : [];
    return NextResponse.json(
      {
        type: "https://docs.fixzit/errors/invalid-incident-payload",
        title: "Invalid incident payload",
        status: 400,
        detail: "One or more fields are invalid",
        errors: issues,
      },
      { status: 400, headers: { "content-type": "application/problem+json" } },
    );
  }
  const now = new Date();

  const incidentId: string =
    safe.incidentId ||
    `INC-${now.getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const incidentKey: string | undefined = safe.incidentKey || incidentId;
  const code: string = safe.code || "UI-UI-UNKNOWN-000";
  const category: string = safe.category || "Support";
  const severity: string = safe.severity || "P2";
  const message: string = safe.message || "Application error";
  const details: string | undefined = safe.details || safe.stack;

  // Derive authenticated user/tenant if available; ignore spoofed body.userContext
  let sessionUser: { id: string; role: string; orgId: string } | null = null;
  try {
    const user = await getSessionUser(req);
    sessionUser = { id: user.id, role: user.role, orgId: user.orgId };
  } catch {
    sessionUser = null;
  }

  if (sessionUser && !sessionUser.orgId) {
    logger.error("[Incidents] Authenticated user missing orgId - denying to preserve tenant isolation", {
      userId: sessionUser.id,
    });
    return NextResponse.json(
      {
        error: "Missing organization context",
        detail: "Authenticated incident reports require an org-scoped session.",
      },
      { status: 400 },
    );
  }

  // Rate limiting: Authenticated users get tenant-isolated buckets,
  // anonymous users (if enabled) share IP-based bucket
  const orgId = sessionUser?.orgId ?? null;
  const userId = sessionUser?.id ?? null;
  
  const rl = await smartRateLimit(
    buildOrgAwareRateLimitKey(req, orgId, userId),
    60,
    60_000,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }
  // SECURITY: Determine tenant scope from authenticated session ONLY
  // Historical context: PR reviews flagged tenant isolation bypass where
  // tenantScope fell back to req.headers.get('x-org-id') (client-controlled)
  // CRITICAL: Never trust client-provided headers for tenant scoping

  // Feature flag: allow anonymous incident reporting for backwards compatibility
  const ENABLE_ANONYMOUS_INCIDENTS =
    process.env.ENABLE_ANONYMOUS_INCIDENTS === "true";
  let tenantScope = sessionUser?.orgId || null;

  // If no authenticated session, optionally allow anonymous reporting under "public" scope
  if (!tenantScope) {
    if (ENABLE_ANONYMOUS_INCIDENTS) {
      tenantScope = "public";
    } else {
      return NextResponse.json(
        {
          error: "Authentication required",
          detail:
            "Incident reporting requires authenticated session for tenant attribution",
        },
        { status: 401 },
      );
    }
  }
  // Align telemetry with org-level tenancy for analytics + isolation
  const orgScope = tenantScope;

  let existing: Record<string, unknown> | null = null;
  if (incidentKey) {
    // Prefer orgId-based dedupe (indexed); fallback to legacy tenantScope-only records
    existing =
      (await native
        .collection(COLLECTIONS.ERROR_EVENTS)
        .findOne({ incidentKey, orgId: orgScope })) ||
      (await native
        .collection(COLLECTIONS.ERROR_EVENTS)
        .findOne({ incidentKey, tenantScope: orgScope }));
  }
  if (existing) {
    return NextResponse.json(
      {
        ok: true,
        incidentId: existing.incidentId,
        ticketId: existing.ticketId,
      },
      { status: 202 },
    );
  }

  // Store minimal incident document for indexing/analytics
  await native.collection(COLLECTIONS.ERROR_EVENTS).insertOne({
    orgId: orgScope,
    incidentKey,
    incidentId,
    code,
    category,
    severity,
    message,
    details,
    sessionUser: sessionUser || null,
    clientContext: body?.clientContext || null,
    tenantScope,
    createdAt: now,
  });

  // Auto-create a Support Ticket (same model used by /api/support/tickets)
  interface TicketDoc {
    code?: string;
    _id?: unknown;
  }
  let ticket: TicketDoc | null = null;
  const genCode = () =>
    `SUP-${now.getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  for (let i = 0; i < 5; i++) {
    const ticketCode = genCode();
    try {
      const ticketOrgId = sessionUser?.orgId || process.env.SUPPORT_PUBLIC_ORG_ID;
      if (!ticketOrgId) {
        return NextResponse.json(
          {
            error: "Missing organization context",
            detail:
              "Support tickets require an organization. Set SUPPORT_PUBLIC_ORG_ID for anonymous incidents.",
          },
          { status: 400 },
        );
      }
      setTenantContext({ orgId: ticketOrgId });
      ticket = await SupportTicket.create({
        orgId: ticketOrgId,
        code: ticketCode,
        subject: `[${code}] ${message}`.slice(0, 140),
        module: "Other",
        type: "Bug",
        priority:
          severity === "P0" || severity === "CRITICAL"
            ? "Urgent"
            : severity === "P1"
              ? "High"
              : "Medium",
        category: "Technical",
        subCategory: "Bug Report",
        status: "New",
        createdBy: sessionUser?.id || undefined,
        requester:
          !sessionUser && body?.userContext?.email
            ? {
                name: String(body?.userContext?.email).split("@")[0],
                email: body?.userContext?.email,
                phone: body?.userContext?.phone || "",
              }
            : undefined,
        messages: [
          {
            byUserId: sessionUser?.id || undefined,
            byRole: sessionUser ? "USER" : "GUEST",
            text: `${message}\n\n${details || ""}`.trim(),
            at: now,
          },
        ],
      });
      break;
    } catch (_e: unknown) {
      if (_e && typeof _e === "object" && "code" in _e && _e.code === 11000)
        continue; // duplicate code -> retry
      throw _e;
    } finally {
      clearTenantContext();
    }
  }

  // Persist ticket linkage for dedupe/analytics
  if (ticket) {
    await native
      .collection(COLLECTIONS.ERROR_EVENTS)
      .updateOne(
        {
          incidentId,
          $or: [
            { orgId: orgScope },
            { tenantScope: orgScope },
          ],
        },
        { $set: { ticketId: ticket.code } },
      );
  }

  return NextResponse.json(
    { ok: true, incidentId, ticketId: ticket?.code },
    { status: 202 },
  );
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}
