import { NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns an XML feed of public, published job listings formatted for LinkedIn.
 *
 * During a production build phase (`NEXT_PHASE === 'phase-production-build'`) this returns an empty `<jobs>` XML payload to avoid database access. Otherwise it ensures the database connection, queries `Job` documents with `status: 'published'` and `visibility: 'public'` (sorted by `publishedAt` desc), and renders each job as a `<job>` element containing `id` (slug), `title`, `company` (fixed to "Fixzit"), `url` (built from `PUBLIC_BASE_URL` or `https://fixzit.co`), `location` (city, country), `description`, `employmentType`, `listingType` ("Job Posting"), and `postedAt` (ISO timestamp from `publishedAt` or `createdAt`). The response is returned with Content-Type `application/xml; charset=utf-8`.
 *
 * @returns A NextResponse containing the generated XML feed.
 */
export async function GET() {
  // Avoid DB access during static build/export
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<jobs></jobs>`;
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }
  await db();
  const jobs = await Job.find({ status: 'published', visibility: 'public' })
    .sort({ publishedAt: -1 })
    .lean();

  const items = jobs.map((j: any) => `
    <job>
      <id>${j.slug}</id>
      <title><![CDATA[${j.title}]]></title>
      <company><![CDATA[Fixzit]]></company>
      <url>${process.env.PUBLIC_BASE_URL || 'https://fixzit.co'}/careers/${j.slug}</url>
      <location><![CDATA[${j.location?.city || ''}, ${j.location?.country || ''}]]></location>
      <description><![CDATA[${j.description || ''}]]></description>
      <employmentType>${j.jobType}</employmentType>
      <listingType>Job Posting</listingType>
      <postedAt>${new Date(j.publishedAt || j.createdAt).toISOString()}</postedAt>
    </job>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <jobs>
    ${items}
  </jobs>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}


