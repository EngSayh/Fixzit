import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from '@/server/models/Application';
import { Candidate } from '@/server/models/Candidate';
import { Job } from '@/server/models/Job';
import { Employee } from '@/server/models/Employee';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getSessionUser(req);
    
    

    // Verify user authentication
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions (admin or HR role can convert applications)
    // Check if user has permission to convert applications
    const canConvertApplications = ['corporate_admin', 'hr_manager'].includes(user.role);
    
    if (!canConvertApplications) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { applicationId } = await req.json();
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId required' }, { status: 400 });

    const app = await Application.findById(applicationId).lean();
    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });

    // Verify org authorization (only admin can access cross-org)
    if (app.orgId !== user.orgId && user.role !== 'ADMIN' as any) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (app.stage !== 'hired') return NextResponse.json({ success: false, error: 'Application not hired' }, { status: 400 });

    const [cand, job] = await Promise.all([
      Candidate.findById(app.candidateId).lean(),
      Job.findById(app.jobId).lean()
    ]);
    if (!cand || !job) return NextResponse.json({ success: false, error: 'Candidate or Job missing' }, { status: 400 });

    const orgId = app.orgId;
    const existing = await Employee.findOne({ orgId, 'personal.email': cand.email }).lean();
    if (existing) return NextResponse.json({ success: true, data: existing, message: 'Employee already exists' });

    const employee = await Employee.create({
      orgId,
      personal: { firstName: cand.firstName, lastName: cand.lastName, email: cand.email, phone: cand.phone },
      professional: { role: 'EMPLOYEE', department: job.department, title: job.title },
      status: 'ACTIVE',
      metadata: { source: 'ats', jobId: job._id.toString(), applicationId: app._id.toString(), convertedBy: user?.id || 'system' }
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('Convert to employee error:', error);
    return NextResponse.json({ success: false, error: 'Failed to convert to employee' }, { status: 500 });
  }
}




