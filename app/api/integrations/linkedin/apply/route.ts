import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { Job } from '@/db/models/Job';
import { Candidate } from '@/db/models/Candidate';
import { Application } from '@/db/models/Application';

export async function POST(req: NextRequest) {
  try {
    // Check if LinkedIn integration is enabled
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'LinkedIn integration not available in this deployment' }, { status: 501 });
    }

    await connectMongo();
    const { jobSlug, profile, answers } = await req.json();
    if (!jobSlug || !profile?.email) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

    const job = await Job.findOne({ slug: jobSlug, status: 'published' }).lean();
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

    let candidate = await (Candidate as any).findByEmail((job as any).orgId, profile.email);
    if (!candidate) {
      candidate = await Candidate.create({
        orgId: (job as any).orgId,
        firstName: profile.firstName,
        lastName: profile.lastName || 'NA',
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin: profile.linkedinUrl,
        source: 'linkedin'
      });
    }

    const orgId = (job as any).orgId;
    const jobId = (job as any)._id;
    
    const dup = await Application.findOne({ orgId, jobId, candidateId: candidate._id });
    if (dup) return NextResponse.json({ success: true, data: { applicationId: dup._id, message: 'Already applied' } });

    const app = await Application.create({
      orgId,
      jobId,
      candidateId: candidate._id,
      stage: 'applied',
      score: 0,
      source: 'linkedin',
      answers: answers || [],
      candidateSnapshot: {
        fullName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        skills: candidate.skills || [],
        experience: candidate.experience || 0
      },
      history: [{ action: 'applied', by: 'candidate', at: new Date() }]
    });

    return NextResponse.json({ success: true, data: { applicationId: app._id } }, { status: 201 });
  } catch (error) {
    console.error('LinkedIn apply error:', error);
    return NextResponse.json({ success: false, error: 'Failed to apply with LinkedIn' }, { status: 500 });
  }
}


