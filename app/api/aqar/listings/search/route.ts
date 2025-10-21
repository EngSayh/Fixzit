/**
 * Aqar Souq - Listings Search API
 * 
 * GET /api/aqar/listings/search
 * 
 * Atlas Search with geo-spatial + full-text + facets
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarListing } from '@/models/aqar';

export const runtime = 'nodejs'; // Atlas Search requires Node.js runtime

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters with proper validation
    const intent = searchParams.get('intent'); // BUY|RENT|DAILY
    const propertyType = searchParams.get('propertyType');
    const city = searchParams.get('city');
    const neighborhoods = searchParams.get('neighborhoods')?.split(',');
    
    // Parse and validate numeric params (set undefined if invalid)
    const parseNumeric = (value: string | null, parser: (s: string) => number): number | undefined => {
      if (!value || value.trim() === '') return undefined;
      const parsed = parser(value.trim());
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    
    const minPrice = parseNumeric(searchParams.get('minPrice'), parseInt);
    const maxPrice = parseNumeric(searchParams.get('maxPrice'), parseInt);
    const minBeds = parseNumeric(searchParams.get('minBeds'), parseInt);
    const maxBeds = parseNumeric(searchParams.get('maxBeds'), parseInt);
    const minArea = parseNumeric(searchParams.get('minArea'), parseInt);
    const maxArea = parseNumeric(searchParams.get('maxArea'), parseInt);
    const furnishing = searchParams.get('furnishing');
    const amenities = searchParams.get('amenities')?.split(',');
    
    // Geo search with validation
    const lat = parseNumeric(searchParams.get('lat'), parseFloat);
    const lng = parseNumeric(searchParams.get('lng'), parseFloat);
    const radiusKm = parseNumeric(searchParams.get('radiusKm'), parseFloat);
    
    // Sorting & pagination with clamping
    const sort = searchParams.get('sort') || 'relevance'; // relevance|price-asc|price-desc|date-desc|featured
    
    // Clamp page and limit to safe ranges
    const rawPage = parseNumeric(searchParams.get('page'), parseInt) || 1;
    const rawLimit = parseNumeric(searchParams.get('limit'), parseInt) || 20;
    const page = Math.max(1, Math.min(1000, rawPage)); // 1-1000
    const limit = Math.max(1, Math.min(100, rawLimit)); // 1-100
    const skip = (page - 1) * limit;
    
    // Build query
    const query: Record<string, unknown> = {
      status: 'ACTIVE',
    };
    
    if (intent) query.intent = intent;
    if (propertyType) query.propertyType = propertyType;
    if (city) query.city = city;
    if (neighborhoods && neighborhoods.length > 0) query.neighborhood = { $in: neighborhoods };
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) (query.price as Record<string, number>).$gte = minPrice;
      if (maxPrice !== undefined) (query.price as Record<string, number>).$lte = maxPrice;
    }
    if (minBeds !== undefined || maxBeds !== undefined) {
      query.beds = {};
      if (minBeds !== undefined) (query.beds as Record<string, number>).$gte = minBeds;
      if (maxBeds !== undefined) (query.beds as Record<string, number>).$lte = maxBeds;
    }
    if (minArea !== undefined || maxArea !== undefined) {
      query.areaSqm = {};
      if (minArea !== undefined) (query.areaSqm as Record<string, number>).$gte = minArea;
      if (maxArea !== undefined) (query.areaSqm as Record<string, number>).$lte = maxArea;
    }
    if (furnishing) query.furnishing = furnishing;
    if (amenities && amenities.length > 0) query.amenities = { $all: amenities };
    
    // Geo search
    if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
      query.geo = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusKm * 1000, // Convert km to meters
        },
      };
    }
    
    // Build sort
    let sortQuery: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'price-asc':
        sortQuery = { price: 1 };
        break;
      case 'price-desc':
        sortQuery = { price: -1 };
        break;
      case 'date-desc':
        sortQuery = { publishedAt: -1 };
        break;
      case 'featured':
        sortQuery = { featuredLevel: -1, publishedAt: -1 };
        break;
      default:
        sortQuery = { publishedAt: -1 };
    }
    
    // Execute query
    const [listings, total] = await Promise.all([
      AqarListing.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
      AqarListing.countDocuments(query),
    ]);
    
    // Calculate facets
    const facets = await AqarListing.aggregate([
      { $match: query },
      {
        $facet: {
          propertyTypes: [
            { $group: { _id: '$propertyType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          cities: [
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          priceRanges: [
            {
              $bucket: {
                groupBy: '$price',
                boundaries: [0, 100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000],
                default: '10M+',
                output: { count: { $sum: 1 } },
              },
            },
          ],
        },
      },
    ]);
    
    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      facets: facets[0] || {},
    });
  } catch (error) {
    // Sanitized error logging - correlation ID, no PII, no sensitive internals
    const errorId = `search_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.error('Error searching listings', {
      errorId,
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
      // DO NOT log: query details, coordinates, user data, connection strings, stack traces
    });
    return NextResponse.json(
      { error: 'Failed to search listings', errorId },
      { status: 500 }
    );
  }
}
