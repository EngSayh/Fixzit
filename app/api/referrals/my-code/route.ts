import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReferralCodeModel } from "@/server/models/ReferralCode";
import { connectDb } from "@/lib/mongo";

import { logger } from "@/lib/logger";
/**
 * GET /api/referrals/my-code
 *
 * Get current user's referral code and statistics with pagination
 */
export async function GET(request: NextRequest) {
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

    // Find user's referral code
    const referralCode = await ReferralCodeModel.findOne({
      referrerId: session.user.id,
      status: "ACTIVE",
    });

    if (!referralCode) {
      return NextResponse.json({
        code: null,
        referrals: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }

    const referralDoc =
      typeof referralCode.toObject === "function"
        ? referralCode.toObject()
        : (referralCode as unknown as { referrals?: unknown[] });

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
