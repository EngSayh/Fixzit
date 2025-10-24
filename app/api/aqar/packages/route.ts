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


export const runtime = 'nodejs';

// GET /api/aqar/packages
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      console.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
    // Generate correlation ID for tracking
    const correlationId = `pkg_get_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Sanitized error logging - no PII, no sensitive data
    console.error('Error fetching packages', {
      correlationId,
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
    });
    
    return NextResponse.json({ error: 'Failed to fetch packages', correlationId }, { status: 500 });
  }
}

// POST /api/aqar/packages
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      console.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse JSON with error handling
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (_parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    const { type } = body; // STARTER|STANDARD|PREMIUM
    
    if (!Object.values(PackageType).includes(type as PackageType)) {
      return NextResponse.json(
        { error: 'Invalid package type. Must be STARTER, STANDARD, or PREMIUM' },
        { status: 400 }
      );
    }
    
    // Get pricing (model is now properly typed)
    const pricing = AqarPackage.getPricing(type as PackageType);
    
    // Use Mongoose transaction for atomicity
    // If payment creation fails, package creation is rolled back
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create package
      const pkg = new AqarPackage({
        userId: user.id,
        orgId: user.orgId || user.id,
        type,
        listingsAllowed: pricing.listings,
        validityDays: pricing.days,
        price: pricing.price,
      });
      
      await pkg.save({ session });
      
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
      
      await payment.save({ session });
      
      // Update package with payment ID (with runtime validation)
      if (!payment._id || !(payment._id instanceof mongoose.Types.ObjectId)) {
        throw new Error('Invalid payment ID after save');
      }
      pkg.paymentId = payment._id as mongoose.Types.ObjectId;
      await pkg.save({ session });
      
      // Commit transaction - both package and payment succeed together
      await session.commitTransaction();
      
      // TODO: Redirect to payment gateway
      
      return NextResponse.json(
        {
          package: pkg,
          payment,
          redirectUrl: `/aqar/payments/${payment._id}`,
        },
        { status: 201 }
      );
    } catch (transactionError) {
      // Rollback on any error
      await session.abortTransaction();
      throw transactionError; // Re-throw to outer catch
    } finally {
      session.endSession();
    }
  } catch (error) {
    // Sanitized error logging - correlation ID, no PII
    const errorId = `pkg_purchase_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.error('Error purchasing package', {
      errorId,
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
      // DO NOT log: userId, payment details, connection strings, stack traces
    });
    return NextResponse.json({ error: 'Failed to purchase package', errorId }, { status: 500 });
  }
}
