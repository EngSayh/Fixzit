/**
 * @fileoverview Wallet Top-Up API
 * @description Initiates wallet balance top-up via payment gateway.
 * 
 * @module api/wallet/top-up
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - POST /api/wallet/top-up - Initiate top-up payment
 * 
 * @request
 * - amount: number (SAR, min 10, max 50000)
 * - payment_method: "mada" | "visa" | "mastercard" | "apple_pay" | "saved_card"
 * - saved_card_id?: string (if using saved card)
 * - return_url?: string (callback URL after payment)
 * 
 * @response
 * - transaction_id: string
 * - checkout_url: string (redirect user here)
 * - status: "pending"
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Wallet } from "@/server/models/souq/Wallet";
import { WalletTransaction } from "@/server/models/souq/WalletTransaction";
import { SavedPaymentMethod } from "@/server/models/souq/SavedPaymentMethod";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { z } from "zod";
import { tapPayments, buildTapCustomer, buildWebhookConfig, type TapChargeRequest } from "@/lib/finance/tap-payments";
import { getTapConfig } from "@/lib/tapConfig";

// ============================================================================
// VALIDATION
// ============================================================================

const TopUpSchema = z.object({
  amount: z.number().min(10, "Minimum top-up is 10 SAR").max(50000, "Maximum top-up is 50,000 SAR"),
  payment_method: z.enum(["mada", "visa", "mastercard", "apple_pay", "saved_card"]),
  saved_card_id: z.string().optional(),
  return_url: z.string().url().optional(),
});

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 10, windowMs: 60_000, keyPrefix: "wallet:topup" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = TopUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, payment_method, saved_card_id, return_url } = parsed.data;
    const amountInHalalas = Math.round(amount * 100);

    await connectDB();

    // Get or create wallet
    const wallet = await Wallet.findOrCreate(tenantId, userId);

    // Validate saved card if specified
    if (payment_method === "saved_card" && saved_card_id) {
      const savedCard = await SavedPaymentMethod.findOne({
        _id: saved_card_id,
        org_id: tenantId,
        user_id: userId,
        is_active: true,
      }).lean();

      if (!savedCard) {
        return NextResponse.json(
          { error: "Saved card not found or expired" },
          { status: 400 }
        );
      }
    }

    // Create pending transaction
    const transaction = await WalletTransaction.create({
      org_id: tenantId,
      wallet_id: wallet._id,
      user_id: userId,
      type: "top_up",
      amount: amountInHalalas,
      balance_before: wallet.balance,
      balance_after: wallet.balance, // Will be updated on success
      status: "pending",
      gateway: payment_method === "saved_card" ? "saved" : payment_method,
      reference: `TOP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: `Top up ${amount} SAR`,
      description_ar: `شحن ${amount} ر.س`,
      metadata: {
        payment_method,
        saved_card_id,
        return_url,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      },
    });

    // Integrate with Tap Payments gateway
    const tapConfig = getTapConfig();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://fixzit.co";
    
    // Check if Tap is configured - fall back to mock if not
    if (!tapConfig.isConfigured) {
      // Development/unconfigured mode: return mock checkout URL
      const checkoutUrl = `/checkout/wallet?transaction_id=${transaction._id}&amount=${amount}`;
      return NextResponse.json({
        transaction_id: transaction._id,
        reference: transaction.reference,
        checkout_url: return_url ? `${checkoutUrl}&return_url=${encodeURIComponent(return_url)}` : checkoutUrl,
        amount,
        amount_halalas: amountInHalalas,
        status: "pending",
        mode: "mock", // Indicate mock mode
      });
    }

    // Production mode: Create Tap charge
    const userEmail = session?.user?.email || `user-${userId}@fixzit.co`;
    const userName = session?.user?.name || "Fixzit User";
    const nameParts = userName.trim().split(/\s+/);
    
    const chargeRequest: TapChargeRequest = {
      amount: amountInHalalas, // Tap expects amount in halalas for SAR
      currency: "SAR",
      customer: buildTapCustomer({
        firstName: nameParts[0] || "Customer",
        lastName: nameParts.slice(1).join(" ") || "",
        email: userEmail,
      }),
      redirect: {
        url: `${baseUrl}/api/wallet/top-up/callback?transaction_id=${transaction._id}${return_url ? `&return_url=${encodeURIComponent(return_url)}` : ""}`,
      },
      post: buildWebhookConfig(baseUrl),
      description: `Wallet top-up ${amount} SAR`,
      metadata: {
        transactionId: transaction._id.toString(),
        walletId: wallet._id.toString(),
        userId,
        organizationId: tenantId,
        type: "wallet_top_up",
      },
      reference: {
        transaction: transaction._id.toString(),
        order: transaction.reference,
      },
      receipt: {
        email: true,
        sms: false,
      },
    };

    const chargeResponse = await tapPayments.createCharge(chargeRequest);

    // Update transaction with Tap charge ID
    // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: updating own transaction by _id
    await WalletTransaction.updateOne(
      { _id: transaction._id },
      { 
        $set: { 
          "metadata.tap_charge_id": chargeResponse.id,
          gateway_reference: chargeResponse.id,
        } 
      }
    );

    return NextResponse.json({
      transaction_id: transaction._id,
      reference: transaction.reference,
      checkout_url: chargeResponse.transaction.url, // Tap hosted payment page
      tap_charge_id: chargeResponse.id,
      amount,
      amount_halalas: amountInHalalas,
      status: "pending",
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Wallet Top-Up] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate top-up" },
      { status: 500 }
    );
  }
}
