import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Subscription from '@/src/models/Subscription';
import SubscriptionInvoice from '@/src/models/SubscriptionInvoice';
import PaymentMethod from '@/src/models/PaymentMethod';
import { createRecurringPayment } from '@/src/lib/paytabs';

// POST with secret header from cron – for each sub due this day: charge recurring via token
export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'UNAUTH' }, { status: 401 });
  }
  
  try {
    await dbConnect();
    const today = new Date();
    const dueSubs = await Subscription.find({ 
      billingCycle: 'monthly', 
      status: 'active', 
      nextInvoiceAt: { $lte: today }, 
      paytabsTokenId: { $ne: null } 
    });

    let successCount = 0;
    let failCount = 0;

    for (const subscription of dueSubs) {
      try {
        const paymentMethod = await PaymentMethod.findById(subscription.paytabsTokenId);
        if (!paymentMethod) {
          console.error(`Payment method not found for subscription ${subscription._id}`);
          failCount++;
          continue;
        }

        // Create invoice
        const invoice = await SubscriptionInvoice.create({
          subscriptionId: subscription._id,
          amount: subscription.totalMonthly,
          currency: subscription.currency,
          periodStart: today,
          periodEnd: new Date(new Date().setMonth(today.getMonth() + 1)),
          dueDate: today,
          status: 'pending'
        });

        // Process recurring payment
        const response = await createRecurringPayment(
          paymentMethod.token,
          subscription.totalMonthly,
          subscription.currency,
          `Fixzit Monthly ${subscription.planType}`
        );

        if (response?.tran_ref) {
          invoice.status = 'paid';
          invoice.paytabsTranRef = response.tran_ref;
          await invoice.save();
          
          // Update next invoice date
          subscription.nextInvoiceAt = new Date(new Date().setMonth(today.getMonth() + 1));
          await subscription.save();
          
          successCount++;
          console.log(`Successfully charged subscription ${subscription._id}`);
        } else {
          invoice.status = 'failed';
          invoice.errorMessage = response?.message || 'Payment failed';
          await invoice.save();
          
          // Mark subscription as past due after 3 failed attempts
          subscription.status = 'past_due';
          await subscription.save();
          
          failCount++;
          console.error(`Failed to charge subscription ${subscription._id}:`, response);
        }
      } catch (error) {
        console.error(`Error processing subscription ${subscription._id}:`, error);
        failCount++;
      }
    }

    return NextResponse.json({ 
      ok: true, 
      total: dueSubs.length,
      success: successCount,
      failed: failCount
    });
  } catch (error) {
    console.error('Recurring billing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
