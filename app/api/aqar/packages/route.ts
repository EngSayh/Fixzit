/**
 * Aqar Souq - Packages API
 * 
 * GET /api/aqar/packages - Get user's packages
 * POST /api/aqar/packages - Purchase package
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarPackage, AqarPayment, PackageType } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';


export const runtime = 'nodejs';

// GET /api/aqar/packages
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    
    const query: Record<string, unknown> = {
      userId: user.id,
    };
    
    if (activeOnly) {
      query.active = true;
      query.expiresAt = { $gt: new Date() };
    }
    
    const packages = await AqarPackage.find(query).sort({ createdAt: -1 }).lean();
    
    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

// POST /api/aqar/packages
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const body = await request.json();
    const { type } = body; // STARTER|STANDARD|PREMIUM
    
    if (!Object.values(PackageType).includes(type as PackageType)) {
      return NextResponse.json(
        { error: 'Invalid package type. Must be STARTER, STANDARD, or PREMIUM' },
        { status: 400 }
      );
    }
    
    // Get pricing - AqarPackage now properly typed with getPricing static method
    const pricing = AqarPackage.getPricing(type as PackageType);
    
    // Create package
    const pkg = new AqarPackage({
      userId: user.id,
      orgId: user.orgId || user.id,
      type,
      listingsAllowed: pricing.listings,
      validityDays: pricing.days,
      price: pricing.price,
    });
    
    await pkg.save();
    
    // Create payment
    const payment = new AqarPayment({
      userId: user.id,
      orgId: user.orgId || user.id,
      type: 'PACKAGE',
      amount: pricing.price,
      currency: 'SAR',
      relatedId: pkg._id,
      relatedModel: 'AqarPackage',
      status: 'PENDING',
    });
    
    await payment.save();
    
    pkg.paymentId = payment._id as never;
    await pkg.save();
    
    // TODO: Redirect to payment gateway
    
    return NextResponse.json(
      {
        package: pkg,
        payment,
        redirectUrl: `/aqar/payments/${payment._id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error purchasing package:', error);
    return NextResponse.json({ error: 'Failed to purchase package' }, { status: 500 });
  }
}
