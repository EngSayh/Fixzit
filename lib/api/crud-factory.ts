/**
 * CRUD Route Factory - DRY helper for API routes
 * 
 * Consolidates duplicate logic across API routes:
 * - Rate limiting
 * - Authentication & tenant context
 * - Database connection
 * - Validation (Zod schemas)
 * - Pagination
 * - Error handling
 * - Security headers
 * 
 * Usage:
 * ```typescript
 * import { createCrudHandlers } from '@/lib/api/crud-factory';
 * import { Vendor } from '@/server/models/Vendor';
 * import { createVendorSchema } from '@/lib/validations/forms';
 * 
 * export const { GET, POST } = createCrudHandlers({
 *   Model: Vendor,
 *   createSchema: createVendorSchema,
 *   entityName: 'vendor',
 *   generateCode: () => `VEN-${crypto.randomUUID().slice(0,12).toUpperCase()}`,
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { Model } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse, getClientIP } from '@/server/security/headers';

export interface CrudFactoryOptions<T = any> {
  /** Mongoose Model */
  Model: Model<T>;
  /** Zod schema for POST/create validation */
  createSchema?: ZodSchema;
  /** Zod schema for PUT/update validation (if different from create) */
  updateSchema?: ZodSchema;
  /** Entity name for logging/error messages (e.g., 'vendor', 'tenant') */
  entityName: string;
  /** Optional: Function to generate unique code (e.g., VEN-XXX) */
  generateCode?: () => string;
  /** Optional: Default sort field (default: { createdAt: -1 }) */
  defaultSort?: Record<string, 1 | -1>;
  /** Optional: Fields to allow search on */
  searchFields?: string[];
  /** Optional: Rate limit config (requests per window) */
  rateLimit?: { requests: number; windowMs: number };
  /** Optional: Custom filter builder */
  buildFilter?: (searchParams: URLSearchParams, orgId: string) => Record<string, any>;
}

/**
 * Creates GET and POST handlers with standard CRUD logic
 */
