import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { validateCallback } from "@/lib/paytabs";
import {
  buildPaytabsIdempotencyKey,
  enforcePaytabsPayloadSize,
  extractPaytabsSignature,
  normalizePaytabsCallbackPayload,
  parsePaytabsJsonPayload,
  PaytabsCallbackValidationError,
  PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS,
  PAYTABS_CALLBACK_RATE_LIMIT,
} from "@/lib/payments/paytabs-callback.contract";
import { fetchWithRetry } from "@/lib/http/fetchWithRetry";
import { SERVICE_RESILIENCE } from "@/config/service-timeouts";
import { getCircuitBreaker } from "@/lib/resilience";
import { withIdempotency } from "@/server/security/idempotency";
import { rateLimit } from "@/server/security/rateLimit";
import {
  unauthorizedError,
  validationError,
  rateLimitError,
  handleApiError,
} from "@/server/utils/errorResponses";
import { createSecureResponse, getClientIP } from "@/server/security/headers";
import { Config } from "@/lib/config/constants";
import {
  clearTenantContext,
  setTenantContext,
} from "@/server/plugins/tenantIsolation";
import { Types } from "mongoose";

const PAYTABS_SERVER_KEY = Config.payment.paytabs.serverKey;
const PAYTABS_CONFIGURED = Boolean(
  PAYTABS_SERVER_KEY && Config.payment.paytabs.profileId,
);

