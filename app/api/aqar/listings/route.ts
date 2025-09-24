import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import { AqarListing } from '@/src/server/models/AqarListing';
import { Property } from '@/src/server/models/Property';
import { z } from 'zod';

const searchSchema = z.object({
  purpose: z.enum(['sale', 'rent', 'daily']).optional(),
  propertyType: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minArea: z.coerce.number().optional(),
  maxArea: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  furnished: z.enum(['true', 'false']).optional(),
  features: z.string().optional(),
  keywords: z.string().optional(),
  sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'area_asc', 'area_desc']).default('newest'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(24),
  bbox: z.string().optional() // "minLng,minLat,maxLng,maxLat"
});

const createSchema = z.object({
  propertyId: z.string(),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  purpose: z.enum(['sale', 'rent', 'daily']),
  propertyType: z.string(),
  price: z.object({
    amount: z.number().min(0),
    currency: z.string().default('SAR'),
    period: z.enum(['total', 'monthly', 'yearly', 'daily']).default('total')
  }),
  specifications: z.object({
    area: z.number().min(1),
    bedrooms: z.number().min(0).optional(),
    bathrooms: z.number().min(0).optional(),
    livingRooms: z.number().min(0).optional(),
    floors: z.number().min(1).optional(),
    age: z.string().optional(),
    furnished: z.boolean().default(false),
    parking: z.number().min(0).optional(),
    balcony: z.boolean().default(false),
    garden: z.boolean().default(false),
    pool: z.boolean().default(false),
    gym: z.boolean().default(false),
    security: z.boolean().default(false),
    elevator: z.boolean().default(false),
    maidRoom: z.boolean().default(false)
  }),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    city: z.string(),
    district: z.string(),
    neighborhood: z.string().optional(),
    postalCode: z.string().optional()
  }),
  media: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    type: z.enum(['image', 'video']).default('image'),
    isCover: z.boolean().default(false)
  })).optional(),
  contact: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    whatsapp: z.string().optional(),
    email: z.string().email().optional(),
    company: z.string().optional(),
    licenseNumber: z.string().optional()
  }),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());
    const validatedParams = searchSchema.parse(params);
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    
    // Build query
    const query: any = {
      tenantId,
      status: 'active'
    };
    
    if (validatedParams.purpose) {
      query.purpose = validatedParams.purpose;
    }
    
    if (validatedParams.propertyType) {
      query.propertyType = validatedParams.propertyType;
    }
    
    if (validatedParams.city) {
      query['location.city'] = new RegExp(validizedParams.city, 'i');
    }
    
    if (validatedParams.district) {
      query['location.district'] = new RegExp(validizedParams.district, 'i');
    }
    
    if (validatedParams.minPrice || validatedParams.maxPrice) {
      query['price.amount'] = {};
      if (validizedParams.minPrice) {
        query['price.amount'].$gte = validatedParams.minPrice;
      }
      if (validizedParams.maxPrice) {
        query['price.amount'].$lte = validatedParams.maxPrice;
      }
    }
    
    if (validizedParams.minArea || validatedParams.maxArea) {
      query['specifications.area'] = {};
      if (validizedParams.minArea) {
        query['specifications.area'].$gte = validatedParams.minArea;
      }
      if (validizedParams.maxArea) {
        query['specifications.area'].$lte = validatedParams.maxArea;
      }
    }
    
    if (validatedParams.bedrooms) {
      query['specifications.bedrooms'] = { $gte: validatedParams.bedrooms };
    }
    
    if (validatedParams.bathrooms) {
      query['specifications.bathrooms'] = { $gte: validatedParams.bathrooms };
    }
    
    if (validatedParams.furnished !== undefined) {
      query['specifications.furnished'] = validatedParams.furnished === 'true';
    }
    
    if (validatedParams.features) {
      const features = validatedParams.features.split(',').map(f => f.trim());
      query['specifications'] = { ...query['specifications'] };
      features.forEach(feature => {
        query['specifications'][feature] = true;
      });
    }
    
    if (validizedParams.keywords) {
      query.$text = { $search: validatedParams.keywords };
    }
    
    // Bounding box filter
    if (validizedParams.bbox) {
      const [minLng, minLat, maxLng, maxLat] = validatedParams.bbox.split(',').map(Number);
      query['location.lat'] = { $gte: minLat, $lte: maxLat };
      query['location.lng'] = { $gte: minLng, $lte: maxLng };
    }
    
    // Build sort
    let sort: any = {};
    switch (validatedParams.sortBy) {
      case 'price_asc':
        sort = { 'price.amount': 1 };
        break;
      case 'price_desc':
        sort = { 'price.amount': -1 };
        break;
      case 'area_asc':
        sort = { 'specifications.area': 1 };
        break;
      case 'area_desc':
        sort = { 'specifications.area': -1 };
        break;
      default:
        sort = { publishedAt: -1, createdAt: -1 };
    }
    
    // Execute query
    const skip = (validatedParams.page - 1) * validatedParams.limit;
    
    const [listings, total] = await Promise.all([
      AqarListing.find(query)
        .populate('propertyId', 'name address type')
        .sort(sort)
        .skip(skip)
        .limit(validatedParams.limit)
        .lean(),
      AqarListing.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        listings,
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total,
          pages: Math.ceil(total / validatedParams.limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching Aqar listings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const validatedData = createSchema.parse(body);
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    
    // Verify property exists and belongs to tenant
    const property = await Property.findOne({
      _id: validatedData.propertyId,
      tenantId
    });
    
    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }
    
    // Create listing
    const listing = new AqarListing({
      ...validatedData,
      tenantId,
      createdBy: userId,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });
    
    await listing.save();
    
    return NextResponse.json({
      success: true,
      data: listing
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating Aqar listing:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}