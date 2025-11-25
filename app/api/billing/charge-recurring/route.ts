import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Subscription from "@/server/models/Subscription";
import SubscriptionInvoice from "@/server/models/SubscriptionInvoice";
import PaymentMethod from "@/server/models/PaymentMethod";
import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { logger } from "@/lib/logger";
import { Config } from "@/lib/config/constants";

// POST with secret header from cron – for each sub due this day: charge recurring via token
/**
 * @openapi
 * /api/billing/charge-recurring:
 *   get:
 *     summary: billing/charge-recurring operations
 *     tags: [billing]
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
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  if (req.headers.get("x-cron-secret") !== Config.security.cronSecret)
    return createSecureResponse({ error: "UNAUTH" }, 401, req);
  await connectToDatabase();
  const today = new Date();
  const dueSubs = await Subscription.find({
    billing_cycle: "MONTHLY",
    status: "ACTIVE",
    next_billing_date: { $lte: today },
    paytabs_token_id: { $ne: null },
  });

  for (const s of dueSubs) {
    const pm = await PaymentMethod.findById(s.paytabs_token_id);
    if (!pm) continue;

    // Calculate billing period
    const periodStart = today;
    const periodEnd = new Date(today);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // ✅ FIXED: Add orgId, periodStart, periodEnd to match schema
    // @ts-expect-error - Mongoose 8.x type resolution issue with create overloads
    const inv = await SubscriptionInvoice.create({
      orgId: s.tenant_id, // Required by tenantIsolationPlugin
      subscriptionId: s._id,
      amount: s.amount,
      currency: s.currency,
      dueDate: today,
      periodStart, // ✅ ADDED: Billing period start
      periodEnd, // ✅ ADDED: Billing period end
      status: "pending",
    });

    // recurring charge (server-to-server) with error handling
    try {
      const response = await fetch(
        `${Config.payment.paytabs.baseUrl}/payment/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: Config.payment.paytabs.serverKey,
          },
          body: JSON.stringify({
            profile_id: Config.payment.paytabs.profileId,
            tran_type: "sale",
            tran_class: "recurring",
            cart_id: `INV-${inv._id}`,
            cart_description: "Fixzit Monthly Subscription",
            cart_amount: inv.amount,
            cart_currency: inv.currency,
            token: pm.pt_token, // ✅ FIXED: Use pt_token not token
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `PayTabs HTTP ${response.status}: ${await response.text().catch(() => "Unknown error")}`,
        );
      }

      const resp = await response.json();

      if (resp?.tran_ref) {
        inv.status = "paid";
        inv.paytabsTranRef = resp.tran_ref;
        await inv.save();
      } else {
        inv.status = "failed";
        inv.errorMessage = resp?.message || "UNKNOWN";
        await inv.save();
      }
    } catch (error) {
      logger.error(`Recurring charge failed for subscription ${s._id}`, {
        error,
      });
      inv.status = "failed";
      inv.errorMessage =
        error instanceof Error ? error.message : "Payment gateway error";
      await inv.save();
    }
    const nextBilling = new Date(today);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    s.next_billing_date = nextBilling;
    await s.save();
  }

  return createSecureResponse({ ok: true, count: dueSubs.length });
}
