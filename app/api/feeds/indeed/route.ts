import { NextResponse } from 'next/server';

import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
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


