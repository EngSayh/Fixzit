import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { submitApplicationFromForm, ApplicationSubmissionError } from '@/server/services/ats/application-intake';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';
import { logger } from '@/lib/logger';

/**
 * @openapi
 * /api/ats/jobs/[id]/apply:
 *   post:
 *     summary: ats/jobs/[id]/apply operations
 *     tags: [ats]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;

  try {
    await connectToDatabase();

    const formData = await req.formData();
    const job = await (Job as any).findById(params.id);

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const skillsRaw = String(formData.get('skills') || '');
    const skills = skillsRaw
      ? skillsRaw
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [];

    const experienceRaw = String(formData.get('experience') || '').trim();
    const experienceYears = experienceRaw ? Number.parseInt(experienceRaw, 10) : undefined;
    const resumeFile = formData.get('resume') as File | null;
    const resumePayload = resumeFile && resumeFile.size > 0
      ? {
          buffer: Buffer.from(await resumeFile.arrayBuffer()),
          filename: resumeFile.name,
          mimeType: resumeFile.type,
        }
      : undefined;

    const phoneE164 = String(formData.get('phoneE164') || '').trim();

    try {
      const result = await submitApplicationFromForm({
        job,
        resumeFile: resumePayload,
        source: 'careers',
        fields: {
          firstName: (formData.get('firstName') as string | null) || undefined,
          lastName: (formData.get('lastName') as string | null) || undefined,
          fullName: (formData.get('fullName') as string | null) || undefined,
          email: (formData.get('email') as string | null) || undefined,
          phone: phoneE164 || ((formData.get('phone') as string | null) || undefined),
          location: (formData.get('location') as string | null) || undefined,
          coverLetter: (formData.get('coverLetter') as string | null) || undefined,
          skills,
          experience: Number.isFinite(experienceYears ?? NaN) ? experienceYears : undefined,
          linkedin: (formData.get('linkedin') as string | null) || undefined,
          consent: String(formData.get('consent') || 'true') === 'true',
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            applicationId: result.applicationId,
            status: result.stage,
            score: result.score,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ApplicationSubmissionError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Job application error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
