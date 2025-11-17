import Subscription from '@/server/models/Subscription';
import { logger } from '@/lib/logger';
import { parseDate } from '@/lib/date-utils';

export async function chargeDueMonthlySubs() {
  const paytabsDomain = process.env.PAYTABS_DOMAIN;
  const paytabsProfileId = process.env.PAYTABS_PROFILE_ID;
  const paytabsServerKey = process.env.PAYTABS_SERVER_KEY;

  if (!paytabsDomain || !paytabsProfileId || !paytabsServerKey) {
    throw new Error('PayTabs environment variables are not fully configured');
  }

  // 💰 FINANCIAL FIX (PR #47): Only charge subscriptions that are DUE
  // Calculate the start of today (00:00:00) in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Calculate the end of today (23:59:59) in UTC
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const dueSubs = await Subscription.find({
    billing_cycle: 'MONTHLY',
    status: 'ACTIVE',
    'paytabs.token': { $exists: true, $ne: null },
    // ✅ CRITICAL: Only charge if next_billing_date is today or in the past
    next_billing_date: { $lte: endOfToday }
  }).lean();

  const results = {
    total: dueSubs.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ subscriptionId: string; error: string }>
  };

  for (const subscription of dueSubs) {
    if (!subscription.paytabs?.token) {
      logger.warn('[Billing] Subscription missing PayTabs token, skipping', {
        subscriptionId: subscription._id
      });
      results.failed++;
      continue;
    }

    try {
      const response = await fetch(`${paytabsDomain}/payment/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${paytabsServerKey}`,
        },
        body: JSON.stringify({
          profile_id: paytabsProfileId,
          tran_type: 'sale',
          tran_class: 'recurring',
          cart_id: `REN-${Date.now()}-${subscription._id}`,
          cart_description: 'Monthly subscription renewal',
          cart_amount: subscription.amount,
          cart_currency: subscription.currency,
          token: subscription.paytabs.token,
        }),
      });

      const data = await response.json();

      if (data.tran_ref && data.payment_result?.response_status === 'A') {
        // ✅ Payment successful - update next billing date
        const nextBillingDate = parseDate(subscription.next_billing_date, () => new Date());
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await Subscription.findByIdAndUpdate(subscription._id, {
          next_billing_date: nextBillingDate,
          $push: {
            billing_history: {
              date: new Date(),
              amount: subscription.amount,
              currency: subscription.currency,
              tran_ref: data.tran_ref,
              status: 'SUCCESS'
            }
          }
        });

        results.success++;
        logger.info('[Billing] Successfully charged subscription', {
          subscriptionId: subscription._id,
          tranRef: data.tran_ref
        });
      } else {
        // ❌ Payment failed
        const errorMsg = data.payment_result?.response_message || 'Payment declined';
        
        await Subscription.findByIdAndUpdate(subscription._id, {
          status: 'PAST_DUE',
          $push: {
            billing_history: {
              date: new Date(),
              amount: subscription.amount,
              currency: subscription.currency,
              tran_ref: data.tran_ref,
              status: 'FAILED',
              error: errorMsg
            }
          }
        });

        results.failed++;
        results.errors.push({
          subscriptionId: String(subscription._id),
          error: errorMsg
        });
        logger.error('[Billing] Failed to charge subscription', {
          subscriptionId: subscription._id,
          error: errorMsg
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.failed++;
      results.errors.push({
        subscriptionId: String(subscription._id),
        error: errorMessage
      });
      logger.error('[Billing] Error charging subscription', {
        subscriptionId: subscription._id,
        error
      });
    }
  }

  logger.info('[Billing] Recurring billing completed', {
    success: results.success,
    failed: results.failed,
    total: results.total
  });
  return results;
}
