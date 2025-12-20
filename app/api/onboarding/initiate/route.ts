/**
 * @fileoverview Onboarding Case Initiation API
 * @description Creates new onboarding cases for user registration including
 * vendor onboarding, tenant verification, and owner KYC processes.
 * 
 * @module api/onboarding/initiate
 * @requires Authenticated user
 * 
 * @endpoints
 * - POST /api/onboarding/initiate - Start a new onboarding case
 * 
 * @requestBody
 * - role: (required) Target role (VENDOR, TENANT, OWNER, DRIVER, etc.)
 * - basic_info: (required) Initial user information object
 * - payload: Additional data for the onboarding process
 * - country: Country code (default: SA)
 * 
 * @response
 * - id: Created case ID
 * - step: Current onboarding step (starts at first step)
 * 
 * @workflow
 * 1. User initiates onboarding with role and basic info
 * 2. System creates case with PENDING status
 * 3. User proceeds through steps (documents, verification, etc.)
 * 4. Reviewer approves or rejects
 * 
 * @security
 * - Authenticated: Any logged-in user can initiate
 * - Tenant-scoped: Case linked to user's organization
 */
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { parseBodySafe } from '@/lib/api/parse-body';
import { connectMongo } from '@/lib/mongo';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { OnboardingCase, ONBOARDING_ROLES, type OnboardingRole } from '@/server/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type InitiateBody = {
  role?: OnboardingRole;
  basic_info?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  country?: string;
};

export async function POST(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 20, windowMs: 60_000, keyPrefix: "onboarding:initiate" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(req, { route: "onboarding:initiate" });
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

  const { data: body, error: parseError } = await parseBodySafe<InitiateBody>(req, { logPrefix: '[onboarding:initiate]' });
  if (parseError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { role, basic_info, payload, country } = body ?? {};

  if (!role || !ONBOARDING_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (!basic_info || typeof basic_info !== 'object') {
    return NextResponse.json({ error: 'basic_info is required' }, { status: 400 });
  }

  try {
    await connectMongo();
    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const onboarding = await OnboardingCase.create({
      orgId: new Types.ObjectId(orgId),
      subject_user_id: new Types.ObjectId(user.id),
      role,
      basic_info,
      payload,
      country: typeof country === 'string' && country.trim() ? country.trim() : 'SA',
      created_by_id: new Types.ObjectId(user.id),
      source_channel: 'web',
    });

    return NextResponse.json({ id: onboarding._id, step: onboarding.current_step }, { status: 201 });
  } catch (error) {
    logger.error('[Onboarding] Failed to initiate case', error as Error);
    return NextResponse.json({ error: 'Failed to initiate onboarding' }, { status: 500 });
  }
}
