import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ReferralCodeModel } from '@/server/models/ReferralCode';
import { connectDb } from '@/lib/mongo';

/**
 * POST /api/referrals/generate
 * 
 * Generate a new referral code for the current user
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDb();
    
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
    
    // Build referral URL from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'BASE_URL not configured. Contact system administrator.' },
        { status: 500 }
      );
    }
    
    // Construct referral URL safely
    const shortUrl = new URL(`/ref/${code}`, baseUrl).toString();
    
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
