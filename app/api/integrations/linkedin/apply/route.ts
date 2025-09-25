import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { Candidate } from '@/src/server/models/Candidate';
import { Application } from '@/src/server/models/Application';
import { z } from 'zod';
import crypto from 'crypto';

const LINKEDIN_SECRET = process.env.LINKEDIN_WEBHOOK_SECRET;

const ApplySchema = z.object({
  jobSlug: z.string().trim().min(1).max(128).regex(/^[a-z0-9-]+$/i),
  profile: z.object({
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(32).optional(),
    location: z.string().trim().max(128).optional(),
    linkedinUrl: z.string().url().max(2048).optional()
  }),
  answers: z.array(z.unknown()).max(100).optional()
});

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
    if (LINKEDIN_SECRET) {
      const provided = req.headers.get('x-linkedin-signature') || '';
      const expected = LINKEDIN_SECRET;
      const match =
        provided.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
      if (!match) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const parsed = ApplySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const { jobSlug, profile, answers } = parsed.data;
    const normalizedEmail = profile.email.trim().toLowerCase();

    const job = await Job.findOne({ slug: jobSlug, status: 'published' }).lean() as any;
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    const orgId = job?.orgId;

    const candidate = await Candidate.findOneAndUpdate(
      { orgId, email: normalizedEmail },
      {
        $setOnInsert: {
          orgId,
          firstName: profile.firstName?.trim(),
          lastName: (profile.lastName ?? 'NA')?.trim(),
          email: normalizedEmail,
          phone: profile.phone?.trim(),
          location: profile.location?.trim(),
          linkedin: profile.linkedinUrl,
          source: 'linkedin'
        }
      },
      { new: true, upsert: true }
    );

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


