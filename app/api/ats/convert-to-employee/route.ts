import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';

export async function POST(req: NextRequest) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS conversion endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await db;
    const AppMod = await import('@/src/server/models/Application').catch(() => null);
    const CandMod = await import('@/src/server/models/Candidate').catch(() => null);
    const JobMod = await import('@/src/server/models/Job').catch(() => null);
    const EmpMod = await import('@/src/server/models/Employee').catch(() => null);
    const Application = AppMod && (AppMod as any).Application;
    const Candidate = CandMod && (CandMod as any).Candidate;
    const Job = JobMod && (JobMod as any).Job;
    const Employee = EmpMod && (EmpMod as any).Employee;
    if (!Application || !Candidate || !Job || !Employee) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    if (!user?.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // Check if user has permission to convert applications to employees
    const allowedRoles = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','HR','ATS_ADMIN']);
    if (!allowedRoles.has((user as any).role || '')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const { applicationId } = await req.json();
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId required' }, { status: 400 });
    if (!/^[a-fA-F0-9]{24}$/.test(applicationId)) {
      return NextResponse.json({ success: false, error: 'Invalid applicationId' }, { status: 400 });
    }
    const app = await (Application as any).findOne({ _id: applicationId, orgId: user.tenantId }).lean();
    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (app.stage !== 'hired') return NextResponse.json({ success: false, error: 'Application not hired' }, { status: 400 });
    const [cand, job] = await Promise.all([
      (Candidate as any).findById(app.candidateId).lean(),
      (Job as any).findById(app.jobId).lean()
    ]);
    if (!cand || !job) return NextResponse.json({ success: false, error: 'Candidate or Job missing' }, { status: 400 });
    const orgId = app.orgId;
    const existing = await (Employee as any).findOne({ orgId, 'personal.email': cand.email });
    if (existing) return NextResponse.json({ success: true, data: existing, message: 'Employee already exists' });
    const employee = await (Employee as any).create({
      orgId,
      personal: { firstName: cand.firstName, lastName: cand.lastName, email: cand.email, phone: cand.phone },
      professional: { role: 'EMPLOYEE', department: job.department, title: job.title },
      status: 'ACTIVE',
      metadata: { source: 'ats', jobId: job._id, applicationId: app._id, convertedBy: user?.id || 'system' }
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to convert to employee' }, { status: 500 });
  }
}


