/**
 * @fileoverview Onboarding Cases API
 * @description Lists onboarding cases for user registration workflows including
 * KYC verification, document submission, and approval processes.
 * 
 * @module api/onboarding
 * @requires Authenticated user (privileged roles see all, others see own)
 * 
 * @endpoints
 * - GET /api/onboarding - List onboarding cases
 * 
 * @queryParams
 * - status: Filter by case status
 * - role: Filter by target role (VENDOR, TENANT, OWNER, etc.)
 * - limit: Max results (1-100, default: 25)
 * 
 * @accessControl
 * - SUPER_ADMIN, ADMIN, COMPLIANCE_OFFICER, REVIEWER: See all org cases
 * - Other users: See only cases they created or are subject of
 * 
 * @security
 * - Tenant-scoped: Cases filtered by orgId
 * - Privacy: Non-privileged users restricted to own cases
 */
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { OnboardingCase, ONBOARDING_STATUSES, ONBOARDING_ROLES } from '@/server/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 60, windowMs: 60_000, keyPrefix: "onboarding:list" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(req, { route: "onboarding:list" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId =
    (user as { orgId?: string; tenantId?: string }).orgId ||
    (user as { tenantId?: string }).tenantId ||
    null;
  if (!orgId || !Types.ObjectId.isValid(orgId)) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const role = searchParams.get('role');
  const limitParam = Number(searchParams.get('limit') || 25);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 25;

  const privilegedRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'REVIEWER']);
  const isPrivileged =
    privilegedRoles.has(user.role) || user.roles?.some((r) => privilegedRoles.has(r.toUpperCase?.() || r));

  const filter: Record<string, unknown> = {};
  // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  filter.orgId = orgId;
  if (status && ONBOARDING_STATUSES.includes(status as (typeof ONBOARDING_STATUSES)[number])) {
    filter.status = status;
  }
  if (role && ONBOARDING_ROLES.includes(role as (typeof ONBOARDING_ROLES)[number])) {
    filter.role = role;
  }
  if (!isPrivileged) {
    // Non-privileged users can only see their own cases
    filter.$or = [
      { subject_user_id: user.id },
      { created_by_id: user.id },
    ];
  }

  try {
    await connectMongo();
    setTenantContext({ orgId });
    const cases = await OnboardingCase.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(cases, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to list cases', error as Error);
    return NextResponse.json({ error: 'Failed to load onboarding queue' }, { status: 500 });
  } finally {
    clearTenantContext();
  }
}
