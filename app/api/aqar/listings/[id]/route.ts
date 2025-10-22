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
    
    // Increment view count (async, don't await - fire and forget with error logging)
    AqarListing.findByIdAndUpdate(
      id, 
      { 
        $inc: { 'analytics.views': 1 }, 
        $set: { 'analytics.lastViewedAt': new Date() } 
      }
    ).exec().catch((err: Error) => {
      console.error('Failed to update listing analytics:', err);
    });
    
    return NextResponse.json({ listing });
  } catch (error) {
    console.error('Error fetching listing:', error);
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
        
        // Validate enum fields - aligned with models/aqar/Listing.ts enums
        if (field === 'furnishing' && !['FURNISHED', 'UNFURNISHED', 'PARTLY'].includes(value)) {
          return NextResponse.json({ error: `Invalid furnishing: ${value}` }, { status: 400 });
        }
        if (field === 'status' && !['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'SOLD', 'RENTED', 'REJECTED'].includes(value)) {
          return NextResponse.json({ error: `Invalid status: ${value}` }, { status: 400 });
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
