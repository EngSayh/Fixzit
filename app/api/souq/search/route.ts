import { NextRequest, NextResponse } from 'next/server';
import { getMeiliSearchClient } from '@/lib/meilisearch-client';
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brandId: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  isActive: z.coerce.boolean().optional().default(true),
  orgId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

/**
 * GET /api/souq/search
 * 
 * Search products using Meilisearch with faceted filters
 * 
 * Query Parameters:
 * - q: Search query (optional)
 * - category: Filter by category ID
 * - brandId: Filter by brand ID
 * - minPrice: Minimum price filter
 * - maxPrice: Maximum price filter
 * - isActive: Filter by active status (default: true)
 * - orgId: Filter by organization ID
 * - limit: Results per page (1-100, default: 20)
 * - offset: Pagination offset (default: 0)
 * 
 * @returns Search results with pagination metadata
 */
export async function GET(req: NextRequest) {
  try {
    // Check if Meilisearch is configured
    const client = getMeiliSearchClient();
    if (!client) {
      return NextResponse.json(
        { 
          error: 'Search not configured',
          message: 'Meilisearch is not available. Please configure MEILISEARCH_HOST and MEILISEARCH_API_KEY environment variables.'
        },
        { status: 503 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      brandId: searchParams.get('brandId') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      orgId: searchParams.get('orgId') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    const validated = searchQuerySchema.parse(queryParams);

    // Build filter array
    const filters: string[] = [];
    
    // Always filter by active status unless explicitly set to false
    if (validated.isActive) {
      filters.push('isActive = true');
    }
    
    if (validated.category) {
      filters.push(`categoryId = "${validated.category}"`);
    }
    
    if (validated.brandId) {
      filters.push(`brandId = "${validated.brandId}"`);
    }
    
    if (validated.minPrice !== undefined) {
      filters.push(`price >= ${validated.minPrice}`);
    }
    
    if (validated.maxPrice !== undefined) {
      filters.push(`price <= ${validated.maxPrice}`);
    }
    
    if (validated.orgId) {
      filters.push(`orgId = "${validated.orgId}"`);
    }

    // Perform search
    const results = await client.index('products').search(validated.q || '', {
      filter: filters.length > 0 ? filters : undefined,
      limit: validated.limit,
      offset: validated.offset,
      attributesToRetrieve: [
        'id',
        'fsin',
        'title',
        'description',
        'categoryId',
        'brandId',
        'searchKeywords',
        'isActive',
        'orgId',
      ],
    });

    return NextResponse.json({
      success: true,
      data: {
        hits: results.hits,
        query: validated.q || '',
        offset: validated.offset,
        limit: validated.limit,
        estimatedTotalHits: results.estimatedTotalHits,
        processingTimeMs: results.processingTimeMs,
        filters: {
          category: validated.category,
          brandId: validated.brandId,
          minPrice: validated.minPrice,
          maxPrice: validated.maxPrice,
          isActive: validated.isActive,
          orgId: validated.orgId,
        },
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 }
      );
    }

    console.error('[Souq Search] Search failed:', error);
    
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
