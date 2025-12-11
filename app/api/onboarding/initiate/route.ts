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
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { OnboardingCase, ONBOARDING_ROLES, type OnboardingRole } from '@/server/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';

type InitiateBody = {
  role?: OnboardingRole;
  basic_info?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  country?: string;
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as InitiateBody;
  const { role, basic_info, payload, country } = body;

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
      orgId: user.orgId ? new Types.ObjectId(user.orgId) : null,
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