/**
 * @openapi
 * /api/payments/paytabs/callback:
 *   post:
 *     summary: PayTabs payment callback webhook
 *     description: Handles payment gateway callbacks for transaction processing. Validates signature, updates payment status, generates ZATCA-compliant invoices for Saudi Arabia tax compliance.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tran_ref:
 *                 type: string
 *               cart_id:
 *                 type: string
 *               resp_status:
 *                 type: string
 *               resp_message:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       401:
 *         description: Invalid signature
 *       400:
 *         description: Invalid amount
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIP(req);
    const rl = rateLimit(
      `payment-callback:${clientIp}`,
      PAYTABS_CALLBACK_RATE_LIMIT.requests,
      PAYTABS_CALLBACK_RATE_LIMIT.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    const raw = await req.text();
    try {
      enforcePaytabsPayloadSize(raw);
    } catch (error) {
      if (error instanceof PaytabsCallbackValidationError) {
        return createSecureResponse({ error: error.message }, 413, req);
      }
      throw error;
    }

    let payload;
    try {
      payload = parsePaytabsJsonPayload(raw);
    } catch (error) {
      if (error instanceof PaytabsCallbackValidationError) {
        logger.error("[PayTabs] Invalid marketplace callback payload", {
          message: error.message,
        });
        return createSecureResponse({ error: error.message }, 400, req);
      }
      throw error;
    }

    const signature = extractPaytabsSignature(req, payload);
    
    // SECURITY: Fail closed - reject callbacks without signature OR when PayTabs not configured
    // This prevents spoofed payment completions in misconfigured environments
    if (!signature) {
      logger.error("[PayTabs] Callback rejected - missing signature", {
        paytabsConfigured: PAYTABS_CONFIGURED,
      });
      return unauthorizedError("Invalid payment callback signature");
    }
    
    if (!PAYTABS_CONFIGURED) {
      logger.error("[PayTabs] Callback rejected - PayTabs not configured");
      return unauthorizedError("Payment gateway not configured");
    }

    const isValid = validateCallback(payload, signature || "");
    if (!isValid) {
      return unauthorizedError("Invalid payment callback signature");
    }

    let normalized;
    try {
      normalized = normalizePaytabsCallbackPayload(payload);
    } catch (error) {
      if (error instanceof PaytabsCallbackValidationError) {
        return createSecureResponse({ error: error.message }, 400, req);
      }
      throw error;
    }

    const success = normalized.respStatus === "A";
    if (success) {
      const total = normalized.amount;
      if (!Number.isFinite(total) || (total as number) <= 0) {
        return validationError("Invalid payment amount");
      }

      // CRITICAL: Verify payment record exists and validate amount/currency before processing
      const { AqarPayment } = await import("@/server/models/aqar");
      const payment = await AqarPayment.findById(normalized.cartId)
        .select("status amount currency orgId org_id")
        .lean();

      if (!payment) {
        logger.error("[PayTabs] Payment record not found", {
          cartId: normalized.cartId.slice(0, 8) + "...",
        });
        return validationError("Payment record not found");
      }

      // Prevent duplicate processing - only PENDING payments can be completed
      if ((payment as { status?: string }).status !== "PENDING") {
        logger.warn("[PayTabs] Payment already processed", {
          cartId: normalized.cartId.slice(0, 8) + "...",
          currentStatus: (payment as { status?: string }).status,
        });
        // Return success to acknowledge callback - idempotent behavior
        return createSecureResponse(
          { ok: true, status: "ALREADY_PROCESSED", message: "Payment already processed" },
          200,
          req,
        );
      }

      // Validate amount integrity - prevent tampered callbacks with lower amounts
      const paymentAmount = (payment as { amount?: number }).amount;
      const paymentCurrency = (payment as { currency?: string }).currency || "SAR";
      if (paymentAmount !== total) {
        logger.error("[PayTabs] Amount mismatch - possible tampering", {
          cartId: normalized.cartId.slice(0, 8) + "...",
          expected: paymentAmount,
          received: total,
        });
        return validationError("Payment amount mismatch");
      }

      if (normalized.currency && normalized.currency !== paymentCurrency) {
        logger.error("[PayTabs] Currency mismatch", {
          cartId: normalized.cartId.slice(0, 8) + "...",
          expected: paymentCurrency,
          received: normalized.currency,
        });
        return validationError("Payment currency mismatch");
      }

      try {
        await withIdempotency(
          buildPaytabsIdempotencyKey(normalized, { route: "marketplace" }),
          async () => {
            // Get orgId from payment record for tenant context
            const orgId =
              (payment as { orgId?: unknown; org_id?: unknown }).orgId ??
              (payment as { orgId?: unknown; org_id?: unknown }).org_id;

            // Update payment status to COMPLETED BEFORE ZATCA clearance
            // This ensures the payment is marked as paid even if ZATCA fails
            const { AqarPayment: PaymentModel } = await import("@/server/models/aqar");
            await PaymentModel.findByIdAndUpdate(
              normalized.cartId,
              {
                $set: {
                  status: "COMPLETED",
                  paidAt: new Date(),
                  gatewayTransactionId: normalized.tranRef,
                  method: normalized.paymentMethod || "CREDIT_CARD",
                },
              },
              { runValidators: true },
            );
            logger.info("[PayTabs] Payment marked as COMPLETED", {
              cartId: normalized.cartId.slice(0, 8) + "...",
            });

            await handleSuccessfulMarketplacePayment({
              cartId: normalized.cartId,
              amount: total as number,
              currency: paymentCurrency,
              orgId: orgId ? String(orgId) : undefined,
            });
            logger.info("Payment successful", {
              order: normalized.cartId.slice(0, 8) + "...",
            });
          },
          PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS,
        );
      } catch (error) {
        if (error instanceof ZatcaClearanceError) {
          logger.error("[ZATCA] Fatoora clearance FAILED - Payment aborted", {
            cartId: normalized.cartId.slice(0, 8) + "...",
            error: error.message,
          });
          return NextResponse.json(error.body, { status: error.status });
        }
        throw error;
      }
    }

    return createSecureResponse(
      {
        ok: true,
        status: success ? "PAID" : "FAILED",
        message: normalized.respMessage,
      },
      200,
      req,
    );
  } catch (error: unknown) {
    return handleApiError(error);
  } finally {
    // Ensure any tenant context set during webhook handling is cleared
    clearTenantContext();
  }
}

type ZatcaClearanceResponse = {
  clearanceStatus?: string;
  clearanceId?: string;
  uuid?: string;
  qrCode?: string;
  invoiceHash?: string;
};

class ZatcaClearanceError extends Error {
  public readonly body: {
    ok: false;
    status: string;
    message: string;
    error: string;
  };

  constructor(
    reason: string,
    public readonly status: number = 500,
  ) {
    super(reason);
    this.name = "ZatcaClearanceError";
    this.body = {
      ok: false,
      status: "ZATCA_CLEARANCE_FAILED",
      message:
        "Payment received but ZATCA/Fatoora clearance failed. Invoice non-compliant.",
      error: reason,
    };
  }
}

async function handleSuccessfulMarketplacePayment({
  cartId,
  amount,
  currency = "SAR",
  orgId,
}: {
  cartId: string;
  amount: number;
  currency?: string;
  orgId?: string;
}): Promise<void> {
  // Set tenant context if orgId is available
  if (orgId) {
    setTenantContext({ orgId, userId: "paytabs-webhook" });
  }

  if (process.env.NODE_ENV !== "production") {
    logger.warn(
      "[ZATCA] Skipping Fatoora clearance in non-production environment",
      {
        cartId,
        amount,
      },
    );
    return;
  }

  // ZATCA COMPLIANCE: Require all seller identity envs - no production fallbacks
  const zatcaSellerName = process.env.ZATCA_SELLER_NAME;
  const zatcaVatNumber = process.env.ZATCA_VAT_NUMBER;
  const zatcaSellerAddress = process.env.ZATCA_SELLER_ADDRESS;
  const clearanceApiKey = process.env.ZATCA_API_KEY;

  if (!clearanceApiKey || !zatcaSellerName || !zatcaVatNumber || !zatcaSellerAddress) {
    const missingEnvs = [
      !clearanceApiKey && "ZATCA_API_KEY",
      !zatcaSellerName && "ZATCA_SELLER_NAME",
      !zatcaVatNumber && "ZATCA_VAT_NUMBER",
      !zatcaSellerAddress && "ZATCA_SELLER_ADDRESS",
    ].filter(Boolean);
    
    throw new ZatcaClearanceError(
      `ZATCA configuration incomplete - missing: ${missingEnvs.join(", ")}`
    );
  }

  const invoicePayload = {
    invoiceType: "SIMPLIFIED",
    invoiceNumber: `PAY-${cartId}`,
    issueDate: new Date().toISOString(),
    seller: {
      name: zatcaSellerName,
      vatNumber: zatcaVatNumber,
      address: zatcaSellerAddress,
    },
    total: String(amount),
    currency,
    vatAmount: String(+(amount * 0.15).toFixed(2)),
    items: [
      {
        description: "Payment via PayTabs",
        quantity: 1,
        unitPrice: amount,
        vatRate: 0.15,
      },
    ],
  };

  const clearanceApiUrl =
    process.env.ZATCA_CLEARANCE_API_URL ||
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single";

  const zatcaResilience = SERVICE_RESILIENCE.zatca;
  const zatcaBreaker = getCircuitBreaker("zatca");

  const clearanceHttpResponse = await fetchWithRetry(
    clearanceApiUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clearanceApiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(invoicePayload),
    },
    {
      timeoutMs: zatcaResilience.timeouts.clearanceMs,
      maxAttempts: zatcaResilience.retries.maxAttempts,
      retryDelayMs: zatcaResilience.retries.baseDelayMs,
      label: "zatca-clearance",
      circuitBreaker: zatcaBreaker,
      shouldRetry: ({ response, error }) => {
        if (error) return true;
        if (!response) return false;
        return response.status >= 500 || response.status === 429;
      },
    },
  );

  if (!clearanceHttpResponse.ok) {
    const errorData = await clearanceHttpResponse.json().catch(() => ({}));
    throw new ZatcaClearanceError(
      `ZATCA clearance API returned ${clearanceHttpResponse.status}: ${JSON.stringify(errorData)}`,
      clearanceHttpResponse.status >= 400 ? clearanceHttpResponse.status : 500,
    );
  }

  const clearanceResponse =
    (await clearanceHttpResponse.json()) as ZatcaClearanceResponse;
  if (!clearanceResponse || typeof clearanceResponse !== "object") {
    throw new ZatcaClearanceError("Invalid ZATCA clearance response structure");
  }
  if (
    !clearanceResponse.clearanceStatus ||
    clearanceResponse.clearanceStatus !== "CLEARED"
  ) {
    throw new ZatcaClearanceError(
      `ZATCA clearance not approved: ${clearanceResponse.clearanceStatus || "UNKNOWN"}`,
    );
  }

  const clearanceId = clearanceResponse.clearanceId || clearanceResponse.uuid;
  const zatcaQR = clearanceResponse.qrCode;
  const invoiceHash = clearanceResponse.invoiceHash;
  if (!clearanceId || !zatcaQR) {
    throw new ZatcaClearanceError(
      "ZATCA clearance response missing required fields (clearanceId or qrCode)",
    );
  }

  try {
    await updatePaymentRecord(cartId, {
      zatcaQR,
      zatcaInvoiceHash: invoiceHash,
      fatooraClearanceId: clearanceId,
      fatooraClearedAt: new Date(),
      zatcaSubmittedAt: new Date(),
      invoicePayload,
      complianceStatus: "CLEARED",
    });
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : `Payment record persistence failed: ${String(error)}`;
    throw new ZatcaClearanceError(
      `Payment cleared by ZATCA but failed to persist evidence: ${reason}`,
    );
  }

  logger.info("[ZATCA] Fatoora clearance successful", {
    cartId: cartId.slice(0, 8) + "...",
    clearanceId: clearanceId ? String(clearanceId).slice(0, 16) + "..." : "N/A",
  });

  await tryActivatePackage(cartId);
}

async function tryActivatePackage(cartId: string): Promise<void> {
  try {
    const { activatePackageAfterPayment } = await import(
      "@/lib/aqar/package-activation"
    );
    await activatePackageAfterPayment(String(cartId));
  } catch (err) {
    logger.warn("Package activation skipped or failed", {
      cart_id: cartId.slice(0, 8) + "...",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function updatePaymentRecord(
  cartId: string,
  evidence: {
    zatcaQR: string;
    zatcaInvoiceHash?: string;
    fatooraClearanceId: string;
    fatooraClearedAt: Date;
    zatcaSubmittedAt: Date;
    invoicePayload: Record<string, unknown>;
    complianceStatus: string;
  },
) {
  const { AqarPayment } = await import("@/server/models/aqar");

  // Enforce tenant scoping for payment updates
  const existing = await AqarPayment.findOne({ _id: cartId })
    .select("orgId org_id")
    .lean()
    .exec();

  if (!existing) {
    throw new Error(`Payment record not found for cart_id: ${cartId}`);
  }

  const orgId =
    (existing as { orgId?: unknown; org_id?: unknown }).orgId ??
    (existing as { orgId?: unknown; org_id?: unknown }).org_id;

  try {
    if (orgId === undefined || orgId === null || orgId === "") {
      throw new Error(
        `Payment record found for cart_id: ${cartId} but missing orgId`,
      );
    }

    // Normalize orgId to string for tenant context.
    // MongoDB may store orgId as either a string or ObjectId depending on migration state.
    // We build a query filter that matches both representations to ensure cross-version compatibility.
    const normalizedOrgId = String(orgId);
    const orgAsObjectId = Types.ObjectId.isValid(normalizedOrgId)
      ? new Types.ObjectId(normalizedOrgId)
      : undefined;

    setTenantContext({
      orgId: normalizedOrgId,
      userId: "paytabs-webhook",
    });

    const orgScopedFilter = {
      $or: [
        { orgId },
        { org_id: orgId },
        ...(orgAsObjectId
          ? [
              { orgId: orgAsObjectId },
              { org_id: orgAsObjectId },
            ]
          : []),
      ],
    };

    const result = await AqarPayment.findOneAndUpdate(
      { _id: cartId, ...orgScopedFilter },
      {
        $set: {
          "zatca.qrCode": evidence.zatcaQR,
          "zatca.invoiceHash": evidence.zatcaInvoiceHash,
          "zatca.clearanceId": evidence.fatooraClearanceId,
          "zatca.clearedAt": evidence.fatooraClearedAt,
          "zatca.submittedAt": evidence.zatcaSubmittedAt,
          "zatca.invoicePayload": evidence.invoicePayload,
          "zatca.complianceStatus": evidence.complianceStatus,
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: false,
        runValidators: true,
      },
    );

    if (!result) {
      throw new Error(
        `Payment record not found for cart_id: ${cartId} (org scoped)`,
      );
    }

    return result;
  } finally {
    clearTenantContext();
  }
}

// Exported for testing to validate tenant alias handling
export { updatePaymentRecord };
