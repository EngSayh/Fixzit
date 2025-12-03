import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { validateCallback } from "@/lib/paytabs";
import { connectToDatabase } from "@/lib/mongodb-unified";
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
import { smartRateLimit } from "@/server/security/rateLimit";
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
    const rl = await smartRateLimit(
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

    // Validate cartId is a valid ObjectId before any DB operations
    // This prevents Mongoose cast errors from malformed webhook payloads
    if (!Types.ObjectId.isValid(normalized.cartId)) {
      logger.error("[PayTabs] Invalid cart_id format received", {
        cartId: normalized.cartId?.slice?.(0, 8) || "invalid",
      });
      return validationError("Invalid payment identifier format");
    }

    // Ensure DB connection is established (critical for serverless cold starts)
    await connectToDatabase();
    
    // CRITICAL: Verify payment record exists for all callbacks (success or failure)
    // Note: Initial lookup by _id only to get orgId, then we validate tenant context exists
    const { AqarPayment } = await import("@/server/models/aqar");
    const payment = await AqarPayment.findById(normalized.cartId)
      .select("status amount currency orgId")
      .lean();

    if (!payment) {
      logger.error("[PayTabs] Payment record not found", {
        cartId: normalized.cartId.slice(0, 8) + "...",
        respStatus: normalized.respStatus,
      });
      return validationError("Payment record not found");
    }

    // Get orgId for tenant-scoped updates
    const orgId = (payment as { orgId?: unknown }).orgId;
    const normalizedOrgId = orgId ? String(orgId) : undefined;

    // SECURITY: Fail closed when orgId is missing - prevents unscoped updates
    // All payments MUST have tenant attribution for multi-tenancy compliance
    if (!normalizedOrgId) {
      logger.error("[PayTabs] Payment record missing tenant context (orgId)", {
        cartId: normalized.cartId.slice(0, 8) + "...",
        respStatus: normalized.respStatus,
      });
      return validationError("Payment record missing tenant context");
    }

    // SECURITY: Build org-scoped filter to prevent cross-tenant updates
    // Using shared utility to avoid duplication and ensure consistent ObjectId handling
    const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");
    const orgScopedFilter = buildOrgScopedFilter(normalized.cartId, normalizedOrgId);

    // Handle non-success callbacks - mark payment as FAILED
    if (!success) {
      const currentStatus = (payment as { status?: string }).status;
      if (currentStatus === "PENDING" || currentStatus === "PROCESSING") {
        // normalizedOrgId is guaranteed to exist (fail-closed validation above)
        setTenantContext({ orgId: normalizedOrgId, userId: "paytabs-webhook" });
        try {
          await AqarPayment.findOneAndUpdate(
            orgScopedFilter,
            {
              $set: {
                status: "FAILED",
                failedAt: new Date(),
                gatewayTransactionId: normalized.tranRef,
                "gatewayResponse.respStatus": normalized.respStatus,
                "gatewayResponse.respMessage": normalized.respMessage,
              },
            },
            { runValidators: true },
          );
          logger.info("[PayTabs] Payment marked as FAILED", {
            cartId: normalized.cartId.slice(0, 8) + "...",
            respStatus: normalized.respStatus,
            respMessage: normalized.respMessage,
          });
        } finally {
          clearTenantContext();
        }
      }
      return createSecureResponse(
        { ok: true, status: "FAILED", message: normalized.respMessage },
        200,
        req,
      );
    }

    // Success path continues below
    if (success) {
      const total = normalized.amount;
      if (!Number.isFinite(total) || (total as number) <= 0) {
        return validationError("Invalid payment amount");
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
        // Mark as FAILED to close out PENDING record and prevent retry loops
        // normalizedOrgId is guaranteed to exist (fail-closed validation above)
        setTenantContext({ orgId: normalizedOrgId, userId: "paytabs-webhook" });
        try {
          await AqarPayment.findOneAndUpdate(
            orgScopedFilter,
            {
              $set: {
                status: "FAILED",
                failedAt: new Date(),
                failureReason: "AMOUNT_MISMATCH",
                "gatewayResponse.respStatus": normalized.respStatus,
                "gatewayResponse.amountReceived": total,
                "gatewayResponse.amountExpected": paymentAmount,
              },
            },
            { runValidators: true },
          );
        } finally {
          clearTenantContext();
        }
        return validationError("Payment amount mismatch");
      }

      if (normalized.currency && normalized.currency !== paymentCurrency) {
        logger.error("[PayTabs] Currency mismatch - possible tampering", {
          cartId: normalized.cartId.slice(0, 8) + "...",
          expected: paymentCurrency,
          received: normalized.currency,
        });
        // Mark as FAILED to close out PENDING record and prevent retry loops
        // normalizedOrgId is guaranteed to exist (fail-closed validation above)
        setTenantContext({ orgId: normalizedOrgId, userId: "paytabs-webhook" });
        try {
          await AqarPayment.findOneAndUpdate(
            orgScopedFilter,
            {
              $set: {
                status: "FAILED",
                failedAt: new Date(),
                failureReason: "CURRENCY_MISMATCH",
                "gatewayResponse.respStatus": normalized.respStatus,
                "gatewayResponse.currencyReceived": normalized.currency,
                "gatewayResponse.currencyExpected": paymentCurrency,
              },
            },
            { runValidators: true },
          );
        } finally {
          clearTenantContext();
        }
        return validationError("Payment currency mismatch");
      }

      try {
        await withIdempotency(
          buildPaytabsIdempotencyKey(normalized, { route: "marketplace" }),
          async () => {
            // Set tenant context for all operations
            // normalizedOrgId is guaranteed to exist (fail-closed validation above)
            setTenantContext({ orgId: normalizedOrgId, userId: "paytabs-webhook" });

            // Update payment status to PROCESSING first (reversible state)
            // Only mark COMPLETED after successful ZATCA clearance
            const { AqarPayment: PaymentModel } = await import("@/server/models/aqar");
            await PaymentModel.findOneAndUpdate(
              orgScopedFilter,
              {
                $set: {
                  status: "PROCESSING",
                  gatewayTransactionId: normalized.tranRef,
                  method: normalized.paymentMethod || "CREDIT_CARD",
                },
              },
              { runValidators: true },
            );
            logger.info("[PayTabs] Payment marked as PROCESSING", {
              cartId: normalized.cartId.slice(0, 8) + "...",
            });

            try {
              await handleSuccessfulMarketplacePayment({
                cartId: normalized.cartId,
                amount: total as number,
                currency: paymentCurrency,
                orgId: normalizedOrgId,
                orgScopedFilter,
              });
              logger.info("Payment successful", {
                order: normalized.cartId.slice(0, 8) + "...",
              });
            } catch (innerError) {
              // COMPENSATION: Revert PROCESSING to FAILED on non-ZATCA errors
              // This prevents payments from being stuck in PROCESSING forever
              if (!(innerError instanceof ZatcaClearanceError)) {
                logger.error("[PayTabs] Non-ZATCA error during payment processing - reverting to FAILED", {
                  cartId: normalized.cartId.slice(0, 8) + "...",
                  error: innerError instanceof Error ? innerError.message : String(innerError),
                });
                try {
                  await PaymentModel.findOneAndUpdate(
                    orgScopedFilter,
                    {
                      $set: {
                        status: "FAILED",
                        failedAt: new Date(),
                        failureReason: "PROCESSING_ERROR",
                        lastError: innerError instanceof Error ? innerError.message : String(innerError),
                      },
                    },
                    { runValidators: true },
                  );
                } catch (rollbackError) {
                  logger.error("[PayTabs] Failed to rollback PROCESSING status", {
                    cartId: normalized.cartId.slice(0, 8) + "...",
                    rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
                  });
                }
              }
              throw innerError;
            }
          },
          PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS,
        );
      } catch (error) {
        if (error instanceof ZatcaClearanceError) {
          logger.error("[ZATCA] Fatoora clearance FAILED - marking payment as ZATCA_PENDING", {
            cartId: normalized.cartId.slice(0, 8) + "...",
            error: error.message,
          });
          
          // Rollback: Mark payment as COMPLETED but with ZATCA pending status
          // This allows retry of ZATCA clearance without losing payment info
          try {
            const { AqarPayment: PaymentModel } = await import("@/server/models/aqar");
            // normalizedOrgId is guaranteed to exist (fail-closed validation above)
            setTenantContext({ orgId: normalizedOrgId, userId: "paytabs-webhook" });
            await PaymentModel.findOneAndUpdate(
              orgScopedFilter,
              {
                $set: {
                  status: "COMPLETED",
                  paidAt: new Date(),
                  "zatca.complianceStatus": "PENDING_RETRY",
                  "zatca.lastError": error.message,
                  "zatca.lastAttemptAt": new Date(),
                },
              },
              { runValidators: true },
            );
            logger.info("[PayTabs] Payment marked as COMPLETED with ZATCA_PENDING_RETRY", {
              cartId: normalized.cartId.slice(0, 8) + "...",
            });
          } catch (updateError) {
            logger.error("[PayTabs] Failed to update payment status after ZATCA failure", {
              cartId: normalized.cartId.slice(0, 8) + "...",
              error: updateError instanceof Error ? updateError.message : String(updateError),
            });
          }
          
          // Use createSecureResponse for consistent security headers on error responses
          return createSecureResponse(error.body, error.status, req);
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
  orgScopedFilter,
}: {
  cartId: string;
  amount: number;
  currency?: string;
  orgId?: string;
  orgScopedFilter: Record<string, unknown>;
}): Promise<void> {
  // Tenant context is set by caller (POST handler) and cleared in its finally block.
  // Do NOT set context here to avoid nested context ownership ambiguity.

  if (process.env.NODE_ENV !== "production") {
    // In non-production, mark as COMPLETED immediately (no ZATCA)
    const { AqarPayment: PaymentModel } = await import("@/server/models/aqar");
    await PaymentModel.findOneAndUpdate(
      orgScopedFilter,
      {
        $set: {
          status: "COMPLETED",
          paidAt: new Date(),
          "zatca.complianceStatus": "NOT_REQUIRED",
        },
      },
      { runValidators: true },
    );
    logger.warn(
      "[ZATCA] Skipping Fatoora clearance in non-production environment",
      {
        cartId,
        amount,
      },
    );
    
    // Still try to activate package (pass orgId for tenant isolation)
    // Use retry-safe version that enqueues on failure instead of throwing
    await tryActivatePackageWithRetry(cartId, orgId);
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

  // Use centralized ZATCA config URL (avoids duplication)
  const clearanceApiUrl = SERVICE_RESILIENCE.zatca.clearanceApiUrl;

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
    await updatePaymentRecord(cartId, orgId, {
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

  // Pass orgId for tenant-scoped package activation
  // If activation fails, enqueue for retry instead of failing the webhook
  await tryActivatePackageWithRetry(cartId, orgId);
}

/**
 * Attempt package activation with automatic retry queue fallback.
 * If activation fails, enqueue a retry job instead of failing the webhook.
 * This ensures paid tenants are provisioned even if activation has transient failures.
 */
async function tryActivatePackageWithRetry(cartId: string, orgId?: string): Promise<void> {
  // SECURITY: Fail-closed - if orgId missing, log error but don't block webhook
  if (!orgId) {
    logger.error("[PayTabs] Package activation skipped: orgId required for tenant isolation", {
      cart_id: cartId.slice(0, 8) + "...",
    });
    // Don't throw - webhook should succeed to acknowledge PayTabs
    return;
  }

  try {
    const { activatePackageAfterPayment } = await import(
      "@/lib/aqar/package-activation"
    );
    const activated = await activatePackageAfterPayment(String(cartId), orgId);

    if (!activated) {
      // Activation returned false - validation failure, enqueue for retry
      throw new Error(`Package activation returned false for cart_id=${cartId.slice(0, 8)}...`);
    }

    logger.info("[PayTabs] Package activated successfully", {
      cart_id: cartId.slice(0, 8) + "...",
    });
  } catch (err) {
    logger.warn("[PayTabs] Package activation failed, enqueueing retry", {
      cart_id: cartId.slice(0, 8) + "...",
      error: err instanceof Error ? err.message : String(err),
    });

    // Enqueue for background retry instead of failing webhook
    try {
      // Get invoiceId from payment record for retry tracking
      const { AqarPayment } = await import("@/server/models/aqar");
      const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");
      const payment = await AqarPayment.findOne(buildOrgScopedFilter(cartId, orgId))
        .select("invoiceId")
        .lean();

      const invoiceId = payment?.invoiceId?.toString() || cartId; // Fallback to cartId if no invoiceId

      const { enqueueActivationRetry } = await import("@/jobs/package-activation-queue");
      const jobId = await enqueueActivationRetry(cartId, invoiceId, orgId);

      if (jobId) {
        logger.info("[PayTabs] Activation retry enqueued", {
          cart_id: cartId.slice(0, 8) + "...",
          jobId,
        });
      } else {
        logger.error("[PayTabs] Failed to enqueue activation retry (Redis unavailable?)", {
          cart_id: cartId.slice(0, 8) + "...",
        });
      }
    } catch (queueErr) {
      logger.error("[PayTabs] Failed to enqueue activation retry", {
        cart_id: cartId.slice(0, 8) + "...",
        error: queueErr instanceof Error ? queueErr.message : String(queueErr),
      });
    }
    // Don't re-throw - webhook should succeed to acknowledge PayTabs
  }
}

// NOTE: _tryActivatePackage is kept as a reference for strict fail-closed behavior
// Use tryActivatePackageWithRetry for production webhooks (enqueues retries on failure)
async function _tryActivatePackage(cartId: string, orgId?: string): Promise<void> {
  // SECURITY: Fail-closed - throw if orgId missing to surface upstream issues
  if (!orgId) {
    const msg = "Package activation BLOCKED: orgId required for tenant isolation";
    logger.error(`[PayTabs] ${msg}`, {
      cart_id: cartId.slice(0, 8) + "...",
    });
    throw new Error(msg);
  }
  try {
    const { activatePackageAfterPayment } = await import(
      "@/lib/aqar/package-activation"
    );
    const activated = await activatePackageAfterPayment(String(cartId), orgId);
    // SECURITY: Fail-closed if activation returned false (validation failure)
    if (!activated) {
      throw new Error(`Package activation returned false for cart_id=${cartId.slice(0, 8)}... - validation failure`);
    }
  } catch (err) {
    logger.error("[PayTabs] Package activation failed", {
      cart_id: cartId.slice(0, 8) + "...",
      error: err instanceof Error ? err.message : String(err),
    });
    // Re-throw to propagate failure to caller
    throw err;
  }
}

async function updatePaymentRecord(
  cartId: string,
  callerOrgId: string | undefined,
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
  const { buildOrgScopedFilter } = await import("@/lib/utils/org-scope");

  // SECURITY: Use org-scoped lookup from the start to prevent cross-tenant reads
  // Caller provides orgId from already-validated context (main POST handler)
  // NOTE: Tenant context is managed by the caller (POST handler) - we rely on that
  // to avoid nested context ownership ambiguity. The caller's finally block clears context.
  if (!callerOrgId) {
    throw new Error(`Payment update requires orgId for cart_id: ${cartId}`);
  }

  // Build org-scoped filter using shared helper (includes ObjectId variants)
  const orgScopedFilter = buildOrgScopedFilter(cartId, callerOrgId);

  // Verify payment exists with org-scoped query (no unscoped read)
  const existing = await AqarPayment.findOne(orgScopedFilter)
    .select("_id orgId org_id")
    .lean()
    .exec();

  if (!existing) {
    throw new Error(`Payment record not found for cart_id: ${cartId} (org-scoped)`);
  }

  // NOTE: No setTenantContext here - caller already manages tenant context
  // This avoids nested context ownership ambiguity
  const result = await AqarPayment.findOneAndUpdate(
    orgScopedFilter,
    {
      $set: {
        // Mark as COMPLETED only after successful ZATCA clearance
        status: "COMPLETED",
        paidAt: new Date(),
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
}

// Exported for testing to validate tenant alias handling
export { updatePaymentRecord };
