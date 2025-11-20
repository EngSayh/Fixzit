import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { ModuleKey } from '@/domain/fm/fm.behavior';
import { requireFmPermission } from '@/app/api/fm/permissions';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { FMErrors } from '@/app/api/fm/errors';

type OrderItem = {
  description: string;
  quantity: number;
  unitCost: number;
  deliveryNeed?: string;
};

type OrderDocument = {
  _id: ObjectId;
  org_id: string;
  requester: string;
  department: string;
  justification: string;
  items: OrderItem[];
  total: number;
  status: 'pending_approval' | 'submitted';
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type OrderPayload = {
  requester?: string;
  department?: string;
  justification?: string;
  items?: OrderItem[];
};

const COLLECTION = 'fm_marketplace_orders';

const sanitizePayload = (payload: OrderPayload): OrderPayload => {
  const sanitized: OrderPayload = {};
  if (payload.requester) sanitized.requester = payload.requester.trim();
  if (payload.department) sanitized.department = payload.department.trim();
  if (payload.justification) sanitized.justification = payload.justification.trim();
  if (Array.isArray(payload.items)) {
    sanitized.items = payload.items.map((item) => ({
      description: (item.description || '').trim(),
      deliveryNeed: item.deliveryNeed ? item.deliveryNeed.trim() : undefined,
      quantity: Number(item.quantity) || 0,
      unitCost: Number(item.unitCost) || 0,
    }));
  }
  return sanitized;
};

const validatePayload = (payload: OrderPayload): string | null => {
  if (!payload.requester) return 'Requester is required';
  if (!payload.department) return 'Department is required';
  if (!payload.justification || payload.justification.length < 10) return 'Justification is too short';
  if (!payload.items || !payload.items.length) return 'At least one line item is required';
  const invalidItem = payload.items.find(
    (item) => !item.description || item.quantity <= 0 || item.unitCost < 0
  );
  if (invalidItem) return 'Each line requires description, quantity > 0, and non-negative unit cost';
  return null;
};

const mapOrder = (doc: OrderDocument) => ({
  id: doc._id.toString(),
  requester: doc.requester,
  department: doc.department,
  justification: doc.justification,
  items: doc.items,
  total: doc.total,
  status: doc.status,
  createdAt: doc.createdAt,
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.MARKETPLACE, action: 'create' });
    if (actor instanceof NextResponse) return actor;

    const tenantResolution = resolveTenantId(req, actor.orgId ?? actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const total = payload.items!.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const now = new Date();
    const doc: OrderDocument = {
      _id: new ObjectId(),
      org_id: tenantId,
      requester: payload.requester!,
      department: payload.department!,
      justification: payload.justification!,
      items: payload.items!,
      total,
      status: 'pending_approval',
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<OrderDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json({ success: true, data: mapOrder(doc) }, { status: 201 });
  } catch (error) {
    logger.error('FM Marketplace Orders API - POST error', error as Error);
    return FMErrors.internalError();
  }
}
