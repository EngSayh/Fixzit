import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import { AqarListing } from '@/src/server/models/AqarListing';
import { AqarLead } from '@/src/server/models/AqarLead';
import { z } from 'zod';
import { Types } from 'mongoose';

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
  message: z.string().optional(),
  budget: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('SAR')
  }).optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    
    // Find listing by ID or slug
    const isObjectId = Types.ObjectId.isValid(params.id);
    const query = isObjectId 
      ? { _id: params.id, tenantId, status: 'active' }
      : { slug: params.id, tenantId, status: 'active' };
    
    const listing = await AqarListing.findOne(query)
      .populate('propertyId', 'name address type details')
      .lean();
    
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    await AqarListing.findByIdAndUpdate(listing._id, {
      $inc: { views: 1 }
    });
    
    // Get similar listings
    const similarListings = await AqarListing.find({
      tenantId,
      status: 'active',
      _id: { $ne: listing._id },
      $or: [
        { 'location.city': listing.location.city },
        { propertyType: listing.propertyType },
        { purpose: listing.purpose }
      ]
    })
    .populate('propertyId', 'name address type')
    .limit(6)
    .lean();
    
    return NextResponse.json({
      success: true,
      data: {
        listing,
        similarListings
      }
    });
    
  } catch (error) {
    console.error('Error fetching Aqar listing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch listing' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const validatedData = leadSchema.parse(body);
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    
    // Find listing
    const isObjectId = Types.ObjectId.isValid(params.id);
    const query = isObjectId 
      ? { _id: params.id, tenantId, status: 'active' }
      : { slug: params.id, tenantId, status: 'active' };
    
    const listing = await AqarListing.findOne(query);
    
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    // Create lead
    const lead = new AqarLead({
      tenantId,
      listingId: listing._id,
      propertyId: listing.propertyId,
      ...validatedData,
      createdBy: userId
    });
    
    await lead.save();
    
    // Increment inquiry count
    await AqarListing.findByIdAndUpdate(listing._id, {
      $inc: { inquiries: 1 }
    });
    
    return NextResponse.json({
      success: true,
      data: lead
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating Aqar lead:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}