/**
 * Aqar Souq - Packages API
 * 
 * GET /api/aqar/packages - Get user's packages
 * POST /api/aqar/packages - Purchase package
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/mongo';
import { AqarPackage, AqarPayment, PackageType } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { ok, badRequest, serverError } from '@/lib/api/http';


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
  const correlationId = crypto.randomUUID();
  
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
      
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return badRequest('Invalid JSON', { correlationId });
      }
      
      const { type } = body;
      
      if (!Object.values(PackageType).includes(type as PackageType)) {
        return badRequest('Invalid package type. Must be STARTER, STANDARD, or PREMIUM', { correlationId });
      }
      
      // Get pricing
      const pricing = (AqarPackage as never as { getPricing: (type: PackageType) => { price: number; listings: number; days: number } }).getPricing(type as PackageType);
      
      // Use atomic transaction for multi-document operation
      const session = await mongoose.startSession();
      let pkg: InstanceType<typeof AqarPackage> | undefined;
      let payment: InstanceType<typeof AqarPayment> | undefined;
      
      await session.withTransaction(async () => {
        // Create package
        pkg = new AqarPackage({
          userId: user.id,
          orgId: user.orgId || user.id,
          type,
          listingsAllowed: pricing.listings,
          validityDays: pricing.days,
          price: pricing.price,
        });
        await pkg.save({ session });
        
        // Create payment
        payment = new AqarPayment({
          userId: user.id,
          orgId: user.orgId || user.id,
          type: 'PACKAGE',
          amount: pricing.price,
          currency: 'SAR',
          relatedId: pkg.id,
          relatedModel: 'AqarPackage',
          status: 'PENDING',
        });
        await payment.save({ session });
        
        // Link payment to package
        pkg.paymentId = payment.id as never;
        await pkg.save({ session });
      });
      
      session.endSession();
      
      if (!pkg || !payment) {
        throw new Error('Transaction failed to create package or payment');
      }
      
      // TODO: Redirect to payment gateway
      
      return ok(
        {
          package: pkg.toObject?.() ?? pkg,
          payment: payment.toObject?.() ?? payment,
          redirectUrl: `/aqar/payments/${payment.id}`,
        },
        { correlationId },
        201
      );
    } catch (e: unknown) {
      console.error('PACKAGES_POST_ERROR', { correlationId, e: String((e as Error)?.message || e) });
      return serverError('Unexpected error', { correlationId });
    }
}
