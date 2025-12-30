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
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const CreateFooterLinkSchema = z.object({
  label: z.string().min(1).max(100),
  labelAr: z.string().max(100).optional(),
  url: z.string().min(1),
  section: z.enum(["company", "support", "legal", "social"]),
  icon: z.string().optional(),
  isExternal: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

// Default footer links to seed if collection is empty
const DEFAULT_FOOTER_LINKS = [
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
 * Seed default footer links if collection is empty
 */
async function seedDefaultLinksIfEmpty(): Promise<void> {
  // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide content
  const count = await FooterLink.countDocuments({});
  if (count === 0) {
    logger.info("[FooterLinks] Seeding default footer links");
    await FooterLink.insertMany(DEFAULT_FOOTER_LINKS);
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
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
