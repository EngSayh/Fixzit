/**
 * @fileoverview Superadmin Reports API
 * @description Cross-tenant report access for superadmin users.
 * 
 * @module api/superadmin/reports
 * @requires isSuperAdmin session flag
 * 
 * @endpoints
 * - GET /api/superadmin/reports - List all report jobs across tenants
 * - POST /api/superadmin/reports - Queue a new report generation job
 * 
 * @security
 * - Requires superadmin session (session.user.isSuperAdmin === true)
 * - Returns cross-tenant report data
 */
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';

type ReportJobDocument = {
  _id: ObjectId;
  orgId: string;
  name: string;
  type: string;
  format: string;
  dateRange: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  fileKey?: string;
  fileMime?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION = 'fm_report_jobs';

const mapJob = (doc: ReportJobDocument) => ({
  _id: doc._id.toString(),
  orgId: doc.orgId,
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
  generatedAt: doc.createdAt,
});

/**
 * GET /api/superadmin/reports
 * Returns all report jobs across all tenants (superadmin only)
 */
export async function GET(_req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(_req, { requests: 30, windowMs: 60_000, keyPrefix: "superadmin:reports" });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  try {
    const session = await getSuperadminSession(_req);
    
    if (!session) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-AUTH-001', message: 'Superadmin access required' } },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<ReportJobDocument>(COLLECTION);
    
    // Cross-tenant query - superadmin reports require platform-wide access
    const [jobs, total] = await Promise.all([
      // eslint-disable-next-line local/require-tenant-scope -- superadmin cross-tenant reports
      collection
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      // eslint-disable-next-line local/require-tenant-scope -- superadmin cross-tenant reports
      collection.countDocuments({}),
    ]);

    logger.info('[SUPERADMIN] Reports fetched', {
      userId: session.username,
      returned: jobs.length,
      total,
    });

    return NextResponse.json({ 
      success: true, 
      reports: jobs.map(mapJob),
      returned: jobs.length,
      total,
    });
  } catch (error) {
    logger.error('[SUPERADMIN] Failed to fetch reports', { error });
    return NextResponse.json(
      { error: { code: 'FIXZIT-API-001', message: 'Failed to fetch reports' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/reports
 * Queue a new cross-tenant report generation job
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSuperadminSession(req);
    
    if (!session) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-AUTH-001', message: 'Superadmin access required' } },
        { status: 401 }
      );
    }

    // Rate limiting for report creation - 10 requests per minute per superadmin
    const rateLimitKey = session.username || "unknown";
    const rateLimitResponse = await enforceRateLimit(req, {
      identifier: rateLimitKey,
      keyPrefix: "superadmin:reports:post",
      requests: 10,
      windowMs: 60_000,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-002', message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }

    const { title, reportType, dateRange, format = 'csv', notes } = body;

    // Validate required fields
    if (!title || !reportType || !dateRange) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-003', message: 'Missing required fields: title, reportType, dateRange' } },
        { status: 400 }
      );
    }
    
    // Validate format is allowed
    const allowedFormats = ['csv', 'pdf'];
    if (!allowedFormats.includes(format)) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-004', message: `Invalid format. Allowed: ${allowedFormats.join(', ')}` } },
        { status: 400 }
      );
    }
    
    // Validate field lengths (trim and check)
    const trimmedTitle = String(title).trim();
    const trimmedReportType = String(reportType).trim();
    const trimmedDateRange = String(dateRange).trim();
    const trimmedNotes = notes ? String(notes).trim() : undefined;
    
    if (trimmedTitle.length > 255) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-005', message: 'title exceeds maximum length of 255 characters' } },
        { status: 400 }
      );
    }
    if (trimmedReportType.length > 100) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-005', message: 'reportType exceeds maximum length of 100 characters' } },
        { status: 400 }
      );
    }
    if (trimmedDateRange.length > 100) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-005', message: 'dateRange exceeds maximum length of 100 characters' } },
        { status: 400 }
      );
    }
    if (trimmedNotes && trimmedNotes.length > 2000) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-005', message: 'notes exceeds maximum length of 2000 characters' } },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<ReportJobDocument>(COLLECTION);

    const newJob: Omit<ReportJobDocument, '_id'> = {
      orgId: 'SUPERADMIN', // Cross-tenant marker
      name: title,
      type: reportType,
      format,
      dateRange,
      notes,
      status: 'queued',
      createdBy: session.username,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newJob as ReportJobDocument);

    logger.info('[SUPERADMIN] Report job created', {
      userId: session.username,
      jobId: result.insertedId.toString(),
      reportType,
    });

    return NextResponse.json({ 
      success: true, 
      jobId: result.insertedId.toString(),
      message: 'Report job queued successfully',
    });
  } catch (error) {
    logger.error('[SUPERADMIN] Failed to create report job', { error });
    return NextResponse.json(
      { error: { code: 'FIXZIT-API-001', message: 'Failed to create report job' } },
      { status: 500 }
    );
  }
}
