import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import { createSubscriptionCheckout } from "@/lib/finance/checkout";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { rateLimit } from "@/server/security/rateLimit";
import {
  forbiddenError,
  validationError,
  unauthorizedError,
  rateLimitError,
  handleApiError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

/**
 * @openapi
 * /api/subscribe/owner:
 *   post:
 *     summary: Create owner subscription
 *     description: Initiates an owner subscription checkout for individual property owners. User must be admin or subscribing for themselves.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownerUserId
 *               - modules
 *               - seats
 *               - customer
 *             properties:
 *               ownerUserId:
 *                 type: string
 *                 description: User ID of the property owner
 *                 example: "user-123"
 *               modules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of module names to subscribe to
 *                 example: ["PROPERTIES", "TENANTS", "MAINTENANCE"]
 *               seats:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of user seats
 *                 example: 5
 *               billingCycle:
 *                 type: string
 *                 enum: [MONTHLY, ANNUAL]
 *                 default: MONTHLY
 *               currency:
 *                 type: string
 *                 default: USD
 *               customer:
 *                 type: object
 *                 required:
 *                   - email
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                   name:
 *                     type: string
 *               ownerGroup:
 *                 type: string
 *                 description: Owner group classification
 *     responses:
 *       200:
 *         description: Subscription checkout created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Must be admin or subscribing for self
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication and authorization
    const user = await getSessionUser(req);

    // Rate limiting: 3 req/5min for subscription operations (very sensitive)
    const rl = rateLimit(`subscribe-owner:${user.id}`, 3, 300000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await dbConnect();
    const body = await req.json();

    // Authorization: must be admin or subscribing for self
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
    const isSelf = body.ownerUserId === user.id;

    if (!isAdmin && !isSelf) {
      return forbiddenError(
        "Can only subscribe for yourself unless you are an admin",
      );
    }

    if (!body.ownerUserId) {
      return validationError("Owner user ID is required");
    }

    if (!Array.isArray(body.modules) || body.modules.length === 0) {
      return validationError("At least one module is required");
    }

    if (!body.customer?.email) {
      return validationError("Customer email is required");
    }

    const seats = Number(body.seats);
    if (!Number.isFinite(seats) || seats <= 0) {
      return validationError("Invalid seat count - must be positive number");
    }

    const result = await createSubscriptionCheckout({
      subscriberType: "OWNER",
      ownerUserId: body.ownerUserId,
      modules: body.modules,
      seats,
      billingCycle: body.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
      currency: body.currency ?? "USD",
      customer: body.customer,
      priceBookId: body.priceBookId,
      metadata: {
        ownerGroup: body.ownerGroup,
      },
    });

    return createSecureResponse(result, 200, req);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthenticated") {
      return unauthorizedError();
    }
    return handleApiError(error);
  }
}
