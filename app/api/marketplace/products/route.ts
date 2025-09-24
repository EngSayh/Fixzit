import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/db/collections';
import { z } from 'zod';

const QuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20).refine(val => val <= 100, { message: "Limit must be 100 or less" })
});

export async function GET(req: NextRequest) {
  try {
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
    const vendorIds = [...new Set(productsList.map(p => p.vendorId))];
    const vendorsList = await vendors.find({ _id: { $in: vendorIds } }).toArray();
    const vendorMap = new Map(vendorsList.map(v => [v._id, v]));
    
    const enrichedProducts = productsList.map(product => ({
      ...product,
      vendor: vendorMap.get(product.vendorId)
    }));
    
    return NextResponse.json({
      ok: true,
      data: {
        products: enrichedProducts,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit)
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
  try {
    // Check auth
    const token = req.cookies.get('fixzit_auth')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const data = CreateProductSchema.parse(body);
    
    const { products } = await getCollections();
    
    // Check if SKU exists
    const existing = await products.findOne({ sku: data.sku });
    if (existing) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 409 }
      );
    }
    
    // Get user context from headers
    const userHeader = req.headers.get('x-user');
    const user = userHeader ? JSON.parse(userHeader) : null;
    
    const product = {
      ...data,
      tenantId: user?.tenantId || 'default',
      rating: 0,
      reviewCount: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await products.insertOne(product);
    
    return NextResponse.json({
      ok: true,
      data: { ...product, _id: result.insertedId }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Product creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
