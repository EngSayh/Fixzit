import { NextRequest, NextResponse } from 'next/server';
import { getCollections, safeInsertOne } from '@/lib/db/collections';
import { z } from 'zod';
import { 
  extractTenantId, 
  extractLanguage 
} from '@/lib/marketplace/serverFetch';
import {
  extractCorrelationId,
  logWithCorrelation
} from '@/lib/marketplace/correlation';
import { 
  createSecureResponse, 
  securityMiddleware 
} from '@/lib/marketplace/security';
import { getMarketplaceErrorMessage } from '@/lib/i18n';
import { addTimestamps } from '@/lib/utils/timestamp';

const QuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20).refine(val => val <= 100, { message: "Limit must be 100 or less" })
});

export async function GET(req: NextRequest) {
  // Handle CORS preflight
  const securityCheck = securityMiddleware()(req);
  if (securityCheck) return securityCheck;

  const correlationId = extractCorrelationId(req);
  const tenantId = extractTenantId(req);
  const language = extractLanguage(req);

  try {
    logWithCorrelation('marketplace-products', 'Fetching products', {
      tenantId,
      language,
      url: req.url
    }, correlationId);

    const { searchParams } = new URL(req.url);
    const query = QuerySchema.parse(Object.fromEntries(searchParams));
    
    const { products, categories, vendors } = await getCollections();
    
    // Build MongoDB query
    const filter: any = { active: true };
    
    if (query.q) {
      filter.$text = { $search: query.q };
    }
    
    if (query.category) {
      const category = await categories.findOne({ slug: query.category });
      if (category) {
        filter.categoryId = category._id;
      }
    }
    
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = query.minPrice;
      if (query.maxPrice) filter.price.$lte = query.maxPrice;
    }
    
    // Pagination
    const skip = (query.page - 1) * query.limit;
    
    // Get products with vendor info
    const productsList = await products
      .find(filter)
      .skip(skip)
      .limit(query.limit)
      .toArray();
    
    // Get total count
    const total = await products.countDocuments(filter);
    
    // Enrich with vendor data
    const vendorIds = [...new Set(productsList.map(p => p.vendorId).filter(Boolean))];
    const vendorsList = vendorIds.length > 0 
      ? await vendors.find({ _id: { $in: vendorIds } }).toArray()
      : [];
    const vendorMap = new Map(vendorsList.map(v => [v._id, v]));
    
    const enrichedProducts = productsList.map(product => ({
      ...product,
      vendor: vendorMap.get(product.vendorId)
    }));
    
    logWithCorrelation('marketplace-products', 'Products fetched successfully', {
      count: enrichedProducts.length,
      total,
      page: query.page
    }, correlationId);

    return createSecureResponse({
      ok: true,
      data: {
        products: enrichedProducts,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit)
        }
      },
      correlationId
    });
    
  } catch (error) {
    logWithCorrelation('marketplace-products', 'Products fetch failed', {
      error: error instanceof Error ? error.message : String(error)
    }, correlationId);

    if (error instanceof z.ZodError) {
      const message = getMarketplaceErrorMessage('validation', language, 'Invalid query parameters');
      return createSecureResponse(
        { 
          error: message,
          details: error.issues,
          correlationId
        },
        { status: 400 }
      );
    }
    
    const message = getMarketplaceErrorMessage('server', language, 'Internal server error');
    return createSecureResponse(
      { 
        error: message,
        correlationId
      },
      { status: 500 }
    );
  }
}

const CreateProductSchema = z.object({
  vendorId: z.string(),
  categoryId: z.string(),
  sku: z.string(),
  title: z.string(),
  description: z.string(),
  images: z.array(z.string()).default([]),
  price: z.number().positive(),
  currency: z.string().default('SAR'),
  unit: z.string(),
  stock: z.number().int().nonnegative()
});

export async function POST(req: NextRequest) {
  const correlationId = extractCorrelationId(req);
  const tenantId = extractTenantId(req);
  const language = extractLanguage(req);

  try {
    logWithCorrelation('marketplace-products', 'Creating product', {
      tenantId,
      language
    }, correlationId);

    // Check auth
    const token = req.cookies.get('fixzit_auth')?.value;
    if (!token) {
      const message = getMarketplaceErrorMessage('unauthorized', language, 'Unauthorized');
      return createSecureResponse(
        { error: message, correlationId },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const data = CreateProductSchema.parse(body);
    
    const { products } = await getCollections();
    
    // Check if SKU exists
    const existing = await products.findOne({ sku: data.sku });
    if (existing) {
      const message = getMarketplaceErrorMessage('validation', language, 'SKU already exists');
      return createSecureResponse(
        { error: message, correlationId },
        { status: 409 }
      );
    }
    
    const productData = {
      ...data,
      tenantId: tenantId || 'default',
      rating: 0,
      reviewCount: 0,
      active: true
    };
    
    const product = addTimestamps(productData);
    const result = await safeInsertOne('products', product);
    
    logWithCorrelation('marketplace-products', 'Product created successfully', {
      productId: result.insertedId,
      sku: data.sku
    }, correlationId);
    
    return createSecureResponse({
      ok: true,
      data: { ...product, _id: result.insertedId },
      correlationId
    }, { status: 201 });
    
  } catch (error) {
    logWithCorrelation('marketplace-products', 'Product creation failed', {
      error: error instanceof Error ? error.message : String(error)
    }, correlationId);

    if (error instanceof z.ZodError) {
      const message = getMarketplaceErrorMessage('validation', language, 'Invalid input');
      return createSecureResponse(
        { 
          error: message,
          details: error.issues,
          correlationId
        },
        { status: 400 }
      );
    }
    
    const message = getMarketplaceErrorMessage('server', language, 'Internal server error');
    return createSecureResponse(
      { 
        error: message,
        correlationId
      },
      { status: 500 }
    );
  }
}
