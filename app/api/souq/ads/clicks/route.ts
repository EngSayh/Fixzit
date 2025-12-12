/**
 * @description Tracks ad clicks and charges advertiser budget.
 * Implements click fraud prevention via signed click tokens.
 * Rate-limited per IP to prevent automated attacks.
 * @route POST /api/souq/ads/clicks
 * @access Public - With signed click verification
 * @param {Object} body.bidId - Bid ID for the click
 * @param {Object} body.campaignId - Campaign ID
 * @param {Object} body.timestamp - Click timestamp
 * @param {Object} body.signature - HMAC signature for verification
 * @returns {Object} success: true, charged: cost deducted
 * @throws {400} If signature invalid or expired
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { AuctionEngine } from "@/services/souq/ads/auction-engine";
import { BudgetManager } from "@/services/souq/ads/budget-manager";
import { logger } from "@/lib/logger";
import { createHmac, timingSafeEqual } from "crypto";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getClientIP } from "@/server/security/headers";

// SEC-001: Click signature validation to prevent click fraud
const CLICK_SECRET = process.env.AD_CLICK_SECRET || process.env.NEXTAUTH_SECRET || "";

function validateClickSignature(bidId: string, campaignId: string, timestamp: number, signature: string): boolean {
  if (!CLICK_SECRET) {
    logger.warn("[Ad API] AD_CLICK_SECRET not configured - click validation disabled");
    return true; // Fail open in dev, but log warning
  }
  
  // Reject clicks older than 5 minutes
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return false;
  }
  
  const payload = `${bidId}:${campaignId}:${timestamp}`;
  const expectedSig = createHmac("sha256", CLICK_SECRET).update(payload).digest("hex");
  
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

/**
 * POST /api/souq/ads/clicks
 * Track ad click and charge budget
 * 
 * SECURITY: Requires signed click token to prevent click fraud.
 * The signature must be generated server-side when rendering the ad.
 */
export async function POST(request: NextRequest) {
  // Rate limit by IP to prevent automated click attacks (distributed for multi-instance)
  const clientIp = getClientIP(request);
  const rl = await smartRateLimit(`ad-click:${clientIp}`, 30, 60_000); // 30 clicks per minute per IP
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    if (typeof rawBody !== "object" || rawBody === null) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const {
      bidId,
      campaignId,
      orgId,
      actualCpc,
      query,
      category,
      productId,
      timestamp,
      signature,
    } = rawBody as {
      bidId?: unknown;
      campaignId?: unknown;
      orgId?: unknown;
      actualCpc?: unknown;
      query?: unknown;
      category?: unknown;
      productId?: unknown;
      timestamp?: unknown;
      signature?: unknown;
    };

    if (!bidId || !campaignId || !orgId || !actualCpc) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: bidId, campaignId, orgId, actualCpc",
        },
        { status: 400 },
      );
    }

    // SEC-001: Validate click signature to prevent fraud
    if (!timestamp || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing click validation token" },
        { status: 400 }
      );
    }

    if (
      typeof bidId !== "string" ||
      typeof campaignId !== "string" ||
      typeof orgId !== "string" ||
      (typeof actualCpc !== "string" && typeof actualCpc !== "number") ||
      typeof timestamp !== "string" ||
      typeof signature !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid payload types" },
        { status: 400 },
      );
    }

    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) {
      return NextResponse.json(
        { success: false, error: "Invalid timestamp" },
        { status: 400 },
      );
    }

    if (!validateClickSignature(bidId, campaignId, timestampNumber, signature)) {
      logger.warn("[Ad API] Invalid click signature", { bidId, campaignId, clientIp });
      return NextResponse.json(
        { success: false, error: "Invalid or expired click token" },
        { status: 403 }
      );
    }

    const cpc = typeof actualCpc === "number" ? actualCpc : Number(actualCpc);
    if (!Number.isFinite(cpc) || cpc <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid click amount" },
        { status: 400 },
      );
    }

    // Check budget availability
    const canCharge = await BudgetManager.canCharge(campaignId, orgId, cpc);

    if (!canCharge) {
      return NextResponse.json(
        { success: false, error: "Insufficient budget" },
        { status: 402 }, // Payment Required
      );
    }

    // Charge budget
    const charged = await BudgetManager.chargeBudget(campaignId, orgId, cpc);

    if (!charged) {
      return NextResponse.json(
        { success: false, error: "Failed to charge budget" },
        { status: 402 },
      );
    }

    // Record click
    await AuctionEngine.recordClick(bidId, campaignId, cpc, {
      orgId, // Required for tenant isolation (STRICT v4.1)
      query: typeof query === "string" ? query : undefined,
      category: typeof category === "string" ? category : undefined,
      productId: typeof productId === "string" ? productId : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Click recorded",
      charged: cpc,
    });
  } catch (error) {
    logger.error("[Ad API] Record click failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to record click",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
