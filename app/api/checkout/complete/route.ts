import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import Subscription from "@/server/models/Subscription";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse, getClientIP } from "@/server/security/headers";
import { getSessionOrNull } from "@/lib/auth/safe-session";

/**
 * @openapi
 * /api/checkout/complete:
 *   post:
 *     summary: Complete checkout and finalize payment
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
  /**
   * Rate Limiting: 60 requests per minute per IP
   * Protects against checkout spam and payment fraud attempts
   */
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const sessionResult = await getSessionOrNull(req, { route: "checkout:complete" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const session = sessionResult.session;
  if (!session) {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  await dbConnect();
  let body: { subscriptionId?: string; cartId?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch (_error) {
    return createSecureResponse({ error: "Invalid JSON" }, 400, req);
  }

  if (body.payload) {
    return createSecureResponse(
      { error: "Unexpected payload for checkout completion" },
      400,
      req,
    );
  }

  /**
   * Subscription Retrieval
   * Try to find subscription by either:
 * 1. Direct subscription ID (required)
 */
  const subscriptionId = body.subscriptionId;
  if (!subscriptionId) {
    return createSecureResponse({ error: "SUBSCRIPTION_ID_REQUIRED" }, 400, req);
  }

  const subscription = await Subscription.findById(subscriptionId);

  if (!subscription) {
    return createSecureResponse({ error: "SUBSCRIPTION_NOT_FOUND" }, 404, req);
  }

  const isTenantMatch =
    subscription.tenant_id &&
    session.orgId &&
    subscription.tenant_id.toString() === session.orgId;
  const isOwnerMatch =
    subscription.owner_user_id &&
    subscription.owner_user_id.toString() === session.id;
  const isSuperAdmin = Boolean(session.isSuperAdmin);

  if (!isTenantMatch && !isOwnerMatch && !isSuperAdmin) {
    return createSecureResponse({ error: "Forbidden" }, 403, req);
  }

  /**
   * Return subscription status
   * Frontend uses this to determine if checkout was successful
   */
  return createSecureResponse(
    {
      ok: subscription.status === "ACTIVE",
      subscription,
    },
    200,
    req,
  );
}
