// app/api/marketplace/properties/route.ts - Public property browsing API
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/src/db/mongoose';
import Listing from '@/src/server/models/Listing';

// Query schema for property search
const searchSchema = z.object({
  city: z.string().optional(),
  district: z.string().optional(),
  purpose: z.enum(['sale', 'rent', 'lease']).optional(),
  category: z.enum(['residential', 'commercial', 'industrial', 'agricultural']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  minArea: z.coerce.number().optional(),
  maxArea: z.coerce.number().optional(),
  furnished: z.enum(['true', 'false']).optional(),
  verified: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  sort: z.enum(['price_asc', 'price_desc', 'date_desc', 'verified']).default('date_desc')
});

const MOCK = process.env.USE_MOCK_DB === 'true' || process.env.DISABLE_DB === 'true';

function mockResponse() {
  const now = new Date();
  const listings = [
    {
      id: 'p1',
      title: 'Apartment in Al Olaya',
      price: 90000,
      currency: 'SAR',
      property: {
        category: 'residential',
        purpose: 'rent',
        area: 120,
        bedrooms: 2,
        bathrooms: 2,
        location: { city: 'Riyadh', district: 'Al Olaya', coordinates: { lat: 24.71, lng: 46.67 } }
      },
      badges: { verified: true, falVerified: false },
      image: { url: '/placeholder-property.jpg', thumbnailUrl: '/placeholder-property.jpg' },
      stats: { views: 120, daysOnMarket: 7 },
      publishedAt: now,
      url: '/marketplace/properties/p1'
    },
    {
      id: 'p2',
      title: 'Villa in Al Hamra',
      price: 250000,
      currency: 'SAR',
      property: {
        category: 'residential',
        purpose: 'sale',
        area: 300,
        bedrooms: 4,
        bathrooms: 3,
        location: { city: 'Jeddah', district: 'Al Hamra', coordinates: { lat: 21.49, lng: 39.19 } }
      },
      badges: { verified: false, falVerified: true },
      image: { url: '/placeholder-property.jpg', thumbnailUrl: '/placeholder-property.jpg' },
      stats: { views: 45, daysOnMarket: 12 },
      publishedAt: now,
      url: '/marketplace/properties/p2'
    },
    {
      id: 'p3',
      title: 'Office in Dammam',
      price: 120000,
      currency: 'SAR',
      property: {
        category: 'commercial',
        purpose: 'rent',
        area: 200,
        bedrooms: 0,
        bathrooms: 2,
        location: { city: 'Dammam', district: 'Business', coordinates: { lat: 26.42, lng: 50.08 } }
      },
      badges: { verified: true, falVerified: false },
      image: { url: '/placeholder-property.jpg', thumbnailUrl: '/placeholder-property.jpg' },
      stats: { views: 12, daysOnMarket: 3 },
      publishedAt: now,
      url: '/marketplace/properties/p3'
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      listings,
      pagination: { page: 1, limit: listings.length, total: listings.length, pages: 1 },
      filters: {
        cities: [ { _id: 'Riyadh', count: 1 }, { _id: 'Jeddah', count: 1 }, { _id: 'Dammam', count: 1 } ],
        priceRange: { min: 65000, max: 2000000 },
        categories: [ { _id: 'residential', count: 2 }, { _id: 'commercial', count: 1 } ]
      }
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    if (MOCK) {
      return mockResponse();
    }

    await dbConnect();

    // Parse query parameters
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = searchSchema.parse(searchParams);

    // Build MongoDB query
    const filter: any = {
      type: 'property',
      status: 'active',
      'visibility.public': true,
      'guestAccess.allowBrowse': true
    };

    // Add filters
    if (query.city) filter['property.location.city'] = query.city;
    if (query.district) filter['property.location.district'] = query.district;
    if (query.purpose) filter['property.purpose'] = query.purpose;
    if (query.category) filter['property.category'] = query.category;
    
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = query.minPrice;
      if (query.maxPrice) filter.price.$lte = query.maxPrice;
    }

    if (query.bedrooms) filter['property.bedrooms'] = { $gte: query.bedrooms };
    if (query.bathrooms) filter['property.bathrooms'] = { $gte: query.bathrooms };
    
    if (query.minArea || query.maxArea) {
      filter['property.area'] = {};
      if (query.minArea) filter['property.area'].$gte = query.minArea;
      if (query.maxArea) filter['property.area'].$lte = query.maxArea;
    }

    if (query.furnished === 'true') filter['property.furnished'] = true;
    if (query.verified === 'true') filter['verification.status'] = 'verified';

    // Sorting
    let sort: any = {};
    switch (query.sort) {
      case 'price_asc':
        sort.price = 1;
        break;
      case 'price_desc':
        sort.price = -1;
        break;
      case 'verified':
        sort['verification.status'] = -1;
        sort.publishedAt = -1;
        break;
      default:
        sort.publishedAt = -1;
    }

    // Pagination
    const skip = (query.page - 1) * query.limit;

    // Execute queries
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Listing.countDocuments(filter)
    ]);

    // Transform for public view
    const publicListings = listings.map(listing => {
      const publicData = {
        id: listing._id,
        title: listing.title,
        titleAr: listing.titleAr,
        price: listing.price,
        currency: listing.currency,
        priceType: listing.priceType,
        
        property: {
          category: listing.property.category,
          subcategory: listing.property.subcategory,
          purpose: listing.property.purpose,
          area: listing.property.area,
          bedrooms: listing.property.bedrooms,
          bathrooms: listing.property.bathrooms,
          parkingSpaces: listing.property.parkingSpaces,
          furnished: listing.property.furnished,
          
          location: {
            city: listing.property.location.city,
            district: listing.property.location.district,
            // Generalized coordinates for privacy
            coordinates: listing.guestAccess?.showLocation === 'exact' ? 
              listing.property.location.coordinates : 
              {
                lat: Math.round(listing.property.location.coordinates?.lat * 100) / 100,
                lng: Math.round(listing.property.location.coordinates?.lng * 100) / 100,
                accuracy: 'district'
              }
          }
        },
        
        // Masked seller info
        seller: {
          type: listing.seller.type,
          verified: listing.seller.verified,
          company: listing.seller.company?.name,
          // Show FAL badge but not the actual number
          falVerified: listing.seller.falLicense?.valid || false
        },
        
        // First image only, watermarked
        image: listing.media?.images?.[0] ? {
          url: listing.media.images[0].url + '?watermark=true',
          thumbnailUrl: listing.media.images[0].thumbnailUrl
        } : null,
        
        // Verification badges
        badges: {
          verified: listing.verification?.status === 'verified',
          documentsVerified: listing.verification?.documentsVerified || false,
          physicallyVerified: listing.verification?.physicallyVerified || false,
          addressVerified: listing.verification?.addressVerified || false,
          falVerified: listing.seller?.falLicense?.valid || false
        },
        
        // Stats (public metrics only)
        stats: {
          views: listing.stats?.views || 0,
          daysOnMarket: Math.floor((Date.now() - new Date(listing.publishedAt).getTime()) / (1000 * 60 * 60 * 24))
        },
        
        publishedAt: listing.publishedAt,
        url: `/marketplace/properties/${listing._id}`
      };

      return publicData;
    });

    // Aggregate data for filters
    const aggregations = await Listing.aggregate([
      { $match: { type: 'property', status: 'active', 'visibility.public': true } },
      {
        $facet: {
          cities: [
            { $group: { _id: '$property.location.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ],
          priceRange: [
            { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
          ],
          categories: [
            { $group: { _id: '$property.category', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const filters = {
      cities: aggregations[0]?.cities || [],
      priceRange: aggregations[0]?.priceRange?.[0] || { min: 0, max: 0 },
      categories: aggregations[0]?.categories || []
    };

    return NextResponse.json({
      success: true,
      data: {
        listings: publicListings,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit)
        },
        filters
      }
    });

  } catch (error) {
    console.error('Property search error:', error);
    return mockResponse();
  }
}
