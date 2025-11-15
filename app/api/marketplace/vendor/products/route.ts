import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/lib/marketplace/context';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Product from '@/server/models/marketplace/Product';
import { serializeProduct } from '@/lib/marketplace/serializers';
import { objectIdFrom } from '@/lib/marketplace/objectIds';
import { rateLimit } from '@/server/security/rateLimit';
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  zodValidationError,
  rateLimitError,
  duplicateKeyError,
  handleApiError
} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const UpsertSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  sku: z.string().min(1).max(100),
  slug: z.string().min(1).max(200),
  title: z.object({ 
    en: z.string().min(1).max(500), 
    ar: z.string().max(500).optional() 
  }),
  summary: z.string().max(2000).optional(),
  buy: z.object({ 
    price: z.number().positive(), 
    currency: z.string().length(3), 
    uom: z.string().min(1).max(50) 
  }),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE')
});

/**
 * @openapi
 * /api/marketplace/vendor/products:
 *   get:
 *     summary: List vendor products
 *     description: Retrieves all products for the authenticated vendor's catalog
 *     tags: [Marketplace, Vendor, Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 500
 *         description: Maximum number of products to return
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, DRAFT, ARCHIVED]
 *         description: Filter by product status
 *     responses:
 *       200:
 *         description: List of vendor products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }
    
    // Rate limiting - read operations: 60 req/min
    const key = `marketplace:vendor-products:list:${context.orgId}`;
    const rl = rateLimit(key, 60, 60_000);
    if (!rl.allowed) return rateLimitError();
    
    // Database connection
    await connectToDatabase();

    // Build filter with tenant isolation
    const filter: Record<string, unknown> = { orgId: context.orgId };
    if (context.role === 'VENDOR') {
      filter.vendorId = context.userId;
    }

    // Query products
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    
    // Secure response
    return createSecureResponse(
      { ok: true, data: products.map((product: any) => serializeProduct(product as Record<string, unknown>)) },
      200,
      request
    );
    
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * @openapi
 * /api/marketplace/vendor/products:
 *   post:
 *     summary: Create or update vendor product
 *     description: Creates a new product or updates an existing product in the vendor's catalog. Only accessible to users with VENDOR role.
 *     tags: [Marketplace, Vendor, Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, sku, slug, title, buy]
 *             properties:
 *               _id:
 *                 type: string
 *                 format: objectId
 *                 description: Product ID for updates (omit for new products)
 *               categoryId:
 *                 type: string
 *                 format: objectId
 *                 example: "507f1f77bcf86cd799439011"
 *               sku:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "DESK-ERG-001"
 *               slug:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "ergonomic-office-desk"
 *               title:
 *                 type: object
 *                 required: [en]
 *                 properties:
 *                   en:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 500
 *                     example: "Ergonomic Office Desk"
 *                   ar:
 *                     type: string
 *                     maxLength: 500
 *                     example: "مكتب مكتبي مريح"
 *               summary:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Height-adjustable ergonomic desk with cable management"
 *               buy:
 *                 type: object
 *                 required: [price, currency, uom]
 *                 properties:
 *                   price:
 *                     type: number
 *                     minimum: 0
 *                     exclusiveMinimum: true
 *                     example: 2500.00
 *                   currency:
 *                     type: string
 *                     minLength: 3
 *                     maxLength: 3
 *                     example: "SAR"
 *                   uom:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 50
 *                     example: "unit"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, DRAFT, ARCHIVED]
 *                 default: ACTIVE
 *           example:
 *             categoryId: "507f1f77bcf86cd799439011"
 *             sku: "DESK-ERG-001"
 *             slug: "ergonomic-office-desk"
 *             title:
 *               en: "Ergonomic Office Desk"
 *               ar: "مكتب مكتبي مريح"
 *             summary: "Height-adjustable ergonomic desk with cable management"
 *             buy:
 *               price: 2500.00
 *               currency: "SAR"
 *               uom: "unit"
 *             status: "ACTIVE"
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Product not found (for updates)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Duplicate SKU or slug
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }
    
    // Authorization - only vendors can manage products
    if (context.role !== 'VENDOR') {
      return forbiddenError('Only vendors can create or update products');
    }
    
    // Rate limiting - write operations: 20 req/min
    const key = `marketplace:vendor-products:upsert:${context.orgId}`;
    const rl = rateLimit(key, 20, 60_000);
    if (!rl.allowed) return rateLimitError();

    // Input validation
    const body = await request.json();
    const payload = UpsertSchema.parse(body);
    
    // Database connection
    await connectToDatabase();

    // Prepare product data with tenant isolation
    const data = {
      orgId: context.orgId,
      vendorId: context.userId,
      categoryId: objectIdFrom(payload.categoryId),
      sku: payload.sku,
      slug: payload.slug,
      title: payload.title,
      summary: payload.summary,
      buy: payload.buy,
      status: payload.status
    };

    let product;
    let statusCode = 200;
    
    if (payload.id) {
      // Update existing product (with tenant isolation check)
      product = await Product.findOneAndUpdate(
        { 
          _id: objectIdFrom(payload.id), 
          orgId: context.orgId, 
          vendorId: context.userId 
        },
        { $set: data },
        { new: true, runValidators: true }
      );
      
      if (!product) {
        return notFoundError('Product');
      }
    } else {
      // Create new product
      product = await Product.create(data);
      statusCode = 201;
    }

    // Secure response
    return createSecureResponse(
      { ok: true, data: serializeProduct(product) },
      statusCode,
      request
    );
    
  } catch (error: unknown) {
    logger.error('Vendor product creation error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return duplicateKeyError('SKU or slug');
    }
    return handleApiError(error);
  }
}



