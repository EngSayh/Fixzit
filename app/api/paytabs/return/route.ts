/**
 * @description Handles PayTabs payment return redirects after checkout completion.
 * Receives the customer back from PayTabs payment page and redirects to billing completion page.
 * Extracts cart ID and payment status from query parameters for order finalization.
 * @route GET /api/paytabs/return
 * @access Public - PayTabs redirects customers here after payment
 * @query {string} cart_id - The cart/order identifier
 * @query {string} respStatus - Payment response status from PayTabs
 * @returns {Redirect} Redirects to /billing/complete with payment status
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
/**
 * @openapi
 * /api/paytabs/return:
 *   get:
 *     summary: paytabs/return operations
 *     tags: [paytabs]
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
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const url = new URL(req.url);
  const cartId =
    url.searchParams.get("cart_id") || url.searchParams.get("cartId");
  const status =
    url.searchParams.get("respStatus") || url.searchParams.get("status");

  const base = process.env.APP_URL || `${url.protocol}//${url.host}`;
  const redirectUrl = new URL("/billing/complete", base);
  if (cartId) redirectUrl.searchParams.set("cart_id", cartId);
  if (status) redirectUrl.searchParams.set("status", status);

  return NextResponse.redirect(redirectUrl.toString());
}
