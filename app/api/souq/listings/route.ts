/**
 * Souq Listings API - Seller offers management
 * @route /api/souq/listings
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { SouqListing } from '@/server/models/souq/Listing';
import { SouqProduct } from '@/server/models/souq/Product';
import { SouqSeller } from '@/server/models/souq/Seller';
import { connectDb } from '@/lib/mongodb-unified';
import { nanoid } from 'nanoid';
import { getServerSession } from '@/lib/auth/getServerSession';

const listingCreateSchema = z.object({
  productId: z.string(),
  fsin: z.string(),
  sellerId: z.string(),
  variationId: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0),
  fulfillmentMethod: z.enum(['fbf', 'fbm']),
  handlingTime: z.number().int().min(0).max(30),
  shippingOptions: z.array(
    z.object({
      method: z.enum(['standard', 'express', 'overnight']),
      carrier: z.string().optional(),
      price: z.number().min(0),
      estimatedDays: z.number().int().min(0),
    })
  ),
  freeShipping: z.boolean(),
  condition: z.enum(['new', 'refurbished', 'used-like-new', 'used-good', 'used-acceptable']),
  conditionNotes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!session.user.orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Organization context required' },
        { status: 403 }
      );
    }
    
    await connectDb();
    
    const body = await request.json();
    const validatedData = listingCreateSchema.parse(body);
    
    const [product, seller] = await Promise.all([
      SouqProduct.findOne({ _id: validatedData.productId, org_id: session.user.orgId }),
      SouqSeller.findOne({ _id: validatedData.sellerId, org_id: session.user.orgId }),
    ]);
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }
    
    // TODO(type-safety): Add canCreateListings method to Seller schema/model
    if (!(seller as any).canCreateListings()) {
      return NextResponse.json(
        { error: 'Seller account not eligible to create listings' },
        { status: 403 }
      );
    }
    
    const existingListing = await SouqListing.findOne({
      productId: validatedData.productId,
      sellerId: validatedData.sellerId,
      org_id: session.user.orgId,
    });
    
    if (existingListing) {
      return NextResponse.json(
        { error: 'Listing already exists for this product and seller' },
        { status: 400 }
      );
    }
    
    const listingId = `LST-${nanoid(10).toUpperCase()}`;
    
    const listing = await SouqListing.create({
      ...validatedData,
      listingId,
      org_id: session.user.orgId,
      availableQuantity: validatedData.stockQuantity,
      reservedQuantity: 0,
      status: 'active',
      buyBoxEligible: false,
      isPrime: validatedData.fulfillmentMethod === 'fbf',
      metrics: {
        orderCount: 0,
        cancelRate: 0,
        defectRate: 0,
        onTimeShipRate: 100,
        customerRating: 0,
        priceCompetitiveness: 50,
      },
    });
    
      // TODO(type-safety): Add checkBuyBoxEligibility method to Listing model
      await (listing as any).checkBuyBoxEligibility();
    await listing.save();
    
    return NextResponse.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }
    
    logger.error('Listing creation error:', error as Error);
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!session.user.orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Organization context required' },
        { status: 403 }
      );
    }
    
    await connectDb();
    
    const { searchParams } = new URL(request.url);
    const fsin = searchParams.get('fsin');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const condition = searchParams.get('condition');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const query: Record<string, unknown> = {
      org_id: session.user.orgId,
    };
    
    if (fsin) {
      query.fsin = fsin;
    }
    
    if (sellerId) {
      query.sellerId = sellerId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (condition) {
      query.condition = condition;
    }
    
    const skip = (page - 1) * limit;
    
    const [listings, total] = await Promise.all([
      SouqListing.find(query)
        .populate('sellerId', 'legalName tradeName accountHealth.status')
        .populate('productId', 'title images')
        .sort({ price: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqListing.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      data: listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Listing fetch error:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
