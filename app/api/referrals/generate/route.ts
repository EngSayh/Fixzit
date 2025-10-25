import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { ReferralCodeModel } from '@/server/models/ReferralCode';
import connectDB from '@/lib/db';

/**
 * POST /api/referrals/generate
 * 
 * Generate a new referral code for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    // Check if user already has an active referral code
    const existing = await ReferralCodeModel.findOne({
      referrerId: session.user.id,
      status: 'ACTIVE',
    });
    
    if (existing) {
      return NextResponse.json({ code: existing });
    }
    
    // Generate new code
    const code = await ReferralCodeModel.generateCode();
    const shortUrl = `https://fixzit.sa/ref/${code}`;
    
    // Create referral code
    const referralCode = await ReferralCodeModel.create({
      referrerId: session.user.id,
      referrerName: session.user.name,
      referrerEmail: session.user.email,
      code,
      shortUrl,
      reward: {
        type: 'CASH',
        referrerAmount: 100,
        referredAmount: 50,
        currency: 'SAR',
        description: 'Cash reward for successful referrals',
      },
      limits: {
        maxUses: null, // Unlimited
        maxUsesPerUser: 1,
        minPurchaseAmount: 0,
        validFrom: new Date(),
        validUntil: null, // No expiry
      },
      status: 'ACTIVE',
    });
    
    return NextResponse.json({ code: referralCode });
  } catch (error) {
    console.error('Failed to generate referral code:', error);
    return NextResponse.json(
      { error: 'Failed to generate referral code' },
      { status: 500 }
    );
  }
}
