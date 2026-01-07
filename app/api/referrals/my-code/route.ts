/**
 * @fileoverview User Referral Code Retrieval
 * @description Retrieves the authenticated user's active referral code and associated statistics with pagination support
 * @route GET /api/referrals/my-code - Get current user's referral code and usage stats
 * @access Private - Requires authentication
 * @module referrals
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReferralCodeModel } from "@/server/models/ReferralCode";
import { connectDb } from "@/lib/mongo";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import { logger } from "@/lib/logger";
/**
 * GET /api/referrals/my-code
 *
 * Get current user's referral code and statistics with pagination
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 30, windowMs: 60_000, keyPrefix: "referrals:my-code" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Parse pagination params with validation
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const offset = (page - 1) * limit;

    // Find user's referral code - lean() returns plain object
    // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: Scoped by referrerId from session (user's own codes)
    const referralCode = await ReferralCodeModel.findOne({
      referrerId: session.user.id,
      status: "ACTIVE",
    }).lean();

    if (!referralCode) {
      return NextResponse.json({
        code: null,
        referrals: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }

    // lean() already returns plain object, no toObject needed
    const referralDoc = referralCode as { referrals?: unknown[] };

    // Paginate referrals array
    const total = Array.isArray(referralDoc.referrals)
      ? referralDoc.referrals.length
      : 0;
    const totalPages = Math.ceil(total / limit);
    const paginatedReferrals = (referralDoc.referrals || []).slice(
      offset,
      offset + limit,
    );

    return NextResponse.json({
      code: referralDoc,
      referrals: paginatedReferrals,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch referral code:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral code" },
      { status: 500 },
    );
  }
}