export function createCrudHandlers<T = any>(options: CrudFactoryOptions<T>) {
  const {
    Model,
    createSchema,
    entityName,
    generateCode,
    defaultSort = { createdAt: -1 },
    rateLimit: rateLimitConfig = { requests: 60, windowMs: 60_000 },
    buildFilter,
  } = options;

  /**
   * GET handler - List with pagination and filters
   */
  async function GET(req: NextRequest) {
    try {
      // Authentication
      const user = await getSessionUser(req);
      
      // Rate limiting
      const clientIp = getClientIP(req);
      const rl = rateLimit(
        `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
        rateLimitConfig.requests,
        rateLimitConfig.windowMs
      );
      if (!rl.allowed) {
        return rateLimitError();
      }

      // Tenant context check
      if (!user?.orgId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Missing tenant context' },
          { status: 401 }
        );
      }

      await connectToDatabase();

      // Parse query parameters
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, Number(searchParams.get('page')) || 1);
      const limit = Math.min(100, Number(searchParams.get('limit')) || 20);

      // Build filter
      const match: Record<string, any> = buildFilter
        ? buildFilter(searchParams, user.orgId)
        : { tenantId: user.orgId };

      // Add default tenant filter if custom builder doesn't include it
      if (!match.tenantId && !match.$and?.some((f: any) => f.tenantId)) {
        match.tenantId = user.orgId;
      }

      // Execute query with pagination
      const [items, total] = await Promise.all([
        Model.find(match)
          .sort(defaultSort as any)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Model.countDocuments(match),
      ]);

      return createSecureResponse(
        {
          items,
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        200,
        req
      );
    } catch (error: unknown) {
      const correlationId = crypto.randomUUID();
      console.error(`[GET /api/${entityName}] Error:`, {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return createSecureResponse(
        {
          error: `Failed to fetch ${entityName}s`,
          correlationId,
        },
        500,
        req
      );
    }
  }

  /**
   * POST handler - Create new entity
   */
  async function POST(req: NextRequest) {
    try {
      // Authentication
      const user = await getSessionUser(req);
      
      // Rate limiting
      const clientIp = getClientIP(req);
      const rl = rateLimit(
        `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
        rateLimitConfig.requests,
        rateLimitConfig.windowMs
      );
      if (!rl.allowed) {
        return rateLimitError();
      }

      // Tenant context check
      if (!user?.orgId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Missing tenant context' },
          { status: 401 }
        );
      }

      await connectToDatabase();

      // Parse and validate request body
      const body = await req.json();
      const data = createSchema ? createSchema.parse(body) : body;

      // Create entity
      const entity = await Model.create({
        tenantId: user.orgId,
        ...(generateCode && { code: generateCode() }),
        ...data,
        createdBy: user.id,
      });

      return createSecureResponse(entity, 201, req);
    } catch (error: unknown) {
      const correlationId = crypto.randomUUID();
      console.error(`[POST /api/${entityName}] Error:`, {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const status = error instanceof z.ZodError ? 422 : 500;
      return createSecureResponse(
        {
          error: `Failed to create ${entityName}`,
          correlationId,
          ...(error instanceof z.ZodError && { validation: error.issues }),
        },
        status,
        req
      );
    }
  }

  return { GET, POST };
}

/**
 * Creates GET, PUT, and DELETE handlers for single entity by ID
 */
export function createSingleEntityHandlers<T = any>(options: CrudFactoryOptions<T>) {
  const {
    Model,
    updateSchema,
    entityName,
    rateLimit: rateLimitConfig = { requests: 60, windowMs: 60_000 },
  } = options;

  /**
   * GET handler - Fetch single entity by ID
   */
  async function GET(req: NextRequest, context: { params: { id: string } }) {
    try {
      const user = await getSessionUser(req);
      
      const clientIp = getClientIP(req);
      const rl = rateLimit(
        `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
        rateLimitConfig.requests,
        rateLimitConfig.windowMs
      );
      if (!rl.allowed) {
        return rateLimitError();
      }

      if (!user?.orgId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Missing tenant context' },
          { status: 401 }
        );
      }

      await connectToDatabase();

      const entity = await Model.findOne({
        _id: context.params.id,
        tenantId: user.orgId,
      }).lean();

      if (!entity) {
        return NextResponse.json(
          { error: `${entityName} not found` },
          { status: 404 }
        );
      }

      return createSecureResponse(entity, 200, req);
    } catch (error: unknown) {
      const correlationId = crypto.randomUUID();
      console.error(`[GET /api/${entityName}/:id] Error:`, {
        correlationId,
        id: context.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return createSecureResponse(
        {
          error: `Failed to fetch ${entityName}`,
          correlationId,
        },
        500,
        req
      );
    }
  }

  /**
   * PUT handler - Update entity by ID
   */
  async function PUT(req: NextRequest, context: { params: { id: string } }) {
    try {
      const user = await getSessionUser(req);
      
      const clientIp = getClientIP(req);
      const rl = rateLimit(
        `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
        rateLimitConfig.requests,
        rateLimitConfig.windowMs
      );
      if (!rl.allowed) {
        return rateLimitError();
      }

      if (!user?.orgId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Missing tenant context' },
          { status: 401 }
        );
      }

      await connectToDatabase();

      const body = await req.json();
      const data = updateSchema ? updateSchema.parse(body) : body;

      const entity = await Model.findOneAndUpdate(
        {
          _id: context.params.id,
          tenantId: user.orgId,
        },
        {
          $set: {
            ...data,
            updatedBy: user.id,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      ).lean();

      if (!entity) {
        return NextResponse.json(
          { error: `${entityName} not found` },
          { status: 404 }
        );
      }

      return createSecureResponse(entity, 200, req);
    } catch (error: unknown) {
      const correlationId = crypto.randomUUID();
      console.error(`[PUT /api/${entityName}/:id] Error:`, {
        correlationId,
        id: context.params.id,
        error: error instanceof Error ? error.message : String(error),
      });

      const status = error instanceof z.ZodError ? 422 : 500;
      return createSecureResponse(
        {
          error: `Failed to update ${entityName}`,
          correlationId,
          ...(error instanceof z.ZodError && { validation: error.issues }),
        },
        status,
        req
      );
    }
  }

  /**
   * DELETE handler - Delete entity by ID
   */
  async function DELETE(req: NextRequest, context: { params: { id: string } }) {
    try {
      const user = await getSessionUser(req);
      
      const clientIp = getClientIP(req);
      const rl = rateLimit(
        `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
        rateLimitConfig.requests,
        rateLimitConfig.windowMs
      );
      if (!rl.allowed) {
        return rateLimitError();
      }

      if (!user?.orgId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Missing tenant context' },
          { status: 401 }
        );
      }

      await connectToDatabase();

      const entity = await Model.findOneAndDelete({
        _id: context.params.id,
        tenantId: user.orgId,
      }).lean();

      if (!entity) {
        return NextResponse.json(
          { error: `${entityName} not found` },
          { status: 404 }
        );
      }

      return createSecureResponse(
        { message: `${entityName} deleted successfully` },
        200,
        req
      );
    } catch (error: unknown) {
      const correlationId = crypto.randomUUID();
      console.error(`[DELETE /api/${entityName}/:id] Error:`, {
        correlationId,
        id: context.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return createSecureResponse(
        {
          error: `Failed to delete ${entityName}`,
          correlationId,
        },
        500,
        req
      );
    }
  }

  return { GET, PUT, DELETE };
}
