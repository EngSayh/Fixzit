/**
 * @fileoverview Saved Payment Methods API
 * @description CRUD operations for saved payment methods (tokenized cards).
 * 
 * @module api/wallet/payment-methods
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - GET /api/wallet/payment-methods - List saved payment methods
 * - POST /api/wallet/payment-methods - Save new payment method
 * - DELETE /api/wallet/payment-methods - Remove payment method
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { SavedPaymentMethod } from "@/server/models/souq/SavedPaymentMethod";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { z } from "zod";

// ============================================================================
// VALIDATION
// ============================================================================

const CreatePaymentMethodSchema = z.object({
  token: z.string().min(1, "Token is required"),
  card_type: z.enum(["mada", "visa", "mastercard", "apple_pay"]),
  last_four: z.string().length(4, "Last four digits required"),
  expiry_month: z.number().min(1).max(12).transform(m => m.toString().padStart(2, "0")),
  expiry_year: z.number().min(new Date().getFullYear()).transform(y => y.toString()),
  card_holder_name: z.string().min(2).optional(),
  is_default: z.boolean().optional(),
});

const DeletePaymentMethodSchema = z.object({
  id: z.string().min(1, "Payment method ID is required"),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/wallet/payment-methods
 * List all saved payment methods for user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user rate limiting for payment endpoints (CodeRabbit review)
    const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: `wallet:payment-methods:list:${userId}` });
    if (rateLimitResponse) return rateLimitResponse;

    await connectDB();

    const paymentMethods = await SavedPaymentMethod.find({
      org_id: tenantId,
      user_id: userId,
      is_active: true,
    })
      .select("-token -billing_address")
      .sort({ is_default: -1, created_at: -1 })
      .lean();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    return NextResponse.json({
      payment_methods: paymentMethods.map((pm) => {
        const expiryYear = parseInt(pm.expiry_year, 10);
        const expiryMonth = parseInt(pm.expiry_month, 10);
        return {
          id: pm._id,
          card_type: pm.card_type,
          last_four: pm.last_four,
          expiry_month: pm.expiry_month,
          expiry_year: pm.expiry_year,
          card_holder_name: pm.card_holder_name,
          is_default: pm.is_default,
          is_expired: expiryYear < currentYear || 
            (expiryYear === currentYear && expiryMonth < currentMonth),
          created_at: pm.created_at,
        };
      }),
    });
  } catch (_error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Payment Methods GET] Error:", _error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wallet/payment-methods
 * Save new payment method (from gateway token)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user rate limiting for payment endpoints (CodeRabbit review)
    const rateLimitResponse = enforceRateLimit(request, { requests: 10, windowMs: 60_000, keyPrefix: `wallet:payment-methods:create:${userId}` });
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreatePaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, card_type, last_four, expiry_month, expiry_year, card_holder_name, is_default } = parsed.data;

    await connectDB();

    // If setting as default, unset other defaults first
    if (is_default) {
      await SavedPaymentMethod.updateMany(
        { org_id: tenantId, user_id: userId, is_default: true },
        { $set: { is_default: false } }
      );
    }

    // Check for duplicate card
    const existing = await SavedPaymentMethod.findOne({
      org_id: tenantId,
      user_id: userId,
      card_type,
      last_four,
      is_active: true,
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "This card is already saved" },
        { status: 409 }
      );
    }

    // Create payment method
    const paymentMethod = await SavedPaymentMethod.create({
      org_id: tenantId,
      user_id: userId,
      gateway: card_type === "mada" ? "hyperpay" : "tap",
      token,
      card_type,
      last_four,
      expiry_month,
      expiry_year,
      card_holder_name,
      is_default: is_default || false,
      is_active: true,
    });

    return NextResponse.json(
      {
        id: paymentMethod._id,
        card_type: paymentMethod.card_type,
        last_four: paymentMethod.last_four,
        expiry_month: paymentMethod.expiry_month,
        expiry_year: paymentMethod.expiry_year,
        is_default: paymentMethod.is_default,
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Payment Methods POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to save payment method" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wallet/payment-methods
 * Remove a saved payment method
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user rate limiting for payment endpoints (CodeRabbit review)
    const rateLimitResponse = enforceRateLimit(request, { requests: 10, windowMs: 60_000, keyPrefix: `wallet:payment-methods:delete:${userId}` });
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = DeletePaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectDB();

    // Soft delete (deactivate)
    const result = await SavedPaymentMethod.findOneAndUpdate(
      {
        _id: parsed.data.id,
        org_id: tenantId,
        user_id: userId,
        is_active: true,
      },
      { $set: { is_active: false } },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true, id: parsed.data.id });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Payment Methods DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
