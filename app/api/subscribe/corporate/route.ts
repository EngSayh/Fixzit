import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/mongodb-unified";
import { createSubscriptionCheckout } from "@/lib/finance/checkout";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { smartRateLimit } from "@/server/security/rateLimit";
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
 * /api/subscribe/corporate:
 *   post:
 *     summary: Create corporate subscription
 *     description: Initiates a corporate subscription checkout for multiple users/seats. Requires admin privileges. Creates Tap payment session for subscription.
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
 *               - tenantId
 *               - modules
 *               - seats
 *               - customer
 *             properties:
 *               tenantId:
 *                 type: string
 *                 description: Organization/tenant identifier
 *                 example: "tenant-abc-123"
 *               modules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of module names to subscribe to
 *                 example: ["WORK_ORDERS", "PROPERTIES", "INVOICES"]
 *               seats:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of user seats
 *                 example: 50
 *               billingCycle:
 *                 type: string
 *                 enum: [MONTHLY, ANNUAL]
 *                 default: MONTHLY
 *                 example: "ANNUAL"
 *               currency:
 *                 type: string
 *                 default: USD
 *                 example: "SAR"
 *               customer:
 *                 type: object
 *                 required:
 *                   - email
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: "admin@company.com"
 *                   name:
 *                     type: string
 *                     example: "Corporate Admin"
 *               priceBookId:
 *                 type: string
 *                 description: Custom pricing book ID
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Subscription checkout created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkoutUrl:
 *                   type: string
 *                   format: uri
 *                   description: Payment gateway checkout URL
 *                 subscriptionId:
 *                   type: string
 *                   description: Created subscription ID
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin role or tenant mismatch
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication and authorization
    const user = await getSessionUser(req);

    // Rate limiting: 3 req/5min (300000ms = 5 minutes) for subscription operations (very sensitive)
    const rl = await smartRateLimit(`subscribe-corporate:${user.id}`, 3, 300000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Only admins can create corporate subscriptions
    if (!["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(user.role)) {
      return forbiddenError("Admin role required for corporate subscriptions");
    }

    await dbConnect();
    const body = await req.json();

    // Tenant isolation: ensure tenantId matches user's orgId (unless SUPER_ADMIN)
    if (
      body.tenantId &&
      body.tenantId !== user.orgId &&
      user.role !== "SUPER_ADMIN"
    ) {
      return forbiddenError(
        "Tenant mismatch - cannot create subscription for different organization",
      );
    }

    if (!body.tenantId) {
      return validationError("Tenant ID is required");
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
      subscriberType: "CORPORATE",
      tenantId: body.tenantId,
      modules: body.modules,
      seats,
      billingCycle: body.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
      currency: body.currency ?? "USD",
      customer: body.customer,
      priceBookId: body.priceBookId,
      metadata: body.metadata,
    });

    return createSecureResponse(result, 200, req);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthenticated") {
      return unauthorizedError();
    }
    return handleApiError(error);
  }
}
