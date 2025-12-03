import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import { quotePrice } from "@/lib/finance/pricing";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

/**
 * @openapi
 * /api/checkout/quote:
 *   get:
 *     summary: checkout/quote operations
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
  const { seats, modules, billingCycle, currency } = body;

  const seatCount = Number(seats);
  if (!Number.isFinite(seatCount) || seatCount <= 0) {
    return createSecureResponse({ error: "INVALID_SEAT_COUNT" }, 400, req);
  }

  if (!Array.isArray(modules) || modules.length === 0) {
    return createSecureResponse({ error: "MODULES_REQUIRED" }, 400, req);
  }

  const quote = await quotePrice({
    priceBookCurrency: currency ?? "USD",
    seats: seatCount,
    modules,
    billingCycle: billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
  });

  return createSecureResponse(quote, 200, req);
}
