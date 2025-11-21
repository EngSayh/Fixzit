import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { ModuleKey } from '@/domain/fm/fm.behavior';
import { FMAction } from '@/types/fm/enums';
import { requireFmPermission } from '@/app/api/fm/permissions';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { FMErrors } from '@/app/api/fm/errors';

type EscalationDocument = {
  _id: ObjectId;
  org_id: string;
  incidentId: string;
  service: string;
  areas?: string;
  severity: string;
  detectedAt?: string;
  summary: string;
  symptoms: string;
  mitigation?: string;
  blockers?: string;
  executiveBrief?: string;
  stakeholders?: string;
  preferredChannel: string;
  requiresDowntime: boolean;
  needsCustomerComms: boolean;
  legalReview: boolean;
  status: 'submitted' | 'acked';
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type EscalationPayload = Partial<EscalationDocument>;

const COLLECTION = 'fm_support_escalations';

const sanitizePayload = (payload: EscalationPayload): EscalationPayload => ({
  incidentId: payload.incidentId?.trim(),
  service: payload.service?.trim(),
  areas: payload.areas?.trim(),
  severity: payload.severity?.trim(),
  detectedAt: payload.detectedAt?.trim(),
  summary: payload.summary?.trim(),
  symptoms: payload.symptoms?.trim(),
  mitigation: payload.mitigation?.trim(),
  blockers: payload.blockers?.trim(),
  executiveBrief: payload.executiveBrief?.trim(),
  stakeholders: payload.stakeholders?.trim(),
  preferredChannel: payload.preferredChannel?.trim(),
  requiresDowntime: Boolean(payload.requiresDowntime),
  needsCustomerComms: Boolean(payload.needsCustomerComms),
  legalReview: Boolean(payload.legalReview),
});

const validatePayload = (payload: EscalationPayload): string | null => {
  if (!payload.incidentId) return 'Incident ID is required';
  if (!payload.service) return 'Service is required';
  if (!payload.summary || payload.summary.length < 20) return 'Summary must be at least 20 characters';
  if (!payload.symptoms || payload.symptoms.length < 10) return 'Symptoms are required';
  if (!payload.severity) return 'Severity is required';
  if (!payload.preferredChannel) return 'Preferred channel is required';
  return null;
};

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.SUPPORT, action: FMAction.CREATE });
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
    const doc: EscalationDocument = {
      _id: new ObjectId(),
      org_id: tenantId,
      incidentId: payload.incidentId!,
      service: payload.service!,
      areas: payload.areas,
      severity: payload.severity || 'critical',
      detectedAt: payload.detectedAt,
      summary: payload.summary!,
      symptoms: payload.symptoms!,
      mitigation: payload.mitigation,
      blockers: payload.blockers,
      executiveBrief: payload.executiveBrief,
      stakeholders: payload.stakeholders,
      preferredChannel: payload.preferredChannel || 'bridge',
      requiresDowntime: Boolean(payload.requiresDowntime),
      needsCustomerComms: Boolean(payload.needsCustomerComms),
      legalReview: Boolean(payload.legalReview),
      status: 'submitted',
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<EscalationDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json({ success: true, data: { id: doc._id.toString() } }, { status: 201 });
  } catch (error) {
    logger.error('FM Support Escalations API - POST error', error as Error);
    return FMErrors.internalError();
  }
}
