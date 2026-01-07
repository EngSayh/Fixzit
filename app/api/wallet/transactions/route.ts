/**
 * @fileoverview Wallet Transactions API
 * @description List and filter wallet transactions.
 * 
 * @module api/wallet/transactions
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - GET /api/wallet/transactions - List transactions with filters
 * 
 * @query
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - type: "top_up" | "ad_fee" | etc. (filter by type)
 * - status: "pending" | "completed" | "failed" | "cancelled"
 * - from: ISO date string (filter from date)
 * - to: ISO date string (filter to date)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Wallet } from "@/server/models/souq/Wallet";
import { WalletTransaction } from "@/server/models/souq/WalletTransaction";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { Types } from "mongoose";

// ============================================================================
// HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "wallet:transactions" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get wallet
    const wallet = await Wallet.findOne({ org_id: tenantId, user_id: userId }).lean();
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const typeFilter = searchParams.get("type");
    const statusFilter = searchParams.get("status");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // Build query
    const query: Record<string, unknown> = {
      org_id: new Types.ObjectId(tenantId),
      wallet_id: wallet._id,
    };

    if (typeFilter) {
      query.type = typeFilter;
    }

    if (statusFilter) {
      query.status = statusFilter;
    }

    if (fromDate || toDate) {
      query.created_at = {};
      if (fromDate) {
        (query.created_at as Record<string, Date>).$gte = new Date(fromDate);
      }
      if (toDate) {
        (query.created_at as Record<string, Date>).$lte = new Date(toDate);
      }
    }

    // Execute query
    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments(query),
    ]);

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        amount_sar: tx.amount / 100,
        balance_before: tx.balance_before,
        balance_after: tx.balance_after,
        status: tx.status,
        reference: tx.reference,
        description: tx.description,
        description_ar: tx.description_ar,
        gateway: tx.gateway,
        created_at: tx.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_more: page * limit < total,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Wallet Transactions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
