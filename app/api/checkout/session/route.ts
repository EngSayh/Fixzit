import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import { createSubscriptionCheckout } from "@/lib/finance/checkout";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

/**
 * @openapi
 * /api/checkout/session:
 *   get:
 *     summary: checkout/session operations
 *     tags: [checkout]
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
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await dbConnect();
  const body = await req.json();

  if (!["CORPORATE", "OWNER"].includes(body.subscriberType)) {
    return createSecureResponse({ error: "INVALID_SUBSCRIBER_TYPE" }, 400, req);
  }

  if (!Array.isArray(body.modules) || body.modules.length === 0) {
    return createSecureResponse({ error: "MODULES_REQUIRED" }, 400, req);
  }

  if (!body.customer?.email) {
    return createSecureResponse({ error: "CUSTOMER_EMAIL_REQUIRED" }, 400, req);
  }

  const seats = Number(body.seats);
  if (!Number.isFinite(seats) || seats <= 0) {
    return createSecureResponse({ error: "INVALID_SEAT_COUNT" }, 400, req);
  }

  const result = await createSubscriptionCheckout({
    subscriberType: body.subscriberType,
    tenantId: body.tenantId,
    ownerUserId: body.ownerUserId,
    modules: body.modules,
    seats,
    billingCycle: body.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
    currency: body.currency ?? "USD",
    customer: body.customer,
    priceBookId: body.priceBookId,
    metadata: body.metadata,
  });

  return createSecureResponse(result, 200, req);
}
