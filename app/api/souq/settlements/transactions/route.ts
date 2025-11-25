/**
 * Transactions API
 * GET /api/souq/settlements/transactions - Get transaction history for seller
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { SellerBalanceService } from "@/services/souq/settlements/balance-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sellerId =
      searchParams.get("sellerId") || (session.user.id as string);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );

    // Authorization: Seller can only view own transactions, admin can view all
    const userRole = (session.user as { role?: string }).role;
    if (
      userRole !== "ADMIN" &&
      userRole !== "SUPER_ADMIN" &&
      sellerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build filters
    const filters: Record<string, unknown> = {
      offset: (page - 1) * limit,
      limit,
    };

    if (type) {
      filters.type = type;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    // Get transactions
    const result = await SellerBalanceService.getTransactionHistory(
      sellerId,
      filters,
    );

    return NextResponse.json({
      transactions: result.transactions,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching transactions", { error });
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}
