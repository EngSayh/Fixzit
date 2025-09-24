import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Subscription from '@/src/models/Subscription';
import SubscriptionInvoice from '@/src/models/SubscriptionInvoice';

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    await dbConnect();
    
    // Find the customer's subscription
    const subscription = await Subscription.findOne({
      customerId: params.customerId
    });

    if (!subscription) {
      return NextResponse.json([]);
    }

    // Get invoices for this subscription
    const invoices = await SubscriptionInvoice.find({
      subscriptionId: subscription._id
    }).sort({ createdAt: -1 }).limit(12); // Last 12 invoices

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Failed to load invoices:', error);
    return NextResponse.json(
      { error: 'Failed to load invoices' },
      { status: 500 }
    );
  }
}