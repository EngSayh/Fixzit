/**
 * Aqar Souq - Single Listing API
 * 
 * GET /api/aqar/listings/[id] - Get listing details
 * PATCH /api/aqar/listings/[id] - Update listing
 * DELETE /api/aqar/listings/[id] - Delete listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarListing, AqarFavorite, AqarLead, ListingStatus, FurnishingStatus } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

import mongoose from 'mongoose';

export const runtime = 'nodejs';

// GET /api/aqar/listings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
    }
    
    const listing = await AqarListing.findById(id).lean();
    
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    // Increment view count (async, don't await) - attach error logging with stack trace
    AqarListing.findByIdAndUpdate(
      id, 
      { 
        $inc: { 'analytics.views': 1 }, 
        $set: { 'analytics.lastViewedAt': new Date() } 
      }
    ).exec().catch((err) => {
      console.error('Failed to increment listing views analytics', { 
        listingId: id, 
        error: { 
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        } 
      });
    });
    
    return NextResponse.json({ listing });
  } catch (error) {
    // Sanitized error logging - no PII, no full error object
    console.error('Error fetching listing:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
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
    
    // Check ownership (both user and tenant isolation)
    if (listing.listerId.toString() !== user.id || (user.orgId && listing.orgId?.toString() !== user.orgId)) {
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
        
        // Validate enum fields
        if (field === 'furnishing' && !Object.values(FurnishingStatus).includes(value as FurnishingStatus)) {
          return NextResponse.json({ error: `Invalid furnishing: ${value}` }, { status: 400 });
        }
        if (field === 'status' && !Object.values(ListingStatus).includes(value as ListingStatus)) {
          return NextResponse.json({ error: `Invalid status: ${value}. Must be one of: ${Object.values(ListingStatus).join(', ')}` }, { status: 400 });
        }
        
        // Validate status transitions (prevent invalid state changes)
        if (field === 'status') {
          const currentStatus = listing.status;
          const newStatus = value as ListingStatus;
          
          // Define valid status transitions
          const validTransitions: Record<ListingStatus, ListingStatus[]> = {
            [ListingStatus.DRAFT]: [ListingStatus.PENDING, ListingStatus.ACTIVE, ListingStatus.INACTIVE],
            [ListingStatus.PENDING]: [ListingStatus.ACTIVE, ListingStatus.REJECTED, ListingStatus.INACTIVE],
            [ListingStatus.ACTIVE]: [ListingStatus.INACTIVE, ListingStatus.SOLD, ListingStatus.RENTED],
            [ListingStatus.INACTIVE]: [ListingStatus.ACTIVE, ListingStatus.DRAFT],
            [ListingStatus.REJECTED]: [ListingStatus.DRAFT],
            [ListingStatus.SOLD]: [ListingStatus.ACTIVE], // Allow reactivation if sale falls through
            [ListingStatus.RENTED]: [ListingStatus.ACTIVE], // Allow reactivation if tenant leaves
          };
          
          const allowedTransitions = validTransitions[currentStatus] || [];
          if (!allowedTransitions.includes(newStatus) && currentStatus !== newStatus) {
            return NextResponse.json({ 
              error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}` 
            }, { status: 400 });
          }
        }
        
        // Validate numeric fields
        if (field === 'price' || field === 'areaSqm') {
          if (typeof value !== 'number' || value <= 0) {
            return NextResponse.json({ error: `${field} must be a positive number` }, { status: 400 });
          }
        }
        if (field === 'beds' || field === 'baths' || field === 'kitchens') {
          if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
            return NextResponse.json({ error: `${field} must be a non-negative integer` }, { status: 400 });
          }
        }
        if (field === 'ageYears') {
          if (typeof value !== 'number' || value < 0) {
            return NextResponse.json({ error: 'ageYears must be non-negative' }, { status: 400 });
          }
        }
        
        // Validate string fields are non-empty
        if ((field === 'title' || field === 'description') && (typeof value !== 'string' || value.trim().length === 0)) {
          return NextResponse.json({ error: `${field} must be a non-empty string` }, { status: 400 });
        }
        
        // Validate complex fields
        if (field === 'amenities') {
          if (!Array.isArray(value)) {
            return NextResponse.json({ error: 'amenities must be an array' }, { status: 400 });
          }
          if (value.some((item: unknown) => typeof item !== 'string' || item.trim().length === 0)) {
            return NextResponse.json({ error: 'amenities must be an array of non-empty strings' }, { status: 400 });
          }
        }
        
        if (field === 'media') {
          if (!Array.isArray(value)) {
            return NextResponse.json({ error: 'media must be an array' }, { status: 400 });
          }
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (typeof item !== 'object' || item === null) {
              return NextResponse.json({ error: `media[${i}] must be an object` }, { status: 400 });
            }
            if (typeof item.url !== 'string' || item.url.trim().length === 0) {
              return NextResponse.json({ error: `media[${i}].url must be a non-empty string` }, { status: 400 });
            }
            if (!['IMAGE', 'VIDEO', 'VR'].includes(item.kind)) {
              return NextResponse.json({ error: `media[${i}].kind must be IMAGE, VIDEO, or VR` }, { status: 400 });
            }
            if (typeof item.order !== 'number' || !Number.isInteger(item.order) || item.order < 0) {
              return NextResponse.json({ error: `media[${i}].order must be a non-negative integer` }, { status: 400 });
            }
          }
        }
        
        if (field === 'address') {
          // Listing model uses a flat string address field. Validate accordingly.
          if (typeof value !== 'string' || value.trim().length === 0) {
            return NextResponse.json({ error: 'address must be a non-empty string' }, { status: 400 });
          }
        }
        
        (listing as unknown as Record<string, unknown>)[field] = value;
      }
    }
    
    await listing.save();
    
    return NextResponse.json({ listing });
  } catch (error) {
    // Sanitized error logging - no PII, no full error object
    console.error('Error updating listing:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    });
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
    
    // Check ownership (both user and tenant isolation)
    if (listing.listerId.toString() !== user.id || (user.orgId && listing.orgId?.toString() !== user.orgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Cascade delete related data
    await Promise.all([
      listing.deleteOne(),
      // Delete all favorites referencing this listing
      AqarFavorite.deleteMany({ targetId: id, targetType: 'LISTING' }),
      // Delete all leads referencing this listing
      AqarLead.deleteMany({ listingId: id }),
    ]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Sanitized error logging - no PII, no full error object
    console.error('Error deleting listing:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
