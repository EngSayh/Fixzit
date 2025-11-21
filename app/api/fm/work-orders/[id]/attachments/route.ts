import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import type { WorkOrderPhoto } from '@/types/fm';
import {
  assertWorkOrderQuota,
  getCanonicalUserId,
  recordTimelineEntry,
  WORK_ORDER_ATTACHMENT_LIMIT,
  WorkOrderQuotaError,
} from '../../utils';
import { resolveTenantId } from '../../../utils/tenant';
import { requireFmAbility } from '../../../utils/auth';
import { FMErrors } from '../../../errors';

interface AttachmentDocument {
  _id?: { toString?: () => string };
  id?: string;
  url?: string;
  thumbnailUrl?: string;
  type?: string;
  caption?: string;
  fileName?: string;
  uploadedAt?: Date | string | number;
  [key: string]: unknown;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireFmAbility('VIEW')(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResolution = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    if (!getCanonicalUserId(actor)) {
      return FMErrors.validationError('User identifier is required');
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId('work order');
    }

    const db = await getDatabase();
    const attachments = await db
      .collection('workorder_attachments')
      .find({ tenantId, workOrderId })
      .sort({ uploadedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: attachments.map(mapAttachmentDocument),
    });
  } catch (error) {
    logger.error('FM Work Order Attachments GET error', error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireFmAbility('EDIT')(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResolution = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError('User identifier is required');
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId('work order');
    }

    const body = await req.json();
    const url = (body?.url || '').trim();
    if (!url) {
      return FMErrors.validationError('Attachment URL is required');
    }

    const type: WorkOrderPhoto['type'] = body?.type ?? 'attachment';
    const now = new Date();
    const db = await getDatabase();
    await assertWorkOrderQuota(
      db,
      'workorder_attachments',
      tenantId,
      workOrderId,
      WORK_ORDER_ATTACHMENT_LIMIT
    );
    const attachmentDoc = {
      tenantId,
      workOrderId,
      url,
      thumbnailUrl: body?.thumbnailUrl,
      caption: body?.caption,
      type,
      fileName: body?.fileName,
      fileSize: body?.fileSize,
      uploadedAt: now,
      uploadedBy: {
        id: actorId,
        name: actor.name ?? undefined,
        email: actor.email ?? undefined,
      },
      metadata: body?.metadata,
    };

    const result = await db.collection('workorder_attachments').insertOne(attachmentDoc);

    await recordTimelineEntry(db, {
      workOrderId,
      tenantId,
      action: 'photo_uploaded',
      description: body?.caption || body?.fileName || 'Attachment uploaded',
      metadata: {
        attachmentId: result.insertedId.toString(),
        type,
      },
      performedBy: actorId,
      performedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        data: mapAttachmentDocument({ _id: result.insertedId, ...attachmentDoc }),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof WorkOrderQuotaError) {
      return FMErrors.rateLimited(error.message, {
        limit: error.limit,
        resource: 'attachments',
      });
    }
    logger.error('FM Work Order Attachments POST error', error as Error);
    return FMErrors.internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireFmAbility('EDIT')(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResolution = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError('User identifier is required');
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId('work order');
    }

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');
    if (!attachmentId) {
      return FMErrors.validationError('attachmentId query parameter is required');
    }
    if (!ObjectId.isValid(attachmentId)) {
      return FMErrors.invalidId('attachment');
    }

    const db = await getDatabase();
    const result = await db.collection('workorder_attachments').findOneAndDelete({
      _id: new ObjectId(attachmentId),
      tenantId,
      workOrderId,
    });

    if (!result?.value) {
      return FMErrors.notFound('Attachment');
    }

    await recordTimelineEntry(db, {
      workOrderId,
      tenantId,
      action: 'photo_removed',
      description: `Attachment removed: ${result.value.caption || result.value.fileName || result.value.url}`,
      metadata: {
        attachmentId,
      },
      performedBy: actorId,
      performedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('FM Work Order Attachments DELETE error', error as Error);
    return FMErrors.internalError();
  }
}

function mapAttachmentDocument(doc: AttachmentDocument): WorkOrderPhoto {
  const uploadedAt =
    doc.uploadedAt instanceof Date ? doc.uploadedAt : new Date(doc.uploadedAt ?? Date.now());

  return {
    id: doc._id?.toString?.() ?? doc.id ?? '',
    url: doc.url ?? '',
    thumbnailUrl: doc.thumbnailUrl ?? '',
    type: (doc.type as 'before' | 'after' | 'attachment' | undefined) ?? 'attachment',
    caption: doc.caption ?? doc.fileName ?? '',
    uploadedAt: uploadedAt.toISOString(),
  };
}
