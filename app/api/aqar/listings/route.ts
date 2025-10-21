/**
 * Aqar Souq - Create Listing API
 * 
 * POST /api/aqar/listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarListing, AqarPackage } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'intent',
      'propertyType',
      'title',
      'description',
      'city',
      'price',
      'areaSqm',
      'geo',
      'source',
    ];
    
    const missingFields = requiredFields.filter((field) => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check if user has active package (for agents/developers)
    if (body.source === 'AGENT' || body.source === 'DEVELOPER') {
      const activePackage = await AqarPackage.findOne({
        userId: user.id,
        active: true,
        expiresAt: { $gt: new Date() },
        $expr: { $lt: ['$listingsUsed', '$listingsAllowed'] },
      });
      
      if (!activePackage) {
        return NextResponse.json(
          { error: 'No active listing package. Please purchase a package first.' },
          { status: 402 }
        );
      }
      
      // Consume package listing
      await (activePackage as unknown as { consumeListing: () => Promise<void> }).consumeListing();
    }
    
    // Create listing
    const listing = new AqarListing({
      ...body,
      listerId: user.id,
      orgId: user.orgId || user.id, // Fallback to user ID
      status: 'DRAFT', // Start as draft
    });
    
    await listing.save();
    
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    // Generate unique error ID for correlation (no PII)
    const errorId = `listing_create_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Structured, privacy-preserving error logging
    console.error('Error creating listing', {
      errorId,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      hasPackageIssue: error instanceof Error && error.message.includes('Package'),
      hasBrokerIssue: error instanceof Error && error.message.includes('Broker ads require'),
      timestamp: new Date().toISOString(),
      // DO NOT log: userId, email, phone, address, coordinates, or any PII
    });
    
    if (error instanceof Error && error.message.includes('Package')) {
      return NextResponse.json({ error: error.message, errorId }, { status: 402 });
    }
    
    if (error instanceof Error && error.message.includes('Broker ads require')) {
      return NextResponse.json({ error: error.message, errorId }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create listing', 
      errorId // Include errorId for support team correlation
    }, { status: 500 });
  }
}
