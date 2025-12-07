import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { DOMAINS } from "@/lib/config/domains";

export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/feeds/indeed:
 *   get:
 *     summary: feeds/indeed operations
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
  // Check if ATS feeds are enabled
  if (process.env.ATS_ENABLED !== "true") {
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
    <source>
      <publisher>Fixzit</publisher>
      <publisherurl>${process.env.PUBLIC_BASE_URL || DOMAINS.primary}/careers</publisherurl>
      <error>ATS feeds not available in this deployment</error>
    </source>`;
    return new NextResponse(errorXml, {
      status: 501,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  // Define type for job fields needed in XML
  interface JobFeedDoc {
    title?: string;
    publishedAt?: Date;
    createdAt?: Date;
    slug?: string;
    location?: {
      city?: string;
      country?: string;
    };
    description?: string;
    salaryRange?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    jobType?: string;
    department?: string;
  }

  try {
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
      <title><![CDATA[${j.title}]]></title>
      <date>${new Date(j.publishedAt || j.createdAt || Date.now()).toUTCString()}</date>
      <referencenumber>${j.slug}</referencenumber>
      <url>${process.env.PUBLIC_BASE_URL || DOMAINS.primary}/careers/${j.slug}</url>
      <company><![CDATA[Fixzit]]></company>
      <city><![CDATA[${j.location?.city || ""}]]></city>
      <country><![CDATA[${j.location?.country || ""}]]></country>
      <description><![CDATA[${j.description || ""}]]></description>
      <salary><![CDATA[${j.salaryRange?.min || ""}-${j.salaryRange?.max || ""} ${j.salaryRange?.currency || "SAR"}]]></salary>
      <jobtype>${j.jobType}</jobtype>
      <category><![CDATA[${j.department || "General"}]]></category>
    </job>`,
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <source>
      <publisher>Fixzit</publisher>
      <publisherurl>${process.env.PUBLIC_BASE_URL || DOMAINS.primary}/careers</publisherurl>
      ${items}
    </source>`;

    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    logger.error(
      "Failed to fetch jobs:",
      error instanceof Error ? error.message : "Unknown error",
    );
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
    <source>
      <publisher>Fixzit</publisher>
      <publisherurl>${process.env.PUBLIC_BASE_URL || DOMAINS.primary}/careers</publisherurl>
      <error>Failed to fetch jobs</error>
    </source>`;
    return new NextResponse(errorXml, {
      status: 500,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
}
