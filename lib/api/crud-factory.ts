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

import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { z, ZodSchema } from "zod";
import { SortOrder, Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse, getClientIP } from "@/server/security/headers";
import type { MModel } from "@/types/mongoose-compat";

/**
 * SEC-006 FIX: Validate MongoDB ObjectId format to prevent IDOR attacks
 * Rejects query operators like { $or: [...] } that could bypass tenant isolation
 */
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

/**
 * Escapes special regex characters to prevent ReDoS (Regular Expression Denial of Service) attacks
 * @param str - User input string to escape
 * @returns Escaped string safe for use in MongoDB $regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface CrudFactoryOptions<T = unknown> {
  /** Mongoose Model */
  Model: MModel<T>;
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
  buildFilter?: (
    searchParams: URLSearchParams,
    orgId: string,
  ) => Record<string, unknown>;
  /** Optional: Hook to transform data before creation (e.g., add SLA, init state) */
  onCreate?: (
    data: Record<string, unknown>,
    user: { id: string; orgId: string; role: string },
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Optional: Hook to transform data before update (consumer calls manually) */
  onUpdate?: (
    id: string,
    updates: Record<string, unknown>,
    user: { id: string; orgId: string; role: string },
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * Creates GET and POST handlers with standard CRUD logic
 */
export function createCrudHandlers<T = unknown>(
  options: CrudFactoryOptions<T>,
) {
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
    let user;
    try {
      user = await getSessionUser(req);
    } catch (_error) {
      const correlationId = crypto.randomUUID();
      logger.warn("Unauthenticated request to GET endpoint", {
        path: req.url,
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Authentication required",
          correlationId,
        },
        401,
        req,
      );
    }

    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Missing tenant context",
          correlationId,
        },
        401,
        req,
      );
    }

    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = rateLimit(
      `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
      rateLimitConfig.requests,
      rateLimitConfig.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Parse query parameters early (used for offline short-circuit)
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const query = searchParams.get("q") || searchParams.get("search") || "";

    // OFFLINE MODE: Avoid MongoDB entirely to prevent 500s in CI/offline runs
    if (process.env.ALLOW_OFFLINE_MONGODB === "true") {
      return createSecureResponse(
        {
          items: [],
          page,
          limit,
          total: 0,
          pages: 0,
        },
        200,
        req,
      );
    }

    try {
      await connectToDatabase();

      // Build base filter
      const match: Record<string, unknown> = buildFilter
        ? buildFilter(searchParams, user.orgId)
        : {};

      // RBAC: Super Admin can access all tenants, others are scoped to their org_id
      if (user.role !== "SUPER_ADMIN") {
        match.orgId = user.orgId;
      }

      // Implement search functionality
      if (query && options.searchFields && options.searchFields.length > 0) {
        const escapedQuery = escapeRegex(query);
        const searchOr = options.searchFields.map((field) => ({
          [field]: { $regex: escapedQuery, $options: "i" },
        }));

        // If buildFilter already set $or, combine with $and to avoid overwriting
        if (match.$or) {
          const existingOr = match.$or;
          delete match.$or;
          match.$and = [{ $or: existingOr }, { $or: searchOr }];
        } else {
          match.$or = searchOr;
        }
      }

      // Execute query with pagination
      const itemsQuery = Model.find(match)
        .sort(defaultSort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<T>();

      const [items, total] = await Promise.all([
        itemsQuery,
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
        req,
        {
          // Add caching headers for better performance
          "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
          "CDN-Cache-Control": "max-age=60",
        },
      );
    } catch (_error: unknown) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      const correlationId = crypto.randomUUID();
      logger.error(`[DELETE /api/${entityName}/:id] Error:`, {
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
        req,
      );
    }
  }

  /**
   * POST handler - Create new entity
   */
  async function POST(req: NextRequest) {
    // Authentication (MUST be outside try block to properly return 401)
    let user;
    try {
      user = await getSessionUser(req);
    } catch (_error) {
      const correlationId = crypto.randomUUID();
      logger.warn("Unauthenticated request to POST endpoint", {
        path: req.url,
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Authentication required",
          correlationId,
        },
        401,
        req,
      );
    }

    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Missing tenant context",
          correlationId,
        },
        401,
        req,
      );
    }

    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = rateLimit(
      `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
      rateLimitConfig.requests,
      rateLimitConfig.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    // OFFLINE MODE: Reject mutations gracefully to avoid 500s in CI/offline runs
    if (process.env.ALLOW_OFFLINE_MONGODB === "true") {
      return createSecureResponse(
        {
          error: "ServiceUnavailable",
          message:
            "Data mutations are disabled in ALLOW_OFFLINE_MONGODB mode. Provide MongoDB or disable offline mode.",
        },
        503,
        req,
      );
    }

    try {
      await connectToDatabase();

      // Parse and validate request body
      const body = await req.json();
      const data = createSchema ? createSchema.parse(body) : body;

      // Security: Strip tenant-scoping and audit fields from client payload to prevent mass assignment
      delete data.org_id;
      delete data.orgId;
      delete data.tenantId;
      delete data.createdBy;
      delete data.updatedBy;

      // Prepare entity data
      let entityData = {
        orgId: user.orgId,
        ...(generateCode && { code: generateCode() }),
        ...data,
        createdBy: user.id,
      };

      // Apply onCreate hook if provided
      if (onCreate) {
        try {
          entityData = await onCreate(entityData, user);
        } catch (hookError: unknown) {
          const correlationId = crypto.randomUUID();
          logger.error(`[POST /api/${entityName}] onCreate hook error:`, {
            correlationId,
            userId: user.id,
            orgId: user.orgId,
            role: user.role,
            timestamp: new Date().toISOString(),
            error:
              hookError instanceof Error
                ? hookError.message
                : String(hookError),
            stack: hookError instanceof Error ? hookError.stack : undefined,
          });

          throw new Error(
            `onCreate hook failed: ${hookError instanceof Error ? hookError.message : String(hookError)}`,
          );
        }
      }

      // Create entity
      const entity = await Model.create(entityData);

      return createSecureResponse(entity, 201, req);
    } catch (_error: unknown) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      const correlationId = crypto.randomUUID();
      logger.error(`[POST /api/${entityName}] Error:`, {
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
        req,
      );
    }
  }

  return { GET, POST };
}

