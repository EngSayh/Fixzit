/**
 * Catalog Service API - Product & Category Management
 * Handles FSIN generation, product creation, category management
 * @module app/api/souq/catalog
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { generateFSIN } from '@/lib/souq/fsin-generator';
import { SouqProduct } from '@/server/models/souq/Product';
import { SouqCategory } from '@/server/models/souq/Category';
import { SouqBrand } from '@/server/models/souq/Brand';
import { connectDb } from '@/lib/mongodb-unified';
import { getServerSession } from '@/lib/auth/getServerSession';

// Validation schemas
const CreateProductSchema = z.object({
  title: z.record(z.string(), z.string()).refine(data => data.en && data.ar, {
    message: 'Title must include both English and Arabic',
  }),
  description: z.record(z.string(), z.string()),
  shortDescription: z.record(z.string(), z.string()).optional(),
  categoryId: z.string(),
  brandId: z.string().optional(),
  images: z.array(z.string().url()).min(1, 'At least one image required'),
  videos: z.array(z.string().url()).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
  hasVariations: z.boolean().default(false),
  variationTheme: z.enum(['color', 'size', 'style', 'color_size', 'custom']).optional(),
  searchKeywords: z.array(z.string()).optional(),
  bulletPoints: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * POST /api/souq/catalog/products
 * Create new product with auto-generated FSIN
 */
export async function POST(request: NextRequest) {
  let orgId: string | undefined;
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    await connectDb();

    const body = await request.json();
    const validated = CreateProductSchema.parse(body);

    // Check category exists and is not restricted (or seller has approval)
    const category = await SouqCategory.findOne({ categoryId: validated.categoryId, isActive: true });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check seller authorization for restricted categories
    if (category.isRestricted) {
      // Check if seller has approval for this restricted category
      const { SouqSeller } = await import('@/server/models/souq/Seller');
      const seller = await SouqSeller.findOne({ 
        orgId, 
        isActive: true,
        'approvedCategories.categoryId': validated.categoryId
      });
      
      if (!seller) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Seller not approved for this restricted category' },
          { status: 403 }
        );
      }
    }

    // Check brand exists and seller is authorized if gated
    if (validated.brandId) {
      const brand = await SouqBrand.findOne({ brandId: validated.brandId, isActive: true });
      if (!brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }

      // Check seller authorization for gated brands
      if (brand.isGated) {
        const { SouqSeller } = await import('@/server/models/souq/Seller');
        const seller = await SouqSeller.findOne({ 
          orgId, 
          isActive: true,
          'approvedBrands.brandId': validated.brandId
        });
        
        if (!seller) {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Seller not approved for this gated brand' },
            { status: 403 }
          );
        }
      }
    }

    // Generate FSIN
    const { fsin } = generateFSIN();
    let finalFsin = fsin;

    // Check for collision (extremely rare)
    const existingProduct = await SouqProduct.findOne({ fsin: finalFsin });
    if (existingProduct) {
      // Regenerate FSIN
      const { fsin: newFsin } = generateFSIN();
      finalFsin = newFsin;
    }

    // Create product
    const product = new SouqProduct({
      fsin: finalFsin,
      ...validated,
      org_id: orgId,
      createdBy: session.user.id,
      isActive: true,
    });

    await product.save();

    // Index in search engine using shared Meilisearch client
    try {
      const { indexProduct } = await import('@/lib/meilisearch-client');
      // TODO(type-safety): Verify indexProduct function signature
      await (indexProduct as any)({
        id: product._id.toString(),
        fsin: product.fsin,
        title: (product as any).title,
        description: (product as any).description,
        categoryId: product.categoryId,
        brandId: product.brandId,
        searchKeywords: (product as any).searchKeywords,
        isActive: product.isActive,
        orgId,
      });
    } catch (searchError) {
      // Log but don't fail product creation if indexing fails
      logger.error('[Souq] Failed to index product', searchError as Error, { productId: product._id, fsin: product.fsin });
    }
    
    // Publish product.created event using shared NATS client
    try {
      const natsModule = await import('@/lib/nats-client') as {
        publish?: (subject: string, payload: Record<string, unknown>) => Promise<void>;
      };
      if (typeof natsModule.publish === 'function') {
        await natsModule.publish('product.created', {
          type: 'product.created',
          productId: product._id.toString(),
          fsin: product.fsin,
          orgId,
          categoryId: product.categoryId,
          brandId: product.brandId,
          title: product.title,
          price: (product as any).pricing?.basePrice || 0,  // TODO(type-safety): Verify pricing structure
          timestamp: new Date().toISOString(),
        });
      }
    } catch (natsError) {
      // Log but don't fail product creation if event publish fails
      logger.error('[Souq] Failed to publish product.created event', natsError as Error, { productId: product._id, fsin: product.fsin });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: product._id,
        fsin: product.fsin,
        title: product.title,
        categoryId: product.categoryId,
        brandId: product.brandId,
        images: product.images,
        createdAt: product.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.issues,
      }, { status: 400 });
    }

    logger.error('[Catalog API] Product creation error', error as Error, { orgId });
    return NextResponse.json({
      error: 'Failed to create product',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/souq/catalog/products
 * List products (seller-scoped or admin view)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoryId = searchParams.get('categoryId');
    const brandId = searchParams.get('brandId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status'); // 'active' | 'inactive' | 'all'

    const query: Record<string, unknown> = {};
    
    if (categoryId) query.categoryId = categoryId;
    if (brandId) query.brandId = brandId;
    if (sellerId) query.createdBy = sellerId;
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      SouqProduct.find(query)
        .select('fsin title images categoryId brandId isActive createdAt')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      SouqProduct.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    logger.error('[Catalog API] List products error', error as Error);
    return NextResponse.json({
      error: 'Failed to list products',
    }, { status: 500 });
  }
}
