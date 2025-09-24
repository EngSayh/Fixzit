import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { generateSlug } from '@/src/lib/utils';

/**
 * Handle POST requests to create a public job submission for moderation.
 *
 * Creates a Job document scoped to the platform organization (determined by
 * NEXT_PUBLIC_ORG_ID, defaulting to "fixzit-platform"), ensures a unique slug
 * derived from the provided title (appends a numeric suffix on collision),
 * and applies sensible defaults for missing fields (department, jobType,
 * location, salaryRange, arrays, etc.). The created job is stored with
 * status "pending", visibility "public", and postedBy "public".
 *
 * Returns a JSON NextResponse with status 201 and the created job on success,
 * or status 500 and an error message on failure.
 */
export async function POST(req: NextRequest) {
  try {
    await db();
    const body = await req.json();
    const platformOrg = process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    const baseSlug = generateSlug(body.title || 'job');
    let slug = baseSlug;
    let counter = 1;
    while (await Job.findOne({ orgId: platformOrg, slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    const job = await Job.create({
      orgId: platformOrg,
      title: body.title,
      department: body.department || 'General',
      jobType: body.jobType || 'full-time',
      location: body.location || { city: body.city || '', country: body.country || '', mode: body.mode || 'onsite' },
      salaryRange: body.salaryRange || { min: 0, max: 0, currency: 'SAR' },
      description: body.description || '',
      requirements: body.requirements || [],
      benefits: body.benefits || [],
      skills: body.skills || [],
      tags: body.tags || [],
      status: 'pending',
      visibility: 'public',
      slug,
      postedBy: 'public'
    });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error('Public post error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit job' }, { status: 500 });
  }
}


