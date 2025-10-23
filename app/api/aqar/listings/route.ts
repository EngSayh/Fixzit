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
    
    const user = await getSessionUser(request);
    
    const body = await request.json();
    
    // Whitelist allowed client fields (prevent injection of system-controlled fields)
    const {
      // Core details
      intent,
      propertyType,
      title,
      description,
      // Location
      address,
      city,
      neighborhood,
      geo,
      // Specifications
      areaSqm,
      beds,
      baths,
      kitchens,
      ageYears,
      furnishing,
      amenities,
      streetWidthM,
      facing,
      // Media
      media,
      // Pricing
      price,
      rentFrequency,
      // Source
      source,
      // Compliance (optional)
      compliance,
      // Property reference (optional)
      propertyRef,
    } = body;

    // Build sanitized body object and run required field check once
    const sanitizedBody: Record<string, unknown> = {
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
    };

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

    const missingFields = requiredFields.filter((field) => !sanitizedBody[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate price is positive
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }
    
    // Validate rentPrice if provided
    if (rentFrequency !== undefined && rentFrequency !== null) {
      if (typeof price !== 'number' || price <= 0) {
        return NextResponse.json(
          { error: 'Rent price must be a positive number when rentFrequency is specified' },
          { status: 400 }
        );
      }
    }
    
    // Check if user has active package (for agents/developers)
    if (body.source === 'AGENT' || body.source === 'DEVELOPER') {
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
          
          // 2. Consume package listing atomically (with session)
          await activePackage.consumeListing(session);
          
          // 3. Create listing with whitelisted fields only
          const listing = new AqarListing(buildListingData(sanitizedBody, user));
          await listing.save({ session });
          
          // Return listing from within transaction to prevent race condition
          return listing;
        });
        
        // Session already ended by withTransaction, no need to call endSession
        
        return NextResponse.json({ listing: createdListing }, { status: 201 });
      } catch (txError) {
        // Transaction auto-aborted by withTransaction, just end the session
        await session.endSession();
        
        if (txError instanceof Error && txError.message === 'NO_ACTIVE_PACKAGE') {
          return NextResponse.json(
            { error: 'No active listing package. Please purchase a package first.' },
            { status: 402 }
          );
        }
        throw txError; // Re-throw to be caught by outer catch block
      }
    }
    
    // For non-package sources (OWNER, etc.), create listing directly
    // Basic validation on whitelisted fields already covered by sanitized required check
    
    // Create listing with whitelisted fields only
    const listing = new AqarListing(buildListingData(sanitizedBody, user));
    
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
