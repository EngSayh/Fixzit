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
      
      // Redirect to payment gateway (Tap Payments for Saudi market)
      let paymentGatewayUrl = `/aqar/payments/${payment._id}`;
      
      if (process.env.TAP_PAYMENTS_API_KEY && process.env.TAP_PAYMENTS_MERCHANT_ID) {
        try {
          // Create Tap Payments checkout session
          const tapResponse = await fetch('https://api.tap.company/v2/charges', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.TAP_PAYMENTS_API_KEY}`
            },
            body: JSON.stringify({
              amount: payment.amount,
              currency: 'SAR',
              customer: {
                email: payment.buyerEmail,
                phone: { country_code: '966', number: payment.buyerPhone?.replace(/^\+966/, '') || '' }
              },
              source: { id: 'src_all' },
              redirect: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/aqar/payments/${payment._id}/callback`
              },
              reference: {
                transaction: payment._id?.toString(),
                order: pkg._id?.toString()
              },
              metadata: {
                packageId: pkg._id?.toString(),
                paymentId: payment._id?.toString()
              }
            })
          });
          
          if (tapResponse.ok) {
            const tapData = await tapResponse.json();
            paymentGatewayUrl = tapData.transaction?.url || paymentGatewayUrl;
          }
        } catch (gatewayError) {
          logger.error('Payment gateway redirect failed', gatewayError as Error, { paymentId: payment._id });
          // Fallback to local payment page if gateway fails
        }
      }
      
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
      return serverError('Unexpected error', { correlationId });
    }
}

// en.ts localization file
export const messages = {
  aqar: {
    packages: {
      errors: {
        fetchFailed: 'Failed to fetch packages',
      },
    },
  },
  common: {
    errors: {
      unexpected: 'Unexpected error',
    },
  },
};