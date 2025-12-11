/**
 * @fileoverview PayTabs Payment API
 * @description Creates PayTabs payment pages for order payments.
 * Builds PayTabs payload and returns payment URL with transaction reference.
 * @route POST /api/payments/paytabs - Create PayTabs payment
 * @access Public - Rate limited
 * @module payments
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { fetchWithRetry } from "@/lib/http/fetchWithRetry";
import { SERVICE_RESILIENCE } from "@/config/service-timeouts";
import { getCircuitBreaker } from "@/lib/resilience";
import { Config } from "@/lib/config/constants";

const PaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("SAR"),
  customerEmail: z.string().email(),
  customerName: z.string(),
  customerPhone: z.string(),
});

/**
 * Create a PayTabs payment page for an incoming POST request and return a JSON response.
 *
 * Validates the request body against `PaymentSchema`, builds a PayTabs payload, and POSTs it
 * to the PayTabs payment request endpoint with a 15-second timeout. On success returns
 * `{ ok: true, paymentUrl, tranRef }`. Returns structured error responses for missing server key
 * (500), upstream PayTabs failures (502 with status and body), payment initialization failures (400
 * with details), or unexpected errors (500).
 *
 * @returns A NextResponse containing a JSON object describing success or failure and appropriate HTTP status codes.
 */
/**
 * @openapi
 * /api/payments/paytabs:
 *   get:
 *     summary: payments/paytabs operations
 *     tags: [payments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 10, 300000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const body = await req.json();
    const data = PaymentSchema.parse(body);

    const serverKey = Config.payment.paytabs.serverKey;
    if (!serverKey) {
      return createSecureResponse(
        { error: "PAYTABS server key not configured" },
        500,
        req,
      );
    }

    const payload = {
      profile_id: Config.payment.paytabs.profileId,
      tran_type: "sale",
      tran_class: "ecom",
      cart_id: data.orderId,
      cart_currency: data.currency,
      cart_amount: data.amount.toFixed(2),
      cart_description: `Fixzit Order ${data.orderId}`,
      customer_details: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
        country: "SA",
      },
      callback: `${Config.auth.url}/api/payments/paytabs/callback`,
      return: `${Config.auth.url}/marketplace/order-success`,
    };

    const paytabsResilience = SERVICE_RESILIENCE.paytabs;
    const paytabsBreaker = getCircuitBreaker("paytabs");

    const response = await fetchWithRetry(
      "https://secure.paytabs.sa/payment/request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: serverKey,
        },
        body: JSON.stringify(payload),
      },
      {
        timeoutMs: paytabsResilience.timeouts.paymentMs,
        maxAttempts: paytabsResilience.retries.maxAttempts,
        retryDelayMs: paytabsResilience.retries.baseDelayMs,
        label: "paytabs-payment-request",
        circuitBreaker: paytabsBreaker,
        shouldRetry: ({ response, error }) => {
          if (error) return true;
          if (!response) return false;
          return response.status >= 500 || response.status === 429;
        },
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return createSecureResponse(
        {
          error: "PayTabs request failed",
          status: response.status,
          body: text,
        },
        502,
        req,
      );
    }

    const result = await response.json();

    if (result.redirect_url) {
      return NextResponse.json({
        ok: true,
        paymentUrl: result.redirect_url,
        tranRef: result.tran_ref,
      });
    } else {
      return NextResponse.json(
        { ok: false, error: "Payment initialization failed", details: result },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error(
      "PayTabs error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { ok: false, error: "Payment processing failed" },
      { status: 500 },
    );
  }
}
