/**
 * Aqar Souq - Packages API
 * 
 * GET /api/aqar/packages - Get user's packages
 * POST /api/aqar/packages - Purchase package
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/mongo';
import { AqarPackage, AqarPayment, PackageType } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { ok, badRequest, serverError } from '@/lib/api/http';


import { logger } from '@/lib/logger';
import { getServerTranslation } from '@/lib/i18n/server';

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
    logger.error('Error fetching packages:', error);
    const t = await getServerTranslation(request);
    return NextResponse.json({ error: t('aqar.packages.errors.fetchFailed') }, { status: 500 });
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
      
      const packageType = body.type;
      
      if (!Object.values(PackageType).includes(packageType as PackageType)) {
        return badRequest('Invalid package type. Must be STARTER, STANDARD, or PREMIUM', { correlationId });
      }
      
      // Get pricing
      // eslint-disable-next-line no-unused-vars
      const pricing = (AqarPackage as never as { getPricing: (type: PackageType) => { price: number; listings: number; days: number } }).getPricing(packageType as PackageType);
      
      // Use atomic transaction for multi-document operation
      const session = await mongoose.startSession();
      let pkg: InstanceType<typeof AqarPackage> | undefined;
      let payment: InstanceType<typeof AqarPayment> | undefined;
      
      await session.withTransaction(async () => {
        // Create package
        pkg = new AqarPackage({
          userId: user.id,
          orgId: user.orgId || user.id,
          type: packageType,
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
          relatedId: pkg._id,
          relatedModel: 'AqarPackage',
          status: 'PENDING',
        });
        await payment.save({ session });
        
        // Link payment to package
        pkg.paymentId = payment._id as never;
        await pkg.save({ session });
      });
      
      session.endSession();
      
      if (!pkg || !payment) {
        throw new Error('Transaction failed to create package or payment');
      }
      
      // FUTURE: Integrate payment gateway (PayTabs/Stripe) for real payment processing.
      // Currently returns manual payment link. See /api/payments/paytabs for integration pattern.
      
      return ok(
        {
          package: pkg.toObject?.() ?? pkg,
          payment: payment.toObject?.() ?? payment,
          redirectUrl: `/aqar/payments/${payment._id}`,
        },
        { correlationId },
        201
      );
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error('PACKAGES_POST_ERROR', error, { correlationId });
      const t = await getServerTranslation(request);
      return serverError(t('common.errors.unexpected'), { correlationId });
    }
}
