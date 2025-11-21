import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { FMErrors } from '@/app/api/fm/errors';
import { requireFmPermission } from '@/app/api/fm/permissions';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { ModuleKey } from '@/domain/fm/fm.behavior';
import { FMAction } from '@/types/fm/enums';

type RoleDocument = {
  _id: ObjectId;
  org_id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
};

type RolePayload = {
  name?: string;
  description?: string;
  permissions?: string[];
};

const COLLECTION = 'fm_roles';

const sanitizePayload = (payload: RolePayload) => {
  const sanitized: RolePayload = {};
  if (payload.name) sanitized.name = payload.name.trim();
  if (payload.description) sanitized.description = payload.description.trim();
  if (Array.isArray(payload.permissions)) {
    sanitized.permissions = payload.permissions
      .map((p) => String(p).trim())
      .filter(Boolean);
  }
  return sanitized;
};

const validatePayload = (payload: RolePayload): string | null => {
  if (!payload.name) return 'Name is required';
  if (!payload.permissions || payload.permissions.length === 0) {
    return 'At least one permission is required';
  }
  return null;
};

const mapRole = (doc: RoleDocument) => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? '',
  permissions: doc.permissions,
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
    const collection = db.collection<RoleDocument>(COLLECTION);
    const items = await collection
      .find({ org_id: tenantId })
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ success: true, data: items.map(mapRole) });
  } catch (error) {
    logger.error('FM Roles API - GET error', error as Error);
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

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const now = new Date();
    const doc: RoleDocument = {
      _id: new ObjectId(),
      org_id: tenantId,
      name: payload.name!,
      description: payload.description ?? '',
      permissions: payload.permissions ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<RoleDocument>(COLLECTION);

    // enforce unique name per tenant
    const existing = await collection.findOne({ org_id: tenantId, name: doc.name });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Role name already exists' }, { status: 409 });
    }

    await collection.insertOne(doc);
    return NextResponse.json({ success: true, data: mapRole(doc) }, { status: 201 });
  } catch (error) {
    logger.error('FM Roles API - POST error', error as Error);
    return FMErrors.internalError();
  }
}
