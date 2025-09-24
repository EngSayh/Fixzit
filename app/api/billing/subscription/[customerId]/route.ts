import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Subscription from '@/src/models/Subscription';

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    await dbConnect();
    
    const subscription = await Subscription.findOne({
      customerId: params.customerId,
      status: { $in: ['active', 'trial', 'past_due'] }
    }).populate('customerId');

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Failed to load subscription:', error);
    return NextResponse.json(
      { error: 'Failed to load subscription' },
      { status: 500 }
    );
  }
}