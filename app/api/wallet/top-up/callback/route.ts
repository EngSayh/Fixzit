/**
 * @fileoverview Wallet Top-Up Payment Callback
 * @description Handles redirect after Tap payment for wallet top-up.
 * Verifies payment status and redirects user appropriately.
 * 
 * @module api/wallet/top-up/callback
 * @route GET /api/wallet/top-up/callback - Payment redirect callback
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { tapPayments, isChargeSuccessful, isChargePending } from "@/lib/finance/tap-payments";
import { getTapConfig } from "@/lib/tapConfig";
import { WalletTransaction } from "@/server/models/souq/WalletTransaction";
import { Wallet } from "@/server/models/souq/Wallet";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { logger } from "@/lib/logger";

// ============================================================================
// HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const transactionId = searchParams.get("transaction_id");
  const tapId = searchParams.get("tap_id"); // Tap adds this on redirect
  const returnUrl = searchParams.get("return_url");
  
  // Default redirect URLs
  const successUrl = returnUrl || "/wallet?status=success";
  const failureUrl = returnUrl ? `${returnUrl}?status=failed` : "/wallet?status=failed";
  const pendingUrl = returnUrl ? `${returnUrl}?status=pending` : "/wallet?status=pending";

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/wallet", request.url));
    }

    if (!transactionId) {
      logger.warn("[Wallet Callback] Missing transaction_id");
      return NextResponse.redirect(new URL(failureUrl, request.url));
    }

    await connectDB();

    // Find the transaction
    // eslint-disable-next-line local/require-lean -- Need full Mongoose doc for typed metadata access
    const transaction = await WalletTransaction.findOne({
      _id: transactionId,
      org_id: tenantId,
      user_id: userId,
    });

    if (!transaction) {
      logger.warn("[Wallet Callback] Transaction not found", { transactionId, userId, tenantId });
      return NextResponse.redirect(new URL(failureUrl, request.url));
    }

    // If transaction already completed, redirect to success
    if (transaction.status === "completed") {
      return NextResponse.redirect(new URL(successUrl, request.url));
    }

    // If transaction already failed, redirect to failure
    if (transaction.status === "failed") {
      return NextResponse.redirect(new URL(failureUrl, request.url));
    }

    // Check Tap configuration
    const tapConfig = getTapConfig();
    if (!tapConfig.isConfigured) {
      // Mock mode - auto-complete the transaction for testing
      logger.info("[Wallet Callback] Mock mode - auto-completing transaction", { transactionId });
      
      const wallet = await Wallet.findById(transaction.wallet_id).lean();
      if (wallet) {
        const newBalance = wallet.balance + transaction.amount;
        // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: updating by _id from verified wallet
        await Wallet.updateOne(
          { _id: wallet._id },
          { $set: { balance: newBalance } }
        );
        // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: updating own transaction by _id
        await WalletTransaction.updateOne(
          { _id: transaction._id },
          { 
            $set: { 
              status: "completed",
              balance_after: newBalance,
              completed_at: new Date(),
            } 
          }
        );
      }
      
      return NextResponse.redirect(new URL(successUrl, request.url));
    }

    // Get the Tap charge ID from transaction metadata or query param
    const metadataChargeId = transaction.metadata?.tap_charge_id;
    const chargeId = typeof metadataChargeId === "string" ? metadataChargeId : tapId;
    
    if (!chargeId) {
      logger.warn("[Wallet Callback] No Tap charge ID found", { transactionId });
      return NextResponse.redirect(new URL(pendingUrl, request.url));
    }

    // Verify charge status with Tap
    const charge = await tapPayments.getCharge(chargeId);
    
    if (isChargeSuccessful(charge)) {
      // Payment successful - update wallet and transaction
      const wallet = await Wallet.findById(transaction.wallet_id).lean();
      if (wallet) {
        const newBalance = wallet.balance + transaction.amount;
        
        // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: updating by _id with verified ownership
        await Wallet.updateOne(
          { _id: wallet._id },
          { $set: { balance: newBalance } }
        );
        
        // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: updating own transaction by _id
        await WalletTransaction.updateOne(
          { _id: transaction._id },
          { 
            $set: { 
              status: "completed",
              balance_after: newBalance,
              completed_at: new Date(),
              "metadata.tap_status": charge.status,
            } 
          }
        );

        logger.info("[Wallet Callback] Top-up completed successfully", {
          transactionId,
          chargeId,
          amount: transaction.amount,
          newBalance,
        });
      }
      
      return NextResponse.redirect(new URL(successUrl, request.url));
    }
    
    if (isChargePending(charge)) {
      // Still pending - redirect to pending page
      logger.info("[Wallet Callback] Payment still pending", { transactionId, chargeId });
      return NextResponse.redirect(new URL(pendingUrl, request.url));
    }

    // Payment failed or declined
    // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: updating own transaction by _id
    await WalletTransaction.updateOne(
      { _id: transaction._id },
      { 
        $set: { 
          status: "failed",
          "metadata.tap_status": charge.status,
          "metadata.failure_reason": charge.response?.message,
        } 
      }
    );

    logger.warn("[Wallet Callback] Payment failed", { 
      transactionId, 
      chargeId, 
      status: charge.status,
      reason: charge.response?.message,
    });
    
    return NextResponse.redirect(new URL(failureUrl, request.url));
  } catch (error) {
    logger.error("[Wallet Callback] Error processing callback", error as Error, { transactionId });
    return NextResponse.redirect(new URL(failureUrl, request.url));
  }
}
