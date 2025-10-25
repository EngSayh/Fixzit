import { NextRequest, NextResponse } from 'next/server';
import getServerSession from 'next-auth';
import { authOptions } from '@/auth';
import { ReferralCodeModel } from '@/server/models/ReferralCode';
import { connectDb } from '@/lib/mongo';

/**
 * GET /api/referrals/my-code
 * 
 * Get current user's referral code and statistics
 */
export async function GET(request: NextRequest) {
  try {
  const session = (await getServerSession(authOptions)) as any;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
  await connectDb();
    
    // Find user's referral code
    const referralCode = await ReferralCodeModel.findOne({
      referrerId: session.user.id,
      status: 'ACTIVE',
    });
    
    if (!referralCode) {
      return NextResponse.json({ code: null, referrals: [] });
    }
    
    return NextResponse.json({
      code: referralCode,
      referrals: referralCode.referrals,
    });
  } catch (error) {
    console.error('Failed to fetch referral code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral code' },
      { status: 500 }
    );
  }
}
