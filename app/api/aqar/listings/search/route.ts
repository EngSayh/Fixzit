/**
 * Aqar Souq - Listings Search API
 * 
 * GET /api/aqar/listings/search
 * 
 * Atlas Search with geo-spatial + full-text + facets
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarListing, FurnishingStatus, ListingIntent, PropertyType } from '@/models/aqar';
import type { PipelineStage } from 'mongoose';

export const runtime = 'nodejs'; // Atlas Search requires Node.js runtime

// Type for search results with distance field (from $geoNear)
interface ListingSearchResult {
  _id: string;
  title: string;
  price: number;
  areaSqm?: number;
  beds?: number;
  baths?: number;
  distance?: number; // Added by $geoNear
  [key: string]: unknown;
}

// Type for facet results
interface FacetResult {
  _id: string;
  count: number;
}

interface SearchFacets {
  propertyTypes: FacetResult[];
  cities: FacetResult[];
  priceRanges: Array<{ _id: number | string; count: number }>;
}

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters with proper validation
    const intent = searchParams.get('intent'); // BUY|RENT|DAILY
    const propertyType = searchParams.get('propertyType');
    const city = searchParams.get('city');
    const neighborhoods = searchParams.get('neighborhoods')?.split(',');
    
    // Parse numeric helper
    const parseNumeric = (value: string | null, parser: (s: string) => number): number | undefined => {
      if (!value || value.trim() === '') return undefined;
      const raw = value.trim();
      let parsed: number;
      if (parser === parseInt) {
        parsed = parseInt(raw, 10);
      } else {
        parsed = parser(raw);
      }
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    
    const minPrice = parseNumeric(searchParams.get('minPrice'), parseInt);
    const maxPrice = parseNumeric(searchParams.get('maxPrice'), parseInt);
    const minBeds = parseNumeric(searchParams.get('minBeds'), parseInt);
    const maxBeds = parseNumeric(searchParams.get('maxBeds'), parseInt);
    const minArea = parseNumeric(searchParams.get('minArea'), parseInt);
    const maxArea = parseNumeric(searchParams.get('maxArea'), parseInt);
    const furnishing = searchParams.get('furnishing');
    const amenitiesRaw = searchParams.get('amenities');
    const amenities = amenitiesRaw ? amenitiesRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    // Validate enums and numeric ranges early and return 400 on invalid inputs
    // Intent
    if (intent && !Object.values(ListingIntent).includes(intent as ListingIntent)) {
      return NextResponse.json({ error: `Invalid intent: ${intent}` }, { status: 400 });
    }
    // Property type
    if (propertyType && !Object.values(PropertyType).includes(propertyType as PropertyType)) {
      return NextResponse.json({ error: `Invalid propertyType: ${propertyType}` }, { status: 400 });
    }
    
    // Geo search with validation
    const lat = parseNumeric(searchParams.get('lat'), parseFloat);
    const lng = parseNumeric(searchParams.get('lng'), parseFloat);
    let radiusKm = parseNumeric(searchParams.get('radiusKm'), parseFloat);

    // Numeric range checks
    if (minPrice !== undefined && minPrice < 0) return NextResponse.json({ error: 'minPrice must be >= 0' }, { status: 400 });
    if (maxPrice !== undefined && maxPrice < 0) return NextResponse.json({ error: 'maxPrice must be >= 0' }, { status: 400 });
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) return NextResponse.json({ error: 'minPrice cannot be greater than maxPrice' }, { status: 400 });
    
    const MAX_BEDS = 50;
    if (minBeds !== undefined && (minBeds < 0 || minBeds > MAX_BEDS)) return NextResponse.json({ error: `minBeds must be between 0 and ${MAX_BEDS}` }, { status: 400 });
    if (maxBeds !== undefined && (maxBeds < 0 || maxBeds > MAX_BEDS)) return NextResponse.json({ error: `maxBeds must be between 0 and ${MAX_BEDS}` }, { status: 400 });
    if (minBeds !== undefined && maxBeds !== undefined && minBeds > maxBeds) return NextResponse.json({ error: 'minBeds cannot be greater than maxBeds' }, { status: 400 });

    if (minArea !== undefined && minArea < 0) return NextResponse.json({ error: 'minArea must be >= 0' }, { status: 400 });
    if (maxArea !== undefined && maxArea < 0) return NextResponse.json({ error: 'maxArea must be >= 0' }, { status: 400 });
    if (minArea !== undefined && maxArea !== undefined && minArea > maxArea) return NextResponse.json({ error: 'minArea cannot be greater than maxArea' }, { status: 400 });

    // Furnishing enum
    if (furnishing && !Object.values(FurnishingStatus).includes(furnishing as FurnishingStatus)) {
      return NextResponse.json({ error: `Invalid furnishing: ${furnishing}` }, { status: 400 });
    }

    // Geo validation and caps
    const MAX_RADIUS_KM = 100; // sensible cap
    if (radiusKm !== undefined) {
      if (radiusKm < 0) return NextResponse.json({ error: 'radiusKm must be >= 0' }, { status: 400 });
      if (radiusKm > MAX_RADIUS_KM) radiusKm = MAX_RADIUS_KM;
    }
    if (lat !== undefined && (lat < -90 || lat > 90)) return NextResponse.json({ error: 'lat must be between -90 and 90' }, { status: 400 });
    if (lng !== undefined && (lng < -180 || lng > 180)) return NextResponse.json({ error: 'lng must be between -180 and 180' }, { status: 400 });
    
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
    
    // Check if geo search is active
    const hasGeoSearch = lat !== undefined && lng !== undefined && radiusKm !== undefined;
    
    let listings: ListingSearchResult[];
    let total: number;
    let facets: SearchFacets[];
    
    if (hasGeoSearch) {
      // Use aggregation with $geoNear as first stage (MongoDB requirement for geo in aggregation)
      // $geoNear must be the first stage and performs both geo filtering and sorting by distance
      const geoNearStage: PipelineStage.GeoNear = {
        $geoNear: {
          near: {
            type: 'Point' as const,
            coordinates: [lng, lat] as [number, number],
          },
          distanceField: 'distance',
          maxDistance: radiusKm! * 1000, // Convert km to meters
          query: query, // Apply other filters
          spherical: true,
        },
      };
      
      // Build aggregation pipeline
      const pipeline: PipelineStage[] = [
        geoNearStage,
        { $sort: sortQuery },
        { $skip: skip },
        { $limit: limit },
      ];
      
      // Execute geo-aware aggregation for listings
      listings = await AqarListing.aggregate<ListingSearchResult>(pipeline);
      
      // Count total matching documents
      const countPipeline: PipelineStage[] = [geoNearStage, { $count: 'total' }];
      const countResult = await AqarListing.aggregate<{ total: number }>(countPipeline);
      total = countResult[0]?.total || 0;
      
      // Calculate facets with geo filter
      const facetsPipeline: PipelineStage[] = [
        geoNearStage,
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
      ];
      facets = await AqarListing.aggregate<SearchFacets>(facetsPipeline);
    } else {
      // No geo search - use standard find query
      const [listingsRaw, totalCount] = await Promise.all([
        AqarListing.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
        AqarListing.countDocuments(query),
      ]);
      
      listings = listingsRaw as unknown as ListingSearchResult[];
      total = totalCount;
      
      // Calculate facets without geo
      const facetsPipeline: PipelineStage[] = [
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
      ];
      facets = await AqarListing.aggregate<SearchFacets>(facetsPipeline);
    }
    
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
