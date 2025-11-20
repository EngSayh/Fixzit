import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { ModuleKey } from '@/domain/fm/fm.behavior';
import { requireFmPermission } from '@/app/api/fm/permissions';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { FMErrors } from '@/app/api/fm/errors';
import { getPresignedGetUrl, putObjectBuffer } from '@/lib/storage/s3';

type ReportJob = {
  _id: { toString(): string };
  org_id: string;
  name: string;
  type: string;
  format: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  fileKey?: string;
  fileMime?: string;
};

const COLLECTION = 'fm_report_jobs';

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, { module: ModuleKey.FINANCE, action: 'export' });
    if (actor instanceof NextResponse) return actor;

    const tenantResolution = resolveTenantId(req, actor.orgId ?? actor.tenantId);
    if ('error' in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();
    const collection = db.collection<ReportJob>(COLLECTION);
    const queued = await collection.find({ org_id: tenantId, status: 'queued' }).limit(5).toArray();

    if (!queued.length) {
      return NextResponse.json({ success: true, processed: 0, message: 'No queued jobs' });
    }

    let processed = 0;
    for (const job of queued) {
      const id = job._id.toString();
      const key = `${tenantId}/reports/${id}.csv`;
      const content = [
        `Report ID,${id}`,
        `Name,${job.name}`,
        `Type,${job.type}`,
        `Format,${job.format}`,
        `DateRange,${job.startDate || ''},${job.endDate || ''}`,
        `GeneratedAt,${new Date().toISOString()}`,
      ].join('\n');

      try {
        await collection.updateOne({ _id: job._id }, { $set: { status: 'processing' } });
        await putObjectBuffer(key, Buffer.from(content, 'utf-8'), 'text/csv');
        await collection.updateOne(
          { _id: job._id },
          {
            $set: {
              status: 'ready',
              fileKey: key,
              fileMime: 'text/csv',
              updatedAt: new Date(),
            },
          }
        );
        processed += 1;
      } catch (err) {
        logger.error('FM Reports worker failed to process job', err as Error, { jobId: id });
        await collection.updateOne(
          { _id: job._id },
          { $set: { status: 'failed', updatedAt: new Date(), notes: `Error: ${String(err)}` } }
        );
      }
    }

    // Provide presigned URLs for the newly processed jobs
    const ready = await collection.find({ org_id: tenantId, status: 'ready' }).sort({ updatedAt: -1 }).limit(5).toArray();
    const urls = await Promise.all(
      ready.map(async (job) => ({
        id: job._id.toString(),
        fileKey: job.fileKey,
        downloadUrl: job.fileKey ? await getPresignedGetUrl(job.fileKey, 600) : null,
      }))
    );

    return NextResponse.json({ success: true, processed, ready: urls });
  } catch (error) {
    logger.error('FM Reports worker API - POST error', error as Error);
    return FMErrors.internalError();
  }
}