/**
 * Creates GET, PUT, and DELETE handlers for single entity by ID
 */
export function createSingleEntityHandlers<T = unknown>(
  options: CrudFactoryOptions<T>,
) {
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
    // SEC-006 FIX: Validate ObjectId format to prevent IDOR via query operators
    const entityId = context.params.id;
    if (!isValidObjectId(entityId)) {
      const correlationId = crypto.randomUUID();
      logger.warn("Invalid ObjectId format in GET request", {
        path: req.url,
        providedId: entityId?.slice(0, 50), // Truncate for safety
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Invalid ID format",
          correlationId,
        },
        400,
        req,
      );
    }

    // Authentication (MUST be outside try block to properly return 401)
    let user;
    try {
      user = await getSessionUser(req);
    } catch (_error) {
      const correlationId = crypto.randomUUID();
      logger.warn("Unauthenticated request to GET by ID endpoint", {
        path: req.url,
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Authentication required",
          correlationId,
        },
        401,
        req,
      );
    }

    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Missing tenant context",
          correlationId,
        },
        401,
        req,
      );
    }

    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = rateLimit(
      `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
      rateLimitConfig.requests,
      rateLimitConfig.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    try {
      await connectToDatabase();

      // SEC-006 FIX: Use validated ObjectId to prevent query injection
      const query: Record<string, unknown> = { _id: new Types.ObjectId(entityId) };
      if (user.role !== "SUPER_ADMIN") {
        query.orgId = user.orgId;
      }

      const entity = await Model.findOne(query).lean<T | null>();

      if (!entity) {
        const correlationId = crypto.randomUUID();
        return createSecureResponse(
          { error: `${entityName} not found`, correlationId },
          404,
          req,
        );
      }

      return createSecureResponse(entity, 200, req);
    } catch (_error: unknown) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      const correlationId = crypto.randomUUID();
      logger.error(`[GET /api/${entityName}/:id] Error:`, {
        correlationId,
        id: entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      return createSecureResponse(
        {
          error: `Failed to fetch ${entityName}`,
          correlationId,
        },
        500,
        req,
      );
    }
  }

  /**
   * PUT handler - Update entity by ID
   */
  async function PUT(req: NextRequest, context: { params: { id: string } }) {
    // SEC-006 FIX: Validate ObjectId format to prevent IDOR via query operators
    const entityId = context.params.id;
    if (!isValidObjectId(entityId)) {
      const correlationId = crypto.randomUUID();
      logger.warn("Invalid ObjectId format in PUT request", {
        path: req.url,
        providedId: entityId?.slice(0, 50),
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Invalid ID format",
          correlationId,
        },
        400,
        req,
      );
    }

    // Authentication (MUST be outside try block to properly return 401)
    let user;
    try {
      user = await getSessionUser(req);
    } catch (_error) {
      const correlationId = crypto.randomUUID();
      logger.warn("Unauthenticated request to PUT endpoint", {
        path: req.url,
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Authentication required",
          correlationId,
        },
        401,
        req,
      );
    }

    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Missing tenant context",
          correlationId,
        },
        401,
        req,
      );
    }

    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = rateLimit(
      `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
      rateLimitConfig.requests,
      rateLimitConfig.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    try {
      await connectToDatabase();

      const body = await req.json();
      const data = updateSchema ? updateSchema.parse(body) : body;

      // Security: Strip tenant-scoping and audit fields from client payload to prevent mass assignment
      delete data.org_id;
      delete data.orgId;
      delete data.tenantId;
      delete data.createdBy;
      delete data.updatedBy;

      // SEC-006 FIX: Use validated ObjectId to prevent query injection
      const query: Record<string, unknown> = { _id: new Types.ObjectId(entityId) };
      if (user.role !== "SUPER_ADMIN") {
        query.orgId = user.orgId;
      }

      const entity = await Model.findOneAndUpdate(
        query,
        {
          $set: {
            ...data,
            updatedBy: user.id,
            // updatedAt is handled automatically by Mongoose timestamps: true
          },
        },
        { new: true, runValidators: true },
      ).lean<T | null>();

      if (!entity) {
        const correlationId = crypto.randomUUID();
        return createSecureResponse(
          { error: `${entityName} not found`, correlationId },
          404,
          req,
        );
      }

      return createSecureResponse(entity, 200, req);
    } catch (_error: unknown) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      const correlationId = crypto.randomUUID();
      logger.error(`[PUT /api/${entityName}/:id] Error:`, {
        correlationId,
        id: entityId,
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
        req,
      );
    }
  }

  /**
   * DELETE handler - Delete entity by ID
   */
  async function DELETE(req: NextRequest, context: { params: { id: string } }) {
    // SEC-006 FIX: Validate ObjectId format to prevent IDOR via query operators
    const entityId = context.params.id;
    if (!isValidObjectId(entityId)) {
      const correlationId = crypto.randomUUID();
      logger.warn("Invalid ObjectId format in DELETE request", {
        path: req.url,
        providedId: entityId?.slice(0, 50),
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Invalid ID format",
          correlationId,
        },
        400,
        req,
      );
    }

    // Authentication (MUST be outside try block to properly return 401)
    let user;
    try {
      user = await getSessionUser(req);
    } catch (_error) {
      const correlationId = crypto.randomUUID();
      logger.warn("Unauthenticated request to DELETE endpoint", {
        path: req.url,
        correlationId,
      });
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Authentication required",
          correlationId,
        },
        401,
        req,
      );
    }

    // Tenant context check
    if (!user?.orgId) {
      const correlationId = crypto.randomUUID();
      return createSecureResponse(
        {
          error: "Unauthorized",
          message: "Missing tenant context",
          correlationId,
        },
        401,
        req,
      );
    }

    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = rateLimit(
      `${new URL(req.url).pathname}:${user.id}:${clientIp}`,
      rateLimitConfig.requests,
      rateLimitConfig.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    try {
      await connectToDatabase();

      // SEC-006 FIX: Use validated ObjectId to prevent query injection
      const query: Record<string, unknown> = { _id: new Types.ObjectId(entityId) };
      if (user.role !== "SUPER_ADMIN") {
        query.orgId = user.orgId;
      }

      const entity = await Model.findOneAndDelete(query).lean<T | null>();

      if (!entity) {
        const correlationId = crypto.randomUUID();
        return createSecureResponse(
          { error: `${entityName} not found`, correlationId },
          404,
          req,
        );
      }

      return createSecureResponse(
        { message: `${entityName} deleted successfully` },
        200,
        req,
      );
    } catch (_error: unknown) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      const correlationId = crypto.randomUUID();
      logger.error(`[DELETE /api/${entityName}/:id] Error:`, {
        correlationId,
        id: entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      return createSecureResponse(
        {
          error: `Failed to delete ${entityName}`,
          correlationId,
        },
        500,
        req,
      );
    }
  }

  return { GET, PUT, DELETE };
}
