import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';
import { Candidate } from '@/src/server/models/Candidate';
import { Job } from '@/src/server/models/Job';
import { Employee } from '@/src/server/models/Employee';
import { getUserFromToken } from '@/src/lib/auth';

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
    if ((app as any).stage !== 'hired') return NextResponse.json({ success: false, error: 'Application not hired' }, { status: 400 });

    const [cand, job] = await Promise.all([
      Candidate.findById((app as any).candidateId).lean(),
      Job.findById((app as any).jobId).lean()
    ]);
    if (!cand || !job) return NextResponse.json({ success: false, error: 'Candidate or Job missing' }, { status: 400 });

    const orgId = (app as any).orgId;
    const existing = await Employee.findOne({ orgId, 'personal.email': (cand as any).email });
    if (existing) return NextResponse.json({ success: true, data: existing, message: 'Employee already exists' });

    const employee = await Employee.create({
      orgId,
      personal: { firstName: (cand as any).firstName, lastName: (cand as any).lastName, email: (cand as any).email, phone: (cand as any).phone },
      professional: { role: 'EMPLOYEE', department: (job as any).department, title: (job as any).title },
      status: 'ACTIVE',
      metadata: { source: 'ats', jobId: (job as any)._id, applicationId: (app as any)._id, convertedBy: user?.id || 'system' }
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('Convert to employee error:', error);
    return NextResponse.json({ success: false, error: 'Failed to convert to employee' }, { status: 500 });
  }
}


