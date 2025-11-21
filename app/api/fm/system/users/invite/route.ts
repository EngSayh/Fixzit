import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { FMErrors } from '@/app/api/fm/errors';
import { requireFmPermission } from '@/app/api/fm/permissions';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { ModuleKey } from '@/domain/fm/fm.behavior';
import { FMAction } from '@/types/fm/enums';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

type InviteDocument = {
  _id: ObjectId;
  org_id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'pending' | 'sent';
  createdAt: Date;
  updatedAt: Date;
};

type InvitePayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

const COLLECTION = 'fm_user_invites';

const sanitize = (payload: InvitePayload) => ({
  email: payload.email?.trim().toLowerCase(),
  firstName: payload.firstName?.trim(),
  lastName: payload.lastName?.trim(),
  role: payload.role?.trim(),
});

const validate = (payload: ReturnType<typeof sanitize>): string | null => {
  if (!payload.email) return 'Email is required';
  if (!payload.firstName) return 'First name is required';
  if (!payload.lastName) return 'Last name is required';
  if (!payload.role) return 'Role is required';
  return null;
};

const mapInvite = (doc: InviteDocument) => ({
  id: doc._id.toString(),
  email: doc.email,
  firstName: doc.firstName,
  lastName: doc.lastName,
  role: doc.role,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.FINANCE, action: FMAction.VIEW });
    if (actor instanceof NextResponse) return actor;
    const tenantResolution = resolveTenantId(req, actor.orgId ?? actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();
    const collection = db.collection<InviteDocument>(COLLECTION);
    const invites = await collection.find({ org_id: tenantId }).sort({ updatedAt: -1 }).limit(200).toArray();
    return NextResponse.json({ success: true, data: invites.map(mapInvite) });
  } catch (error) {
    logger.error('FM Invites API - GET error', error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.FINANCE, action: FMAction.CREATE });
    if (actor instanceof NextResponse) return actor;
    const tenantResolution = resolveTenantId(req, actor.orgId ?? actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const rl = rateLimit(buildRateLimitKey(req, actor.id), 30, 60_000);
    if (!rl.allowed) return rateLimitError();

    const payload = sanitize(await req.json());
    const validationError = validate(payload);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const now = new Date();
    const doc: InviteDocument = {
      _id: new ObjectId(),
      org_id: tenantId,
      email: payload.email!,
      firstName: payload.firstName!,
      lastName: payload.lastName!,
      role: payload.role!,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<InviteDocument>(COLLECTION);

    const existing = await collection.findOne({ org_id: tenantId, email: doc.email });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Invitation already exists for this email' }, { status: 409 });
    }

    await collection.insertOne(doc);

    // TODO: enqueue email invitation job

    return NextResponse.json({ success: true, data: mapInvite(doc) }, { status: 201 });
  } catch (error) {
    logger.error('FM Invites API - POST error', error as Error);
    return FMErrors.internalError();
  }
}
