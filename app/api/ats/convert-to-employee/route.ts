import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';
import { Candidate } from '@/src/server/models/Candidate';
import { Job } from '@/src/server/models/Job';
import { Employee } from '@/src/server/models/Employee';
import { getUserFromToken } from '@/src/lib/auth';

/**
 * Convert a hired application into an Employee record for the authenticated user's organization.
 *
 * Expects a JSON body with `{ applicationId }`. The request must include a valid authorization
 * token. The endpoint verifies that the application exists, belongs to the caller's org, and
 * has stage `"hired"`. It ensures the referenced Candidate and Job exist and prevents creating
 * a duplicate Employee (same orgId and candidate email). On success returns the created Employee
 * document (or the existing Employee if one already exists).
 *
 * Responses:
 * - 200: { success: true, data: Employee } — employee created or existing employee returned
 * - 400: missing `applicationId`, application not hired, or missing candidate/job
 * - 401: unauthorized (missing/invalid token)
 * - 403: authenticated user does not belong to the application's org
 * - 404: application not found
 * - 500: server error while converting
 */
export async function POST(req: NextRequest) {
  try {
    await db;
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // RBAC: only privileged roles may convert
    const allowed = new Set(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'RECRUITER_LEAD']);
    if (!allowed.has(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { applicationId } = await req.json();
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId required' }, { status: 400 });

    const app = await Application.findById(applicationId).lean();
    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (app.stage !== 'hired') return NextResponse.json({ success: false, error: 'Application not hired' }, { status: 400 });
    if (String((app as any).orgId) !== String(user.tenantId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const [cand, job] = await Promise.all([
      Candidate.findById(app.candidateId).lean(),
      Job.findById(app.jobId).lean()
    ]);
    if (!cand || !job) return NextResponse.json({ success: false, error: 'Candidate or Job missing' }, { status: 400 });

    if (!cand.email) {
      return NextResponse.json({ success: false, error: 'Candidate email missing' }, { status: 400 });
    }
    const orgId = (app as any).orgId;
    const filter = { orgId, 'personal.email': cand.email };
    const upsertUpdate = {
      $setOnInsert: {
        orgId,
        personal: { firstName: cand.firstName, lastName: cand.lastName, email: cand.email, phone: cand.phone },
        professional: { role: 'EMPLOYEE', department: job.department, title: job.title },
        status: 'ACTIVE',
        metadata: { source: 'ats', jobId: job._id, applicationId: app._id, convertedBy: user.id }
      }
    };
    const result: any = await Employee.findOneAndUpdate(filter, upsertUpdate, {
      new: true,
      upsert: true,
      rawResult: true,
      setDefaultsOnInsert: true
    });
    const employee = result.value;
    const created = !!result?.lastErrorObject?.upserted;
    return NextResponse.json({ success: true, data: employee }, { status: created ? 201 : 200 });
  } catch (error: any) {
    if (error?.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid applicationId' },
        { status: 400 }
      );
    }
    console.error('Convert to employee error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert to employee' },
      { status: 500 }
    );
  }
}


