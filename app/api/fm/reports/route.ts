/**
 * @fileoverview FM Report Jobs API
 * @description Manages facility management report generation jobs including creation,
 * listing, and status tracking for scheduled reports.
 * 
 * @module api/fm/reports
 * @requires FM:FINANCE:EXPORT permission
 * 
 * @endpoints
 * - GET /api/fm/reports - List all report jobs for the organization
 * - POST /api/fm/reports - Queue a new report generation job
 * 
 * @security
 * - Requires FM FINANCE module EXPORT permission
 * - Tenant-scoped: Reports are isolated by organization
 * - Super Admin can access cross-tenant reports
 */
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { ModuleKey } from '@/domain/fm/fm.behavior';
import { requireFmPermission } from '@/app/api/fm/permissions';
import { FMAction } from '@/types/fm/enums';
import { resolveTenantId, buildTenantFilter, isCrossTenantMode } from '@/app/api/fm/utils/tenant';
import { FMErrors } from '@/app/api/fm/errors';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';

type ReportJobDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  name: string;
  type: string;
  format: string;
  dateRange: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  fileKey?: string;
  fileMime?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type ReportPayload = {
  title?: string;
  reportType?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  format?: string;
  notes?: string;
};

const COLLECTION = 'fm_report_jobs';

const sanitizePayload = (payload: ReportPayload): ReportPayload => {
  const sanitized: ReportPayload = {};
  if (payload.title) sanitized.title = payload.title.trim();
  if (payload.reportType) sanitized.reportType = payload.reportType.trim();
  if (payload.dateRange) sanitized.dateRange = payload.dateRange.trim();
  if (payload.startDate) sanitized.startDate = payload.startDate.trim();
  if (payload.endDate) sanitized.endDate = payload.endDate.trim();
  if (payload.format) sanitized.format = payload.format.trim().toLowerCase();
  if (payload.notes) sanitized.notes = payload.notes.trim();
  return sanitized;
};

const validatePayload = (payload: ReportPayload): string | null => {
  if (!payload.title) return 'Report title is required';
  if (!payload.reportType) return 'Report type is required';
  if (!payload.dateRange) return 'Date range is required';
  if (!payload.format) return 'Format is required';
  if (payload.dateRange === 'custom') {
    if (!payload.startDate || !payload.endDate) return 'Start and end dates are required for custom range';
    if (new Date(payload.endDate) < new Date(payload.startDate)) return 'End date cannot be before start date';
  }
  return null;
};

const mapJob = (doc: ReportJobDocument) => ({
  id: doc._id.toString(),
  name: doc.name,
  type: doc.type,
  format: doc.format,
  dateRange: doc.dateRange,
  startDate: doc.startDate,
  endDate: doc.endDate,
  notes: doc.notes,
  status: doc.status,
  fileKey: doc.fileKey,
  fileMime: doc.fileMime,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "fm-reports:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.FINANCE, action: FMAction.EXPORT });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();
    const collection = db.collection<ReportJobDocument>(COLLECTION);
    const jobs = await (/* NO_TENANT_SCOPE */ collection.find({ ...buildTenantFilter(tenantId) }))
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ success: true, data: jobs.map(mapJob) });
  } catch (error) {
    logger.error('FM Reports API - GET error', error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.FINANCE, action: FMAction.EXPORT });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    // AUDIT-2025-11-29: Reject cross-tenant mode for POST (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'Super Admin must specify tenant context for report creation' },
        { status: 400 }
      );
    }

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const now = new Date();
    const doc: ReportJobDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-29: Changed from org_id
      name: payload.title!,
      type: payload.reportType!,
      format: payload.format || 'pdf',
      dateRange: payload.dateRange || 'month',
      startDate: payload.startDate,
      endDate: payload.endDate,
      notes: payload.notes,
      status: 'queued',
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<ReportJobDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json({ success: true, data: mapJob(doc) }, { status: 201 });
  } catch (error) {
    logger.error('FM Reports API - POST error', error as Error);
    return FMErrors.internalError();
  }
}
