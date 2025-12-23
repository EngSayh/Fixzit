/**
 * @fileoverview Organization Impersonation API (Support Tool)
 * @description Enables Super Admins to temporarily impersonate an organization
 * for support and troubleshooting without changing their actual session.
 * 
 * @module api/support/impersonation
 * @requires SUPER_ADMIN role
 * 
 * @endpoints
 * - GET /api/support/impersonation - Get current impersonation status
 * - POST /api/support/impersonation - Start impersonating an organization
 * - DELETE /api/support/impersonation - Stop impersonation
 * 
 * @cookies
 * - support_org_id: Stores impersonated org ID
 * 
 * @requestBody (POST)
 * - orgId: (required) Organization ID to impersonate
 * 
 * @response
 * - organization: Impersonated organization details or null
 * 
 * @security
 * - SUPER_ADMIN only - highly privileged operation
 * - Cookie-based session tracking
 * - Audit logging recommended for production
 * - Impersonation visible in UI for transparency
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Organization } from "@/server/models/Organization";
import { logger } from "@/lib/logger";
import {
  buildOrgAwareRateLimitKey,
  smartRateLimit,
} from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import type { Session } from "next-auth";

const COOKIE_NAME = "support_org_id";
const IMPERSONATION_RL_LIMIT = 10;

function serializeOrganization(org: {
  orgId: string;
  name: string;
  code?: string;
  legal?: { registrationNumber?: string };
  subscription?: { plan?: string };
}) {
  return {
    orgId: org.orgId,
    name: org.name,
    code: org.code ?? null,
    registrationNumber: org.legal?.registrationNumber ?? null,
    subscriptionPlan: org.subscription?.plan ?? null,
  };
}

async function enforceImpersonationRateLimit(
  req: NextRequest,
  session: Session | null,
) {
  const sessionUser = session?.user as { id?: string; orgId?: string } | undefined;
  const key = buildOrgAwareRateLimitKey(
    req,
    sessionUser?.orgId ?? null,
    sessionUser?.id ?? null,
  );
  const rl = await smartRateLimit(
    `${key}:support-impersonation`,
    IMPERSONATION_RL_LIMIT,
    60_000,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }
  return null;
}

async function ensureSuperAdmin(req: NextRequest): Promise<{
  session: Session | null;
  response?: NextResponse;
}> {
  const session = (await auth()) as Session | null;
  const rateLimited = await enforceImpersonationRateLimit(req, session);
  if (rateLimited) {
    return { session: null, response: rateLimited };
  }
  if (!session?.user?.isSuperAdmin) {
    return { session: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(req: NextRequest) {
  const { response } = await ensureSuperAdmin(req);
  if (response) {
    return response;
  }

  const cookieOrgId = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookieOrgId) {
    return NextResponse.json({ organization: null });
  }

  await connectToDatabase();
  const org = await Organization.findOne({ orgId: cookieOrgId })
    .select("orgId name code legal.registrationNumber subscription.plan")
    .lean();

  if (!org) {
    const res = NextResponse.json({ organization: null });
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.json({ organization: serializeOrganization(org) });
}

export async function POST(req: NextRequest) {
  const { response } = await ensureSuperAdmin(req);
  if (response) {
    return response;
  }

  let body: { orgId?: string; corporateId?: string; identifier?: string } = {};
  try {
    body = await req.json();
  } catch (error) {
    logger.warn("[support/impersonation] Failed to parse body", { error });
  }

  const identifier = body.orgId || body.corporateId || body.identifier;
  if (!identifier) {
    return NextResponse.json(
      { error: "orgId or corporateId is required" },
      { status: 400 },
    );
  }

  await connectToDatabase();

  // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN/SUPPORT: Cross-org impersonation lookup
  const org = await Organization.findOne({
    $or: [
      { orgId: identifier },
      { code: identifier },
      { "legal.registrationNumber": identifier },
    ],
  })
    .select("orgId name code legal.registrationNumber subscription.plan")
    .lean();

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const res = NextResponse.json({ organization: serializeOrganization(org) });
  res.cookies.set({
    name: COOKIE_NAME,
    value: org.orgId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return res;
}

export async function DELETE(req: NextRequest) {
  const { response } = await ensureSuperAdmin(req);
  if (response) {
    return response;
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}
