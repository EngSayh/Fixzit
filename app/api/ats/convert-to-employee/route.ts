import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';
import { Candidate } from '@/src/server/models/Candidate';
import { Job } from '@/src/server/models/Job';
import { Employee } from '@/src/server/models/Employee';
import { getUserFromToken } from '@/src/lib/auth';

/**
 * Convert an ATS application into an Employee record.
 *
 * Looks up the Application by `applicationId` from the request body and, if the application is in the `hired`
 * stage, creates (or returns an existing) Employee in the same organization using Candidate and Job data.
 *
 * Responses:
 * - 200 with `{ success: true, data }` when an employee is created or already exists.
 * - 400 when `applicationId` is missing, the application is not hired, or the related Candidate/Job are missing.
 * - 404 when the Application cannot be found.
 * - 500 on unexpected server errors.
 *
 * @returns A NextResponse containing a JSON payload with `success` and either `data`, `message`, or `error`.
 */
export async function POST(req: NextRequest) {
  try {
    await db();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;

    const { applicationId } = await req.json();
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId required' }, { status: 400 });

    const app = await Application.findById(applicationId).lean();
    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (app.stage !== 'hired') return NextResponse.json({ success: false, error: 'Application not hired' }, { status: 400 });

    const [cand, job] = await Promise.all([
      Candidate.findById(app.candidateId).lean() as Promise<any>,
      Job.findById(app.jobId).lean() as Promise<any>
    ]);

    if (!cand || !job) return NextResponse.json({ success: false, error: 'Candidate or Job missing' }, { status: 400 });

    const orgId = app.orgId;
    const existing = await Employee.findOne({ orgId, 'personal.email': cand.email });
    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: 'Employee already exists' });
    }

    const employee = await Employee.create({
      orgId,
      personal: {
        firstName: cand.firstName,
        lastName: cand.lastName,
        email: cand.email,
        phone: cand.phone
      },
      professional: {
        role: 'EMPLOYEE',
        department: (job as any)?.department ?? 'General',
        title: (job as any)?.title ?? 'Employee'
      },
      status: 'ACTIVE',
      metadata: {
        source: 'ats',
        jobId: job._id,
        applicationId: app._id,
        convertedBy: user?.id || 'system'
      }
    });

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('Convert to employee error:', error);
    return NextResponse.json({ success: false, error: 'Failed to convert to employee' }, { status: 500 });
  }
}


