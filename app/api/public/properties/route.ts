// Public API for property browsing (no authentication required)
// Implements Aqar-style guest browsing

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guestBrowsingService } from '@/src/lib/guest-browsing';

const PropertyQuerySchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  type: z.enum(['sale', 'rent', 'commercial']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  features: z.string().optional().transform(val => val ? val.split(',') : []),
  page: z.coerce.number().default(1).refine(val => val > 0, { message: "Page must be positive" }),
  limit: z.coerce.number().default(20).refine(val => val > 0 && val <= 100, { message: "Limit must be between 1 and 100" }),
  sortBy: z.enum(['price', 'date', 'rating', 'relevance']).default('relevance')
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = PropertyQuerySchema.parse(Object.fromEntries(searchParams));
    
    // Get properties from guest browsing service
    const result = await guestBrowsingService.getProperties({
      search: query.search,
      city: query.city,
      type: query.type,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      bedrooms: query.bedrooms,
      bathrooms: query.bathrooms,
      features: query.features,
      page: query.page,
      limit: query.limit
    });

    // Track search for analytics
    if (query.search) {
      guestBrowsingService.trackSearch(query.search, query, result.total);
    }

    return NextResponse.json({
      success: true,
      data: {
        properties: result.properties,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        },
        filters: {
          search: query.search,
          city: query.city,
          type: query.type,
          priceRange: [query.minPrice, query.maxPrice],
          bedrooms: query.bedrooms,
          bathrooms: query.bathrooms,
          features: query.features
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters', 
          details: error.issues 
        },
        { status: 400 }
      );
    }
    
    console.error('Properties API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Get single property details
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId } = body;
    
    if (!propertyId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Property ID is required' 
        },
        { status: 400 }
      );
    }

    const property = await guestBrowsingService.getPropertyById(propertyId);
    
    if (!property) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Property not found' 
        },
        { status: 404 }
      );
    }

    // Track view for analytics
    guestBrowsingService.trackView(propertyId, 'property');

    return NextResponse.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Property details API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}