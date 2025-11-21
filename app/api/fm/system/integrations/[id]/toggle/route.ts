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

type IntegrationDocument = {
  _id: ObjectId;
  org_id: string;
  integrationId: string;
  status: 'connected' | 'disconnected';
  updatedAt: Date;
  createdAt: Date;
};

const COLLECTION = 'fm_integrations';

const mapIntegration = (doc: IntegrationDocument) => ({
  id: doc.integrationId,
  status: doc.status,
  updatedAt: doc.updatedAt,
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const integrationId = params.id;
  if (!integrationId) {
    return NextResponse.json({ success: false, error: 'Missing integration id' }, { status: 400 });
  }

  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.FINANCE, action: FMAction.UPDATE });
    if (actor instanceof NextResponse) return actor;
    const tenantResolution = resolveTenantId(req, actor.orgId ?? actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const rl = rateLimit(buildRateLimitKey(req, actor.id), 30, 60_000);
    if (!rl.allowed) return rateLimitError();

    const db = await getDatabase();
    const collection = db.collection<IntegrationDocument>(COLLECTION);
    const now = new Date();

    const existing = await collection.findOne({ org_id: tenantId, integrationId });
    const nextStatus = existing?.status === 'connected' ? 'disconnected' : 'connected';

    const result = await collection.findOneAndUpdate(
      { org_id: tenantId, integrationId },
      {
        $set: {
          status: nextStatus,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const doc = (result as any)?.value ?? (result as any);
    if (!doc) {
      return FMErrors.internalError();
    }

    return NextResponse.json({ success: true, data: mapIntegration(doc) });
  } catch (error) {
    logger.error('FM Integrations toggle API error', error as Error);
    return FMErrors.internalError();
  }
}
