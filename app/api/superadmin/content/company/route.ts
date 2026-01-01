/**
 * @fileoverview Superadmin Company Info API
 * @description Manage company contact and branding information
 * @route GET, PUT /api/superadmin/content/company
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/company
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { CompanyInfo } from "@/server/models/CompanyInfo";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const SocialLinksSchema = z.object({
  twitter: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
  facebook: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
  instagram: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
  linkedin: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
  youtube: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
  tiktok: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
}).optional();

const CompanyInfoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional(),
  tagline: z.string().max(500).optional(),
  taglineAr: z.string().max(500).optional(),
  email: z.string().optional().refine(val => !val || val === "" || /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(val), "Must be valid email or empty"),
  phone: z.string().max(20).optional(),
  alternatePhone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  addressAr: z.string().max(500).optional(),
  vatNumber: z.string().max(50).optional(),
  crNumber: z.string().max(50).optional(),
  logoUrl: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
  faviconUrl: z.string().optional().refine(val => !val || val === "" || /^https?:\/\/.+/.test(val), "Must be valid URL or empty"),
  socialLinks: SocialLinksSchema,
});

const DEFAULT_COMPANY_INFO = {
  name: "Fixzit",
  nameAr: "فكسزت",
  tagline: "Facility Management Made Easy",
  taglineAr: "إدارة المرافق أصبحت سهلة",
  email: "support@fixzit.com",
  phone: "+966 11 000 0000",
  address: "Riyadh, Saudi Arabia",
  addressAr: "الرياض، المملكة العربية السعودية",
  socialLinks: {},
};

/**
 * GET /api/superadmin/content/company
 * Retrieve company information (singleton)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-company:get",
    requests: 30,
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
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide company info singleton
    const companyInfo = await CompanyInfo.findOne({}).lean();

    if (!companyInfo) {
      return NextResponse.json(
        { company: DEFAULT_COMPANY_INFO },
        { headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { company: companyInfo },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Company] Failed to fetch info", { error });
    return NextResponse.json(
      { error: "Failed to fetch company information" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/content/company
 * Update company information (upsert pattern)
 */
export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-company:put",
    requests: 10,
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

    const { data: body, error: parseError } = await parseBodySafe(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = CompanyInfoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide company info singleton
    const companyInfo = await CompanyInfo.findOneAndUpdate(
      {},
      { $set: validation.data },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    logger.info("[Superadmin:Company] Company info updated", {
      updates: Object.keys(validation.data),
      by: session.username,
    });

    return NextResponse.json(
      { company: companyInfo, message: "Company information updated" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Company] Failed to update info", { error });
    return NextResponse.json(
      { error: "Failed to update company information" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
