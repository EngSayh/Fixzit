/**
 * @fileoverview Superadmin Company Info API
 * @description Company information management (placeholder)
 * @route GET /api/superadmin/content/company
 * @route PUT /api/superadmin/content/company
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/content/company
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/content/company
 * Get company information (placeholder)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-company:get",
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

    // TODO: Implement CompanyInfo model and fetch from database
    return NextResponse.json(
      {
        company: {
          name: "Fixzit",
          nameAr: "فكسزت",
          email: "",
          phone: "",
          address: "",
          addressAr: "",
          crNumber: "",
          vatNumber: "",
        },
        message: "Company info feature pending - model not yet implemented",
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Content:Company] Failed to load info", { error });
    return NextResponse.json(
      { error: "Failed to load company info" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/content/company
 * Update company information (placeholder)
 */
export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-content-company:put",
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

    const { data: body, error: parseError } = await parseBodySafe<{
      name?: string;
      nameAr?: string;
      email?: string;
      phone?: string;
      address?: string;
      addressAr?: string;
    }>(request, { logPrefix: "[superadmin:content:company]" });

    if (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Content:Company] Info update requested (not persisted)", {
      name: body?.name,
      by: session.username,
    });

    return NextResponse.json(
      {
        message: "Company info feature pending - model not yet implemented",
        acknowledged: true,
      },
      { status: 202, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Content:Company] Failed to update info", { error });
    return NextResponse.json(
      { error: "Failed to update company info" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
