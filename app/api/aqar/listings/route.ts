/**
 * Aqar Souq - Create Listing API
 * 
 * POST /api/aqar/listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarListing, AqarPackage, ListingStatus } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

// Helper function to build listing data object from request body and user
function buildListingData(body: Record<string, unknown>, user: { id: string; orgId?: string }) {
  const {
    intent,
    propertyType,
    title,
    description,
    address,
    city,
    neighborhood,
    geo,
    areaSqm,
    beds,
    baths,
    kitchens,
    ageYears,
    furnishing,
    amenities,
    streetWidthM,
    facing,
    media,
    price,
    rentFrequency,
    source,
    compliance,
    propertyRef,
  } = body;

  return {
    // Whitelisted client fields
    intent,
    propertyType,
    title,
    description,
    address,
    city,
    neighborhood,
    geo,
    areaSqm,
    beds,
    baths,
    kitchens,
    ageYears,
    furnishing,
    amenities: amenities || [],
    streetWidthM,
    facing,
    media: media || [],
    price,
    rentFrequency,
    source,
    compliance: compliance || {},
    propertyRef,
    // Server-controlled fields
    listerId: user.id,
    orgId: user.orgId || user.id,
    status: ListingStatus.DRAFT, // Always start as draft
  };
}

export const runtime = 'nodejs';

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
    
    const body = await request.json();
    
    // Validate required fields directly against request body before processing
    const requiredFields = ['intent', 'propertyType', 'title', 'description', 'city', 'price', 'areaSqm', 'geo', 'source'];
    const missingFields = requiredFields.filter((field) => {
      const v = body[field];
      if (v === null || v === undefined) return true;
      return typeof v === 'string' && v.trim().length === 0;
    });
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate price is positive
    if (typeof body.price !== 'number' || body.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }
    
    // Build sanitized listing data using the helper (single source of truth for allowed fields)
    const listingData = buildListingData(body, user);
    
    // Check if user has active package (for agents/developers)
    if (listingData.source === 'AGENT' || listingData.source === 'DEVELOPER') {
      // Use MongoDB transaction to atomically check package and create listing
      // This ensures that if listing creation fails, credits are not consumed
      const session = await AqarPackage.startSession();
      let createdListing;
      
      try {
        createdListing = await session.withTransaction(async () => {
          // 1. Find and lock active package atomically (within transaction)
          const activePackage = await AqarPackage.findOne({
            userId: user.id,
            active: true,
            expiresAt: { $gt: new Date() },
            $expr: { $lt: ['$listingsUsed', '$listingsAllowed'] },
          }, null, { session });
          
          if (!activePackage) {
            throw new Error('NO_ACTIVE_PACKAGE');
          }
          
          // 2. Consume package listing atomically
          await activePackage.consumeListing();
          
          // 3. Create listing with whitelisted fields from helper
          const listing = new AqarListing(listingData);
          await listing.save({ session });
          
          // Return listing from within transaction to prevent race condition
          return listing;
        });
        
        return NextResponse.json({ listing: createdListing }, { status: 201 });
      } catch (txError) {
        if (txError instanceof Error && txError.message === 'NO_ACTIVE_PACKAGE') {
          return NextResponse.json(
            { error: 'No active listing package. Please purchase a package first.' },
            { status: 402 }
          );
        }
        throw txError; // Re-throw to be caught by outer catch block
      } finally {
        // Always end session to prevent memory leaks
        await session.endSession();
      }
    }
    
    // For non-package sources (OWNER, etc.), create listing directly
    // Basic validation on whitelisted fields already covered by sanitized required check
    
    // Create listing with whitelisted fields from helper
    const listing = new AqarListing(listingData);
    
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
