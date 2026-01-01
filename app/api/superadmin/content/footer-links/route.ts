/**
 * @fileoverview Superadmin Footer Links API
 * @description Footer navigation links management
 * @route GET/POST /api/superadmin/content/footer-links
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/footer-links
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { FooterLink } from "@/server/models/FooterLink";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const CreateFooterLinkSchema = z.object({
  label: z.string().trim().min(1).max(100),
  labelAr: z.string().trim().max(100).optional(),
  url: z.string().trim().min(1).refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: "URL must be a valid relative path or absolute URL" }
  ),
  section: z.enum(["company", "support", "legal", "social"]),
  icon: z.string().trim().optional(),
  isExternal: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

type FooterLinkSection = "company" | "support" | "legal" | "social";

// Default footer links to seed if collection is empty
const DEFAULT_FOOTER_LINKS: Array<{
  label: string;
  labelAr: string;
  url: string;
  section: FooterLinkSection;
  sortOrder: number;
  icon?: string;
  isExternal?: boolean;
}> = [
  { label: "About Us", labelAr: "من نحن", url: "/about", section: "company", sortOrder: 1 },
  { label: "Careers", labelAr: "الوظائف", url: "/careers", section: "company", sortOrder: 2 },
  { label: "Contact", labelAr: "اتصل بنا", url: "/contact", section: "company", sortOrder: 3 },
  { label: "Help Center", labelAr: "مركز المساعدة", url: "/help", section: "support", sortOrder: 1 },
  { label: "FAQs", labelAr: "الأسئلة الشائعة", url: "/faq", section: "support", sortOrder: 2 },
  { label: "Privacy Policy", labelAr: "سياسة الخصوصية", url: "/privacy", section: "legal", sortOrder: 1 },
  { label: "Terms of Service", labelAr: "شروط الخدمة", url: "/terms", section: "legal", sortOrder: 2 },
  { label: "Twitter", labelAr: "تويتر", url: "https://twitter.com/fixzit", section: "social", icon: "twitter", isExternal: true, sortOrder: 1 },
  { label: "LinkedIn", labelAr: "لينكد إن", url: "https://linkedin.com/company/fixzit", section: "social", icon: "linkedin", isExternal: true, sortOrder: 2 },
];

/**
 * Seed default footer links if collection is empty.
 * Uses atomic upserts to prevent race conditions under concurrent requests.
 * SUPER_ADMIN: Platform-wide content (no tenant scope required)
 */
async function seedDefaultLinksIfEmpty(): Promise<void> {
  // Use bulkWrite with upserts keyed on (label, section, url) to ensure idempotent seeding
  const bulkOps = DEFAULT_FOOTER_LINKS.map((link) => ({
    updateOne: {
      filter: { label: link.label, section: link.section, url: link.url },
      update: { $setOnInsert: { ...link, createdAt: new Date(), updatedAt: new Date() } },
      upsert: true,
    },
  }));

  const result = await FooterLink.bulkWrite(bulkOps, { ordered: false });
  if (result.upsertedCount > 0) {
    logger.info("[FooterLinks] Seeded default footer links", { upserted: result.upsertedCount });
  }
}

/**
 * GET /api/superadmin/content/footer-links
 * List all footer links, optionally filtered by section
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-links:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();
    
    // Seed defaults if empty
    await seedDefaultLinksIfEmpty();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    // Build query
    const filter: Record<string, unknown> = {};
    if (section && section !== "all") {
      filter.section = section;
    }

    // Platform-wide footer links (no tenant scope required - singleton content)
    const links = await FooterLink.find(filter)
      .sort({ section: 1, sortOrder: 1 })
      .lean();

    logger.debug("[Superadmin:FooterLinks] Fetched links", {
      count: links.length,
      section: section || "all",
      by: session.username,
    });

    return NextResponse.json(
      { links },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLinks] Failed to load links", { error });
    return NextResponse.json(
      { error: "Failed to load footer links" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/content/footer-links
 * Create a new footer link
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-footer-links:post",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe(request, {
      logPrefix: "[Superadmin:FooterLinks]",
    });
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = CreateFooterLinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Platform-wide footer links (no tenant scope required - singleton content)
    const link = await FooterLink.create(validation.data);

    logger.info("[Superadmin:FooterLinks] Link created", {
      linkId: link._id,
      label: validation.data.label,
      section: validation.data.section,
      by: session.username,
    });

    return NextResponse.json(
      { link, message: "Footer link created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FooterLinks] Failed to create link", { error });
    return NextResponse.json(
      { error: "Failed to create footer link" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
