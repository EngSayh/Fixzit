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
  status: 'queued' | 'processing' | 'ready' | 'failed';
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
export async function GET(req: NextRequest) {
  try {
    const session = await getSuperadminSession(req);
    
    if (!session) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-AUTH-001', message: 'Superadmin access required' } },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<ReportJobDocument>(COLLECTION);
    
    // Cross-tenant query - no orgId filter for superadmin
    const jobs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    logger.info('[SUPERADMIN] Reports fetched', {
      userId: session.username,
      count: jobs.length,
    });

    return NextResponse.json({ 
      success: true, 
      reports: jobs.map(mapJob),
      total: jobs.length,
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

    if (!title || !reportType || !dateRange) {
      return NextResponse.json(
        { error: { code: 'FIXZIT-API-003', message: 'Missing required fields: title, reportType, dateRange' } },
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
