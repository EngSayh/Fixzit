/**
 * @fileoverview Payout Request API
 * @description Processes seller payout requests with secure amount derivation from statements and RBAC-based authorization.
 * @route POST /api/souq/settlements/request-payout - Request withdrawal for available balance
 * @access Authenticated (VENDOR/TEAM_MEMBER for self, SUPER_ADMIN/ADMIN/CORPORATE_OWNER/FINANCE_OFFICER for others)
 * @module souq
 * @security Amount is derived from the statement's netPayout, NOT user input.
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { SellerBalanceService } from "@/services/souq/settlements/balance-service";
import { PayoutProcessorService } from "@/services/souq/settlements/payout-processor";
import { connectDb } from "@/lib/mongodb-unified";
import { Role, SubRole } from "@/lib/rbac/client-roles";
import { parseBodySafe } from "@/lib/api/parse-body";

// 🔐 STRICT v4.1: Roles allowed to request payouts for others
const PAYOUT_ADMIN_ROLES: readonly string[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.CORPORATE_OWNER,
];
const PAYOUT_ADMIN_SUBROLES: readonly string[] = [SubRole.FINANCE_OFFICER];

// Roles that can request their own payouts (sellers/vendors)
const SELF_PAYOUT_ROLES: readonly string[] = [
  Role.VENDOR,
  Role.TEAM_MEMBER,
  ...PAYOUT_ADMIN_ROLES,
];

export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute per IP for payout requests (sensitive)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-settlements:request-payout",
    requests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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
    const userSubRole = (session.user as { subRole?: string }).subRole || "";
    const isSuperAdmin =
      (session.user as { isSuperAdmin?: boolean }).isSuperAdmin === true;
    const canRequestPayout =
      isSuperAdmin || SELF_PAYOUT_ROLES.includes(userRole);

    if (!canRequestPayout) {
      return NextResponse.json(
        { error: "Forbidden: Your role cannot request payouts" },
        { status: 403 },
      );
    }

    const parseResult = await parseBodySafe<{
      amount?: number;
      statementId?: string;
      bankAccount?: { iban?: string };
      sellerId?: string;
    }>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { amount, statementId, bankAccount, sellerId: requestedSellerId } = parseResult.data!;

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
    const isPayoutAdmin =
      isSuperAdmin ||
      PAYOUT_ADMIN_ROLES.includes(userRole) ||
      PAYOUT_ADMIN_SUBROLES.includes(userSubRole);
    if (!isRequestingForSelf && !isPayoutAdmin) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Normalize orgId to match both legacy ObjectId and current string storage in souq_settlements/souq_payouts
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];

    // 🔐 STRICT v4.1: Fetch statement with orgId for tenant isolation and validate amount
    const db = (await connectDb()).connection.db!;
    const sellerFilter = ObjectId.isValid(targetSellerId)
      ? new ObjectId(targetSellerId)
      : targetSellerId;

    const statement = await db.collection("souq_settlements").findOne(
      {
        statementId,
        sellerId: sellerFilter,
        orgId: { $in: orgCandidates },
      },
      { projection: { summary: 1, status: 1, sellerId: 1 } },
    );

    if (!statement) {
      return NextResponse.json(
        { error: "Settlement statement not found" },
        { status: 404 },
      );
    }

    // 🔐 STRICT v4.1: Statement must be approved before payout can be requested
    // This prevents creating orphaned withdrawals for non-approved statements
    if (statement.status !== "approved") {
      return NextResponse.json(
        { error: `Statement must be approved before payout. Current status: ${statement.status || 'unknown'}` },
        { status: 400 },
      );
    }

    // 🔐 STRICT v4.1: Check if payout already exists for this statement
    const existingPayout = await db.collection("souq_payouts").findOne({
      statementId,
      sellerId: sellerFilter,
      orgId: { $in: orgCandidates },
      status: { $nin: ["failed", "cancelled"] },
    });
    if (existingPayout) {
      return NextResponse.json(
        { error: `Payout already exists for this statement (${existingPayout.payoutId})` },
        { status: 409 },
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

    let withdrawalRequest: { requestId: string; amount: number } | null = null;

    try {
      withdrawalRequest = await SellerBalanceService.requestWithdrawal(
        targetSellerId,
        orgId,
        netPayout,
        bankAccount,
        statementId,
      );

      const payout = await PayoutProcessorService.requestPayout(
        targetSellerId,
        statementId,
        orgId,
        bankAccount,
      );

      await db.collection("souq_withdrawal_requests").updateOne(
        { requestId: withdrawalRequest.requestId, orgId: { $in: orgCandidates } },
        {
          $set: {
            payoutId: payout.payoutId,
            status: payout.status === "pending" ? "processing" : payout.status,
          },
        },
      );

      return NextResponse.json(
        {
          payout,
          withdrawal: {
            requestId: withdrawalRequest.requestId,
            amount: withdrawalRequest.amount,
            status: payout.status === "pending" ? "processing" : payout.status,
          },
        },
        { status: 201 },
      );
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));

      if (withdrawalRequest) {
        try {
          await db.collection("souq_withdrawal_requests").updateOne(
            { requestId: withdrawalRequest.requestId, orgId: { $in: orgCandidates } },
            {
              $set: {
                status: "rejected",
                rejectionReason: error.message,
                processedAt: new Date(),
                notes: "Auto-rollback after payout failure",
              },
            },
          );

          await SellerBalanceService.recordTransaction({
            sellerId: targetSellerId,
            orgId,
            type: "adjustment",
            amount: withdrawalRequest.amount,
            description: `Rollback of withdrawal ${withdrawalRequest.requestId} after payout failure`,
            metadata: { statementId, requestId: withdrawalRequest.requestId },
          });
        } catch (rollbackError) {
          logger.error(
            "[RequestPayout] Failed to rollback withdrawal after payout error",
            {
              requestId: withdrawalRequest.requestId,
              error: rollbackError,
            },
          );
        }
      }

      logger.error("Error requesting payout", error);
      const message =
        error instanceof Error ? error.message : "Failed to request payout";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    logger.error("Error in payout request handler", error as Error);
    const message =
      error instanceof Error ? error.message : "Failed to process payout request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
