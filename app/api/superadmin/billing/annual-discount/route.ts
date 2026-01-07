/**
 * @fileoverview Superadmin Annual Discount API
 * @description Get and update annual prepayment discount percentage
 * @route GET, PATCH /api/superadmin/billing/annual-discount
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/billing/annual-discount
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import DiscountRule from "@/server/models/DiscountRule";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

// Zod schema for annual discount request
const AnnualDiscountSchema = z.object({
  percentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
});

/**
 * GET /api/superadmin/billing/annual-discount
 * Get current annual discount configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[Superadmin Annual Discount] Missing orgId for discount lookup");
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const orgId = new mongoose.Types.ObjectId(session.orgId);

    const discount = await DiscountRule.findOne({ key: "ANNUAL_PREPAY", orgId }).lean();

    return NextResponse.json(
      discount || { key: "ANNUAL_PREPAY", percentage: 20, description: "Annual prepayment discount", orgId },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Annual Discount] Error fetching discount", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch annual discount" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PATCH /api/superadmin/billing/annual-discount
 * Update annual discount percentage
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[Superadmin Annual Discount] Missing orgId for discount update");
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const orgId = new mongoose.Types.ObjectId(session.orgId);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const parsed = AnnualDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid percentage" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { percentage } = parsed.data;

    const doc = await DiscountRule.findOneAndUpdate(
      { key: "ANNUAL_PREPAY", orgId },
      { 
        $set: { 
          percentage,
          updatedAt: new Date(),
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      { success: true, discount: doc },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Annual Discount] Error updating discount", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update annual discount" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
