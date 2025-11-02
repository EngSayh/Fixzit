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

import { NextRequest } from 'next/server';
import { z, ZodSchema } from 'zod';
import { Model, SortOrder } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { createSecureResponse, getClientIP } from '@/server/security/headers';

/**
 * Escapes special regex characters to prevent ReDoS (Regular Expression Denial of Service) attacks
 * @param str - User input string to escape
 * @returns Escaped string safe for use in MongoDB $regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface CrudFactoryOptions<T = unknown> {
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
  defaultSort?: Record<string, SortOrder>;
  /** Optional: Fields to allow search on */
  searchFields?: string[];
  /** Optional: Rate limit config (requests per window) */
  rateLimit?: { requests: number; windowMs: number };
  /** Optional: Custom filter builder */
  buildFilter?: (searchParams: URLSearchParams, orgId: string) => Record<string, unknown>;
  /** Optional: Hook to transform data before creation (e.g., add SLA, init state) */
  onCreate?: (data: Record<string, unknown>, user: { id: string; orgId: string; role: string }) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * Creates GET and POST handlers with standard CRUD logic
 */
export function createCrudHandlers<T = unknown>(options: CrudFactoryOptions<T>) {
  const {
    Model,
    createSchema,
    entityName,
    generateCode,
    defaultSort = { createdAt: -1 },
    rateLimit: rateLimitConfig = { requests: 60, windowMs: 60_000 },
    buildFilter,
    onCreate,
  } = options;

  /**
   * GET handler - List with pagination and filters
   */
  async function GET(req: NextRequest) {
    // Authentication (MUST be outside try block to properly return 401)
    const user = await getSessionUser(req);
    
    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        { error: 'Unauthorized', message: 'Missing tenant context', correlationId },
        401,
        req
      );
    }

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

    try {
      await connectToDatabase();

      // Parse query parameters
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, Number(searchParams.get('page')) || 1);
      const limit = Math.min(100, Number(searchParams.get('limit')) || 20);
      const query = searchParams.get('q') || searchParams.get('search') || '';

      // Build base filter
      const match: Record<string, unknown> = buildFilter
        ? buildFilter(searchParams, user.orgId)
        : {};

      // RBAC: Super Admin can access all tenants, others are scoped to their orgId
      if (user.role !== 'SUPER_ADMIN') {
        match.tenantId = user.orgId;
      }

      // Implement search functionality
      if (query && options.searchFields && options.searchFields.length > 0) {
        const escapedQuery = escapeRegex(query);
        match.$or = options.searchFields.map(field => ({
          [field]: { $regex: escapedQuery, $options: 'i' }
        }));
      }

      // Execute query with pagination
      const [items, total] = await Promise.all([
        Model.find(match)
          .sort(defaultSort)
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
    // Authentication (MUST be outside try block to properly return 401)
    const user = await getSessionUser(req);
    
    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        { error: 'Unauthorized', message: 'Missing tenant context', correlationId },
        401,
        req
      );
    }

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

    try {
      await connectToDatabase();

      // Parse and validate request body
      const body = await req.json();
      const data = createSchema ? createSchema.parse(body) : body;

      // Prepare entity data
      let entityData = {
        tenantId: user.orgId,
        ...(generateCode && { code: generateCode() }),
        ...data,
        createdBy: user.id,
      };

      // Apply onCreate hook if provided
      if (onCreate) {
        entityData = await onCreate(entityData, user);
      }

      // Create entity
      const entity = await Model.create(entityData);

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
export function createSingleEntityHandlers<T = unknown>(options: CrudFactoryOptions<T>) {
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
    // Authentication (MUST be outside try block to properly return 401)
    const user = await getSessionUser(req);
    
    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        { error: 'Unauthorized', message: 'Missing tenant context', correlationId },
        401,
        req
      );
    }

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

    try {
      await connectToDatabase();

      // Build query: Super Admin can access all tenants
      const query: Record<string, unknown> = { _id: context.params.id };
      if (user.role !== 'SUPER_ADMIN') {
        query.tenantId = user.orgId;
      }

      const entity = await Model.findOne(query).lean();

      if (!entity) {
        const correlationId = crypto.randomUUID();
        return createSecureResponse(
          { error: `${entityName} not found`, correlationId },
          404,
          req
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
    // Authentication (MUST be outside try block to properly return 401)
    const user = await getSessionUser(req);
    
    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        { error: 'Unauthorized', message: 'Missing tenant context', correlationId },
        401,
        req
      );
    }

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

    try {
      await connectToDatabase();

      const body = await req.json();
      const data = updateSchema ? updateSchema.parse(body) : body;

      // Build query: Super Admin can update any tenant's entity
      const query: Record<string, unknown> = { _id: context.params.id };
      if (user.role !== 'SUPER_ADMIN') {
        query.tenantId = user.orgId;
      }

      const entity = await Model.findOneAndUpdate(
        query,
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
        const correlationId = crypto.randomUUID();
        return createSecureResponse(
          { error: `${entityName} not found`, correlationId },
          404,
          req
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
    // Authentication (MUST be outside try block to properly return 401)
    const user = await getSessionUser(req);
    
    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        { error: 'Unauthorized', message: 'Missing tenant context', correlationId },
        401,
        req
      );
    }

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

    try {
      await connectToDatabase();

      // Build query: Super Admin can delete any tenant's entity
      const query: Record<string, unknown> = { _id: context.params.id };
      if (user.role !== 'SUPER_ADMIN') {
        query.tenantId = user.orgId;
      }

      const entity = await Model.findOneAndDelete(query).lean();

      if (!entity) {
        const correlationId = crypto.randomUUID();
        return createSecureResponse(
          { error: `${entityName} not found`, correlationId },
          404,
          req
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
