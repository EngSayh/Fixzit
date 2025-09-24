import { NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';

export async function GET() {
  await db;
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


