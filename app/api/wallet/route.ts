/**
 * @fileoverview Wallet API Routes
 * @description Digital wallet management including balance retrieval,
 * top-up initiation, and basic operations.
 * 
 * @module api/wallet
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - GET /api/wallet - Get wallet balance and info
 * - POST /api/wallet - Create wallet (if not exists)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Wallet } from "@/server/models/souq/Wallet";
import { connectMongo as connectDB } from "@/lib/db/mongoose";

/**
 * GET /api/wallet
 * Get wallet balance and info for authenticated user
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "wallet:get" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get or create wallet
    const wallet = await Wallet.findOrCreate(tenantId, userId);

    return NextResponse.json({
      id: wallet._id,
      balance: wallet.balance,
      balance_sar: wallet.balance / 100,
      pending_balance: wallet.pending_balance ?? 0,
      pending_balance_sar: (wallet.pending_balance ?? 0) / 100,
      currency: wallet.currency,
      status: wallet.status,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Wallet GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wallet
 * Create wallet for user (if not exists)
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 10, windowMs: 60_000, keyPrefix: "wallet:create" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get or create wallet
    const wallet = await Wallet.findOrCreate(tenantId, userId);
    const isNew = wallet.created_at.getTime() > Date.now() - 1000;

    return NextResponse.json(
      {
        id: wallet._id,
        balance: wallet.balance,
        balance_sar: wallet.balance / 100,
        status: wallet.status,
        created: isNew,
      },
      { status: isNew ? 201 : 200 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Wallet POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create wallet" },
      { status: 500 }
    );
  }
}
