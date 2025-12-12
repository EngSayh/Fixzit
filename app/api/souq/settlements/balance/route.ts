/**
 * @fileoverview Seller Balance API
 * @description Retrieves seller balance information including available, reserved, and pending amounts with tenant isolation.
 * @route GET /api/souq/settlements/balance - Get seller balance (available, reserved, pending)
 * @access Authenticated (Seller for own balance, ADMIN/SUPER_ADMIN/CORPORATE_ADMIN/FINANCE for all)
 * @module souq
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { SellerBalanceService } from "@/services/souq/settlements/balance-service";

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for balance reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-settlements:balance",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      logger.warn("Balance request without orgId", { userId: session.user.id });
      return NextResponse.json({ error: "Organization context required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const sellerId =
      searchParams.get("sellerId") || (session.user.id as string);

    // Authorization: Seller can only view own balance, admin can view all
    const userRole = (session.user as { role?: string }).role;
    // 🔒 SECURITY FIX: Include CORPORATE_ADMIN and FINANCE roles
    if (
      !["ADMIN", "SUPER_ADMIN", "CORPORATE_ADMIN", "FINANCE", "FINANCE_OFFICER"].includes(userRole || "") &&
      sellerId !== session.user.id
    ) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Balance not found" }, { status: 404 });
    }

    // Get balance - 🔐 STRICT v4.1: Pass orgId for tenant isolation
    const balance = await SellerBalanceService.getBalance(sellerId, orgId);

    return NextResponse.json({ balance });
  } catch (error) {
    logger.error("Error fetching balance", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 },
    );
  }
}
