import Subscription from "@/server/models/Subscription";
import { logger } from "@/lib/logger";
import { parseDate } from "@/lib/date-utils";
import { tapPayments } from "@/lib/finance/tap-payments";

export async function chargeDueMonthlySubs() {
  // TAP configuration is validated inside tapPayments client

  // 💰 FINANCIAL FIX (PR #47): Only charge subscriptions that are DUE
  // Calculate the start of today (00:00:00) in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Calculate the end of today (23:59:59) in UTC
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const dueSubs = await Subscription.find({
    billing_cycle: "MONTHLY",
    status: "ACTIVE",
    "tap.cardId": { $exists: true, $ne: null },
    // ✅ CRITICAL: Only charge if next_billing_date is today or in the past
    next_billing_date: { $lte: endOfToday },
  }).lean();

  const results = {
    total: dueSubs.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ subscriptionId: string; error: string }>,
  };

  for (const subscription of dueSubs) {
    if (!subscription.tap?.cardId) {
      logger.warn("[Billing] Subscription missing TAP card ID, skipping", {
        subscriptionId: subscription._id,
      });
      results.failed++;
      continue;
    }

    try {
      const charge = await tapPayments.createCharge({
        amount: subscription.amount,
        currency: subscription.currency || "SAR",
        customer: {
          first_name: subscription.customerName?.split(" ")[0] || "Customer",
          last_name: subscription.customerName?.split(" ").slice(1).join(" ") || "",
          email: subscription.customerEmail || "billing@fixzit.sa",
        },
        source: {
          id: subscription.tap.cardId,
        },
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || "https://fixzit.sa"}/billing/callback`,
        },
        description: "Monthly subscription renewal",
        reference: {
          transaction: `REN-${Date.now()}-${subscription._id}`,
          order: String(subscription._id),
        },
        metadata: {
          subscriptionId: String(subscription._id),
          type: "recurring",
        },
      });

      if (charge.status === "CAPTURED" || charge.status === "AUTHORIZED") {
        // ✅ Payment successful - update next billing date
        const nextBillingDate = parseDate(
          subscription.next_billing_date,
          () => new Date(),
        );
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await Subscription.findByIdAndUpdate(subscription._id, {
          next_billing_date: nextBillingDate,
          $push: {
            billing_history: {
              date: new Date(),
              amount: subscription.amount,
              currency: subscription.currency,
              tran_ref: charge.id,
              status: "SUCCESS",
            },
          },
        });

        results.success++;
        logger.info("[Billing] Successfully charged subscription", {
          subscriptionId: subscription._id,
          chargeId: charge.id,
        });
      } else {
        // ❌ Payment failed
        const errorMsg = charge.response?.message || "Payment declined";

        await Subscription.findByIdAndUpdate(subscription._id, {
          status: "PAST_DUE",
          $push: {
            billing_history: {
              date: new Date(),
              amount: subscription.amount,
              currency: subscription.currency,
              tran_ref: charge.id,
              status: "FAILED",
              error: errorMsg,
            },
          },
        });

        results.failed++;
        results.errors.push({
          subscriptionId: String(subscription._id),
          error: errorMsg,
        });
        logger.error("[Billing] Failed to charge subscription", {
          subscriptionId: subscription._id,
          error: errorMsg,
        });
      }
    } catch (_error: unknown) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.failed++;
      results.errors.push({
        subscriptionId: String(subscription._id),
        error: errorMessage,
      });
      logger.error("[Billing] Error charging subscription", {
        subscriptionId: subscription._id,
        error,
      });
    }
  }

  logger.info("[Billing] Recurring billing completed", {
    success: results.success,
    failed: results.failed,
    total: results.total,
  });
  return results;
}
