/**
 * Aqar Souq - Single Listing API
 * 
 * GET /api/aqar/listings/[id] - Get listing details
 * PATCH /api/aqar/listings/[id] - Update listing
 * DELETE /api/aqar/listings/[id] - Delete listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarListing } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { FurnishingStatus, ListingStatus } from '@/models/aqar/Listing';
import { withCorrelation, ok, badRequest, notFound } from '@/lib/api/http';
import {
  isValidObjectIdSafe,
  validatePositiveNumber,
  validateNonNegativeInteger,
  validateNonNegativeNumber,
  validateNonEmptyString,
} from '@/lib/api/validation';

import mongoose from 'mongoose';

export const runtime = 'nodejs';

// GET /api/aqar/listings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCorrelation(async (correlationId) => {
    try {
      await connectDb();
      
      const { id } = await params;
      
      if (!isValidObjectIdSafe(id)) {
        return badRequest('Invalid listing ID', { correlationId });
      }
      
      const listing = await AqarListing.findById(id)
        .select('_id title price areaSqm city status media amenities geo analytics')
        .lean();
      
      if (!listing) {
        return notFound('Listing not found', { correlationId });
      }
      
      // Best-effort analytics increment with error capture (no await to avoid blocking response)
      AqarListing.findByIdAndUpdate(
        id, 
        { 
          $inc: { 'analytics.views': 1 }, 
          $set: { 'analytics.lastViewedAt': new Date() } 
        }
      ).exec().catch((err: Error) => {
        console.warn('VIEW_INC_FAILED', { correlationId, id, err: String(err?.message || err) });
      });
      
      return ok({ listing }, { correlationId });
    } catch (error) {
      console.error('Error fetching listing:', error);
      return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
    }
  });
}

// PATCH /api/aqar/listings/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
    }
    
    const listing = await AqarListing.findById(id);
    
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    // Check ownership
    if (listing.listerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    
    // Update allowed fields
    const allowedFields = [
      'title',
      'description',
      'price',
      'areaSqm',
      'beds',
      'baths',
      'kitchens',
      'ageYears',
      'furnishing',
      'amenities',
      'media',
      'address',
      'neighborhood',
      'status',
    ] as const;
    
    // Validate and assign fields with type/enum checks
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const value = body[field];
        
        // Validate enum fields using actual schema enums
        if (field === 'furnishing' && !Object.values(FurnishingStatus).includes(value)) {
          return NextResponse.json({ error: `Invalid furnishing: ${value}` }, { status: 400 });
        }
        if (field === 'status' && !Object.values(ListingStatus).includes(value)) {
          return NextResponse.json({ error: `Invalid status: ${value}` }, { status: 400 });
        }
        
        // Validate numeric fields using shared helpers
        if (field === 'price' || field === 'areaSqm') {
          const result = validatePositiveNumber(value, field);
          if (!result.valid) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
        }
        if (field === 'beds' || field === 'baths' || field === 'kitchens') {
          const result = validateNonNegativeInteger(value, field);
          if (!result.valid) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
        }
        if (field === 'ageYears') {
          const result = validateNonNegativeNumber(value, field);
          if (!result.valid) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
        }
        
        // Validate string fields are non-empty
        if (field === 'title' || field === 'description') {
          const result = validateNonEmptyString(value, field);
          if (!result.valid) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
        }
        
        (listing as unknown as Record<string, unknown>)[field] = value;
      }
    }
    
    await listing.save();
    
    return NextResponse.json({ listing });
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

// DELETE /api/aqar/listings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
    }
    
    const listing = await AqarListing.findById(id);
    
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    // Check ownership
    if (listing.listerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await listing.deleteOne();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
