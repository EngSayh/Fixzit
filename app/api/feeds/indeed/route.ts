import { NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET handler that returns an XML jobs feed for Indeed-like consumers.
 *
 * During Next.js production build (when NEXT_PHASE === 'phase-production-build') this returns
 * a minimal XML containing only publisher metadata to avoid database access. Otherwise it
 * connects to the database, fetches jobs with status "published" and visibility "public"
 * (sorted by publishedAt descending), and returns an XML <source> document with one <job>
 * entry per job.
 *
 * Each <job> element includes: title, date (UTC), referencenumber (slug), url (PUBLIC_BASE_URL/careers/{slug}
 * or https://fixzit.co fallback), company ("Fixzit"), city, country, description, salary
 * (min-max and currency, with currency defaulting to "SAR"), jobtype, and category
 * (department or "General").
 *
 * @returns A NextResponse containing the XML feed with Content-Type "application/xml; charset=utf-8".
 */
export async function GET() {
  // Avoid DB access during static build/export
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<source>\n  <publisher>Fixzit</publisher>\n  <publisherurl>${process.env.PUBLIC_BASE_URL || 'https://fixzit.co'}/careers</publisherurl>\n</source>`;
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }
  await db();
  const jobs = await Job.find({ status: 'published', visibility: 'public' })
    .sort({ publishedAt: -1 })
    .lean();

  const items = jobs.map((j: any) => `
    <job>
      <title><![CDATA[${j.title}]]></title>
      <date>${new Date(j.publishedAt || j.createdAt).toUTCString()}</date>
      <referencenumber>${j.slug}</referencenumber>
      <url>${process.env.PUBLIC_BASE_URL || 'https://fixzit.co'}/careers/${j.slug}</url>
      <company><![CDATA[Fixzit]]></company>
      <city><![CDATA[${j.location?.city || ''}]]></city>
      <country><![CDATA[${j.location?.country || ''}]]></country>
      <description><![CDATA[${j.description || ''}]]></description>
      <salary><![CDATA[${j.salaryRange?.min || ''}-${j.salaryRange?.max || ''} ${j.salaryRange?.currency || 'SAR'}]]></salary>
      <jobtype>${j.jobType}</jobtype>
      <category><![CDATA[${j.department || 'General'}]]></category>
    </job>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <source>
    <publisher>Fixzit</publisher>
    <publisherurl>${process.env.PUBLIC_BASE_URL || 'https://fixzit.co'}/careers</publisherurl>
    ${items}
  </source>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}


