import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { Candidate } from '@/src/server/models/Candidate';
import { Application } from '@/src/server/models/Application';

export async function POST(req: NextRequest) {
  try {
  await db;
    const { jobSlug, profile, answers } = await req.json();
    if (!jobSlug || !profile?.email) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

    const job = await Job.findOne({ slug: jobSlug, status: 'published' }).lean();
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

    let candidate = await Candidate.findByEmail(job.orgId, profile.email);
    if (!candidate) {
      candidate = await Candidate.create({
        orgId: job.orgId,
        firstName: profile.firstName,
        lastName: profile.lastName || 'NA',
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin: profile.linkedinUrl,
        source: 'linkedin'
      });
    }

    const dup = await Application.findOne({ orgId: job.orgId, jobId: job._id, candidateId: candidate._id });
    if (dup) return NextResponse.json({ success: true, data: { applicationId: dup._id, message: 'Already applied' } });

    const app = await Application.create({
      orgId: job.orgId,
      jobId: job._id,
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


