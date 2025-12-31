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
import { setTenantContext } from "@/server/plugins/tenantIsolation";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const SocialLinksSchema = z.object({
  twitter: z.string().trim().url().optional().or(z.literal("")),
  facebook: z.string().trim().url().optional().or(z.literal("")),
  instagram: z.string().trim().url().optional().or(z.literal("")),
  linkedin: z.string().trim().url().optional().or(z.literal("")),
  youtube: z.string().trim().url().optional().or(z.literal("")),
}).optional();

const CompanyInfoSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  nameAr: z.string().trim().min(1).max(200).optional(),
  tagline: z.string().trim().max(500).optional(),
  taglineAr: z.string().trim().max(500).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(20).optional(),
  alternatePhone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  addressAr: z.string().trim().max(500).optional(),
  vatNumber: z.string().trim().max(50).optional(),
  crNumber: z.string().trim().max(50).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  faviconUrl: z.string().trim().url().optional().or(z.literal("")),
  socialLinks: SocialLinksSchema,
});

// Default company info for new installations
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
 * Retrieve company information (singleton per platform)
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

    // Set tenant context from superadmin session for per-tenant singleton query
    setTenantContext({ 
      orgId: session.orgId, 
      isSuperAdmin: true, 
      userId: session.username 
    });

    // Per-tenant singleton: each org has its own company info
    // eslint-disable-next-line local/require-tenant-scope -- Tenant context set above via setTenantContext
    const companyInfo = await CompanyInfo.findOne({}).lean();

    if (!companyInfo) {
      // Return defaults if no company info exists yet
      return NextResponse.json(DEFAULT_COMPANY_INFO, { headers: ROBOTS_HEADER });
    }

    return NextResponse.json(companyInfo, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:Company] Failed to fetch company info", { error });
    return NextResponse.json(
      { error: "Failed to fetch company information" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/content/company
 * Update company information (upsert pattern - creates if not exists)
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

    // Set tenant context from superadmin session for per-tenant singleton
    setTenantContext({ 
      orgId: session.orgId, 
      isSuperAdmin: true, 
      userId: session.username 
    });

    // Per-tenant singleton: each org has its own company info (upsert)
    // eslint-disable-next-line local/require-tenant-scope -- Tenant context set above via setTenantContext
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
      { ...companyInfo, message: "Company information updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Company] Failed to update company info", { error });
    return NextResponse.json(
      { error: "Failed to update company information" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
