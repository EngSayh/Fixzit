/**
 * @description Manages individual onboarding cases including retrieval and status updates.
 * GET returns case details for the owner or authorized reviewers.
 * PATCH allows status transitions for compliance officers and admins.
 * @route GET /api/onboarding/[caseId]
 * @route PATCH /api/onboarding/[caseId]
 * @access Private - Case owner or reviewers (SUPER_ADMIN, ADMIN, COMPLIANCE_OFFICER, REVIEWER)
 * @param {string} caseId - The unique identifier of the onboarding case
 * @returns {Object} GET: Onboarding case details | PATCH: Updated case with new status
 * @throws {401} If user is not authenticated
 * @throws {403} If user lacks permission to view or update the case
 * @throws {404} If onboarding case is not found
 */
import { NextRequest, NextResponse } from 'next/server';
import { parseBodySafe } from '@/lib/api/parse-body';
import { connectMongo } from '@/lib/mongo';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { OnboardingCase, type OnboardingStatus } from '@/server/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const ALLOWED_STATUS_UPDATES: OnboardingStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING'];
const REVIEWER_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'REVIEWER']);

export async function GET(
  _req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const rateLimitResponse = enforceRateLimit(_req, { requests: 60, windowMs: 60_000, keyPrefix: "onboarding:case:get" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(_req, { route: "onboarding:case:get" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectMongo();
  if (user.orgId) {
    setTenantContext({ orgId: user.orgId });
  }

  try {
    // NO_TENANT_SCOPE: user-scoped access (subject/creator) with optional orgId guard
    const onboarding = await OnboardingCase.findOne({
      _id: params.caseId,
      $or: [
        { subject_user_id: user.id },
        { created_by_id: user.id },
        ...(user.orgId ? [{ orgId: user.orgId }] : []),
      ],
    }).lean();
    if (!onboarding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(onboarding, { status: 200 });
  } finally {
    clearTenantContext();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 30, windowMs: 60_000, keyPrefix: "onboarding:case:update" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(req, { route: "onboarding:case:update" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(req, { logPrefix: '[onboarding:case:update]' });
  if (parseError || !body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const payload = body.payload as Record<string, unknown> | undefined;
  const basic_info = body.basic_info as Record<string, unknown> | undefined;
  const status = body.status as OnboardingStatus | undefined;
  const current_step = typeof body.current_step === 'number' ? body.current_step : undefined;

  try {
    await connectMongo();
    if (user.orgId) {
      setTenantContext({ orgId: user.orgId });
    }
    // Defense-in-depth: Query scoped to user's org from the start
    // NO_LEAN: Document required for payload/status updates and save()
    const onboarding = await OnboardingCase.findOne({
      _id: params.caseId,
      $or: [
        { subject_user_id: user.id },
        { created_by_id: user.id },
        ...(user.orgId ? [{ orgId: user.orgId }] : []),
      ],
    });
    if (!onboarding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isReviewer =
      REVIEWER_ROLES.has(user.role) || user.roles?.some((r) => REVIEWER_ROLES.has(r.toUpperCase?.() || r));
    const isSubmitter =
      onboarding.subject_user_id?.toString() === user.id || onboarding.created_by_id?.toString() === user.id;

    if (payload) onboarding.payload = payload;
    if (basic_info) onboarding.basic_info = { ...onboarding.basic_info, ...basic_info };
    if (current_step) {
      const step = Math.max(onboarding.current_step || 1, current_step);
      onboarding.current_step = Math.min(step, 4);
    }

    if (status) {
      if (!ALLOWED_STATUS_UPDATES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
      }
      // Submitters can only move to SUBMITTED; reviewers control other statuses
      if (status === 'SUBMITTED' && isSubmitter) {
        onboarding.status = status;
      } else if (isReviewer) {
        onboarding.status = status;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await onboarding.save();
    return NextResponse.json({ id: onboarding._id, status: onboarding.status, current_step: onboarding.current_step });
  } catch (error) {
    logger.error('[Onboarding] Failed to update case', error as Error);
    return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 });
  } finally {
    clearTenantContext();
  }
}
