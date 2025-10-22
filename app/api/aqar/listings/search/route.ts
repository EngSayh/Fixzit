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
    
    // Parse and validate numeric query parameters
    const parseNum = (key: string): number | undefined => {
      const raw = searchParams.get(key);
      if (!raw) return undefined;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    
    const parseFloat = (key: string): number | undefined => {
      const raw = searchParams.get(key);
      if (!raw) return undefined;
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    
    // Parse query parameters with NaN safety
    const intent = searchParams.get('intent'); // BUY|RENT|DAILY
    const propertyType = searchParams.get('propertyType');
    const city = searchParams.get('city');
    const neighborhoods = searchParams.get('neighborhoods')?.split(',').map(s => s.trim()).filter(Boolean);
    const minPrice = parseNum('minPrice');
    const maxPrice = parseNum('maxPrice');
    const minBeds = parseNum('minBeds');
    const maxBeds = parseNum('maxBeds');
    const minArea = parseNum('minArea');
    const maxArea = parseNum('maxArea');
    const furnishing = searchParams.get('furnishing');
    const amenities = searchParams.get('amenities')?.split(',').map(s => s.trim()).filter(Boolean);
    
    // Geo search with validation
    const latRaw = searchParams.get('lat');
    const lngRaw = searchParams.get('lng');
    const radiusKmRaw = searchParams.get('radiusKm');
    
    let lat: number | undefined;
    let lng: number | undefined;
    let radiusKm: number | undefined;
    
    if (latRaw !== null) {
      const latParsed = parseFloat(latRaw);
      if (isNaN(latParsed) || latParsed < -90 || latParsed > 90) {
        return NextResponse.json({ error: 'Invalid latitude: must be between -90 and 90' }, { status: 400 });
      }
      lat = latParsed;
    }
    
    if (lngRaw !== null) {
      const lngParsed = parseFloat(lngRaw);
      if (isNaN(lngParsed) || lngParsed < -180 || lngParsed > 180) {
        return NextResponse.json({ error: 'Invalid longitude: must be between -180 and 180' }, { status: 400 });
      }
      lng = lngParsed;
    }
    
    if (radiusKmRaw !== null) {
      const radiusKmParsed = parseFloat(radiusKmRaw);
      if (isNaN(radiusKmParsed) || radiusKmParsed <= 0 || radiusKmParsed > 500) {
        return NextResponse.json({ error: 'Invalid radiusKm: must be between 0 and 500' }, { status: 400 });
      }
      radiusKm = radiusKmParsed;
    }
    
    // Sorting & pagination with bounds
    const sort = searchParams.get('sort') || 'date-desc'; // date-desc|price-asc|price-desc|featured
    const pageRaw = parseNum('page');
    const limitRaw = parseNum('limit');
    const page = pageRaw && pageRaw >= 1 ? pageRaw : 1;
    const limit = limitRaw && limitRaw >= 1 && limitRaw <= 100 ? limitRaw : 20;
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
    // Note: 'relevance' removed - true relevance scoring requires Atlas Search $search
    // Use date-desc as default for chronological ordering
    let sortQuery: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'price-asc':
        sortQuery = { price: 1 };
        break;
      case 'price-desc':
        sortQuery = { price: -1 };
        break;
      case 'featured':
        sortQuery = { featuredLevel: -1, publishedAt: -1 };
        break;
      case 'date-desc':
      default:
        // Default to most recent first
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
    // Log sanitized error without PII
    console.error('Error searching listings:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message.substring(0, 100) : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to search listings' },
      { status: 500 }
    );
  }
}
