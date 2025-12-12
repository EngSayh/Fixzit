import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { DOMAINS } from "@/lib/config/domains";

import { createSecureResponse } from "@/server/security/headers";

export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/feeds/linkedin:
 *   get:
 *     summary: feeds/linkedin operations
 *     tags: [feeds]
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
export async function GET() {
  try {
    // Check if ATS feeds are enabled
    if (process.env.ATS_ENABLED !== "true") {
      return createSecureResponse(
        { error: "ATS feeds not available in this deployment" },
        501,
      );
    }

    // Define type for job fields needed in XML
    interface JobFeedDoc {
      slug?: string;
      title?: string;
      location?: {
        city?: string;
        country?: string;
      };
      description?: string;
      jobType?: string;
      publishedAt?: Date;
      createdAt?: Date;
    }

    await connectToDatabase();
    // PUBLIC FEEDS: Intentionally cross-tenant for job aggregation.
    // This exposes only public, published jobs from all organizations
    // as part of the platform-wide careers feed. This is by design for
    // job board integrations (LinkedIn, Indeed, etc.).
    const jobs = (await Job.find({ status: "published", visibility: "public" })
      .sort({ publishedAt: -1 })
      .lean()) as JobFeedDoc[];

    const items = (jobs as JobFeedDoc[])
      .map(
        (j) => `
    <job>
      <id>${j.slug}</id>
      <title><![CDATA[${j.title}]]></title>
      <company><![CDATA[Fixzit]]></company>
      <url>${process.env.PUBLIC_BASE_URL || DOMAINS.primary}/careers/${j.slug}</url>
      <location><![CDATA[${j.location?.city || ""}, ${j.location?.country || ""}]]></location>
      <description><![CDATA[${j.description || ""}]]></description>
      <employmentType>${j.jobType}</employmentType>
      <listingType>Job Posting</listingType>
      <postedAt>${new Date(j.publishedAt || j.createdAt || Date.now()).toISOString()}</postedAt>
    </job>`,
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <jobs>
    ${items}
  </jobs>`;

    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
