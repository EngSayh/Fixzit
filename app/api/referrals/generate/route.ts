/**
 * @fileoverview Referral Code Generation
 * @description Generates a new tenant-aware referral code for the authenticated user with configurable rewards and limits
 * @route POST /api/referrals/generate - Create a new referral code
 * @access Private - Requires authentication and organization context
 * @module referrals
 */
import { NextRequest, NextResponse } from "next/server";
import { Config } from "@/lib/config/constants";
import { auth } from "@/auth";
import { ReferralCodeModel } from "@/server/models/ReferralCode";
import { connectDb } from "@/lib/mongo";
import {
  REFERRAL_REWARD,
  REFERRAL_LIMITS,
  getReferralValidity,
} from "@/config/referrals.config";
import { Types } from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import { logger } from "@/lib/logger";
/**
 * POST /api/referrals/generate
 *
 * Generate a new referral code for the current user
 */
export async function POST(request: NextRequest) {
  enforceRateLimit(request, { requests: 10, windowMs: 60_000, keyPrefix: "referrals:generate" });
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Get orgId from session and convert to ObjectId
    const orgIdString = session.user.orgId;
    if (!orgIdString) {
      return NextResponse.json(
        { error: "Organization ID not found in session" },
        { status: 400 },
      );
    }

    const orgId = new Types.ObjectId(orgIdString);

    // Check if user already has an active referral code
    const existing = await ReferralCodeModel.findOne({
      orgId,
      referrerId: session.user.id,
      status: "ACTIVE",
    });

    if (existing) {
      return NextResponse.json({ code: existing });
    }

    // Generate new code (tenant-aware)
    const code = await ReferralCodeModel.generateCode(orgId);

    // Build referral URL from environment variable
    const baseUrl = Config.app.baseUrl || Config.app.url;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "BASE_URL not configured. Contact system administrator." },
        { status: 500 },
      );
    }

    // Construct referral URL safely
    const shortUrl = new URL(`/ref/${code}`, baseUrl).toString();

    // Get validity dates from config
    const { validFrom, validUntil } = getReferralValidity();

    // Create referral code with centralized config
    const referralCode = await ReferralCodeModel.create({
      orgId,
      referrerId: session.user.id,
      referrerName: session.user.name,
      referrerEmail: session.user.email,
      code,
      shortUrl,
      reward: {
        type: REFERRAL_REWARD.type,
        referrerAmount: REFERRAL_REWARD.referrerAmount,
        referredAmount: REFERRAL_REWARD.referredAmount,
        currency: REFERRAL_REWARD.currency,
        description: REFERRAL_REWARD.description,
      },
      limits: {
        maxUses: REFERRAL_LIMITS.maxUses,
        maxUsesPerUser: REFERRAL_LIMITS.maxUsesPerUser,
        minPurchaseAmount: REFERRAL_LIMITS.minPurchaseAmount,
        validFrom,
        validUntil,
      },
      status: "ACTIVE",
    });

    return NextResponse.json({ code: referralCode });
  } catch (error) {
    logger.error("Failed to generate referral code:", error);
    return NextResponse.json(
      { error: "Failed to generate referral code" },
      { status: 500 },
    );
  }
}
