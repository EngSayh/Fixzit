import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { Candidate } from '@/src/server/models/Candidate';
import { Application } from '@/src/server/models/Application';

/**
 * HTTP POST handler that ingests a simplified LinkedIn-style application and creates a candidate and application record as needed.
 *
 * Expects a JSON body with: `{ jobSlug, profile: { firstName?, lastName?, email, phone?, location?, linkedinUrl? }, answers? }`.
 * - Validates presence of `jobSlug` and `profile.email`.
 * - Looks up a published Job by `jobSlug`.
 * - Finds or creates a Candidate scoped to the job's organization (new candidates are tagged with source `'linkedin'`).
 * - Prevents duplicate applications for the same candidate and job; returns the existing application ID if found.
 * - Creates a new Application (stage `'applied'`, score `0`, source `'linkedin'`), includes a `candidateSnapshot` and an initial `history` entry.
 *
 * Responses:
 * - 201: application created — JSON `{ success: true, data: { applicationId } }`
 * - 200: duplicate application found — JSON `{ success: true, data: { applicationId, message: 'Already applied' } }`
 * - 400: missing required fields — JSON `{ success: false, error: 'Missing fields' }`
 * - 404: job not found — JSON `{ success: false, error: 'Job not found' }`
 * - 500: on unexpected errors — JSON `{ success: false, error: 'Failed to apply with LinkedIn' }`
 *
 * Side effects: may create Candidate and Application documents in the database.
 */
export async function POST(req: NextRequest) {
  try {
    await db();
    const { jobSlug, profile, answers } = await req.json();
    if (!jobSlug || !profile?.email) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

    const job = await Job.findOne({ slug: jobSlug, status: 'published' }).lean() as any;
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    const orgId = job?.orgId;

    let candidate = await Candidate.findByEmail(orgId, profile.email);
    if (!candidate) {
      candidate = await Candidate.create({
        orgId,
        firstName: profile.firstName,
        lastName: profile.lastName || 'NA',
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin: profile.linkedinUrl,
        source: 'linkedin'
      });
    }

    const dup = await Application.findOne({ orgId, jobId: job._id, candidateId: candidate._id });
    if (dup) return NextResponse.json({ success: true, data: { applicationId: dup._id, message: 'Already applied' } });

    const app = await Application.create({
      orgId,
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


