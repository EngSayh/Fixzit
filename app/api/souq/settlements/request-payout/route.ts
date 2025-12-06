/**
 * Request Payout API
 * POST /api/souq/settlements/request-payout - Request withdrawal for available balance
 * 
 * 🔐 SECURITY: Amount is derived from the statement's netPayout, NOT user input.
 * User-provided amount is only used for validation to prevent UI/API mismatches.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { SellerBalanceService } from "@/services/souq/settlements/balance-service";
import { PayoutProcessorService } from "@/services/souq/settlements/payout-processor";
import { connectDb } from "@/lib/mongodb-unified";
import { Role } from "@/lib/rbac/client-roles";

// 🔐 STRICT v4.1: Roles allowed to request payouts for others
const PAYOUT_ADMIN_ROLES: readonly string[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.CORPORATE_OWNER,
];

// Roles that can request their own payouts (sellers/vendors)
const SELF_PAYOUT_ROLES: readonly string[] = [
  Role.VENDOR,
  Role.TEAM_MEMBER,
  ...PAYOUT_ADMIN_ROLES,
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // 🔐 STRICT v4.1: RBAC for payout requests
    const userRole = (session.user as { role?: string }).role || "";
    const isSuperAdmin = (session.user as { isSuperAdmin?: boolean }).isSuperAdmin === true;
    const canRequestPayout = isSuperAdmin || SELF_PAYOUT_ROLES.includes(userRole);
    
    if (!canRequestPayout) {
      return NextResponse.json(
        { error: "Forbidden: Your role cannot request payouts" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { amount, statementId, bankAccount, sellerId: requestedSellerId } = body;

    if (!statementId || !bankAccount || !bankAccount.iban) {
      return NextResponse.json(
        { error: "statementId and bankAccount with iban are required" },
        { status: 400 },
      );
    }

    const currentUserId = session.user.id as string;
    const targetSellerId = requestedSellerId || currentUserId;
    const isRequestingForSelf = targetSellerId === currentUserId;
    
    // 🔐 STRICT v4.1: Only admins can request payout for another seller
    const isPayoutAdmin = isSuperAdmin || PAYOUT_ADMIN_ROLES.includes(userRole);
    if (!isRequestingForSelf && !isPayoutAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Cannot request payout for another seller" },
        { status: 403 },
      );
    }

    // 🔐 STRICT v4.1: Fetch statement with orgId for tenant isolation and validate amount
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const statement = await db.collection("souq_settlements").findOne({
      statementId,
      sellerId: targetSellerId,
      orgId,
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Settlement statement not found" },
        { status: 404 },
      );
    }

    const netPayout = statement.summary?.netPayout;
    if (typeof netPayout !== "number" || netPayout <= 0) {
      return NextResponse.json(
        { error: "Invalid statement: no valid netPayout amount" },
        { status: 400 },
      );
    }

    // 🔐 SECURITY: Validate user-provided amount matches statement netPayout
    // This prevents malicious amount manipulation from client
    if (typeof amount === "number" && Math.abs(amount - netPayout) > 0.01) {
      logger.warn(
        `[RequestPayout] Amount mismatch for statement ${statementId}: user provided ${amount}, statement netPayout is ${netPayout}`,
      );
      return NextResponse.json(
        { error: `Amount mismatch. Expected ${netPayout} SAR based on statement.` },
        { status: 400 },
      );
    }

    // Validate seller has sufficient balance
    // 🔐 STRICT v4.1: Pass orgId for tenant isolation
    const balance = await SellerBalanceService.getBalance(targetSellerId, orgId);

    if (netPayout > balance.available) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${balance.available} SAR, Required: ${netPayout} SAR` },
        { status: 400 },
      );
    }

    // 🔐 STRICT v4.1: Go through withdrawal flow for proper ledger/audit trail
    // This ensures: duplicate pending check, minimum amount enforcement, ledger entry
    const withdrawalRequest = await SellerBalanceService.requestWithdrawal(
      targetSellerId,
      orgId,
      netPayout,
      bankAccount,
      statementId,
    );

    // Now request the actual payout (payment processing)
    const payout = await PayoutProcessorService.requestPayout(
      targetSellerId,
      statementId,
      orgId,
      bankAccount,
    );

    // Update withdrawal with payout reference
    await db.collection("souq_withdrawal_requests").updateOne(
      { requestId: withdrawalRequest.requestId, orgId },
      { $set: { payoutId: payout.payoutId, status: payout.status === "pending" ? "processing" : payout.status } },
    );

    return NextResponse.json({ 
      payout,
      withdrawal: {
        requestId: withdrawalRequest.requestId,
        amount: withdrawalRequest.amount,
        status: payout.status === "pending" ? "processing" : payout.status,
      }
    }, { status: 201 });
  } catch (error) {
    logger.error("Error requesting payout", error as Error);
    const message =
      error instanceof Error ? error.message : "Failed to request payout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
