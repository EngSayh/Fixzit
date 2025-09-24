// Public API for materials browsing (no authentication required)
// Implements Amazon-style guest browsing

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guestBrowsingService } from '@/src/lib/guest-browsing';

const MaterialQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  vendor: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  page: z.coerce.number().default(1).refine(val => val > 0, { message: "Page must be positive" }),
  limit: z.coerce.number().default(20).refine(val => val > 0 && val <= 100, { message: "Limit must be between 1 and 100" }),
  sortBy: z.enum(['price', 'date', 'rating', 'relevance']).default('relevance')
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = MaterialQuerySchema.parse(Object.fromEntries(searchParams));
    
    // Get materials from guest browsing service
    const result = await guestBrowsingService.getMaterials({
      search: query.search,
      category: query.category,
      subcategory: query.subcategory,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      vendor: query.vendor,
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
        materials: result.materials,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        },
        filters: {
          search: query.search,
          category: query.category,
          subcategory: query.subcategory,
          priceRange: [query.minPrice, query.maxPrice],
          vendor: query.vendor,
          inStock: query.inStock
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
    
    console.error('Materials API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Get single material details
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { materialId } = body;
    
    if (!materialId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Material ID is required' 
        },
        { status: 400 }
      );
    }

    const material = await guestBrowsingService.getMaterialById(materialId);
    
    if (!material) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Material not found' 
        },
        { status: 404 }
      );
    }

    // Track view for analytics
    guestBrowsingService.trackView(materialId, 'material');

    return NextResponse.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Material details API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}