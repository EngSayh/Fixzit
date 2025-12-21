/**
 * GraphQL API Layer - Foundation
 *
 * This module provides a GraphQL API layer foundation.
 * It includes the SDL schema definition and resolver structure that can be
 * integrated with graphql-yoga when the dependencies are installed.
 *
 * @module lib/graphql
 * @see https://the-guild.dev/graphql/yoga-server
 *
 * To enable full GraphQL support:
 * 1. Install dependencies: pnpm add graphql graphql-yoga
 * 2. Set FEATURE_INTEGRATIONS_GRAPHQL_API=true in environment
 * 3. The /api/graphql endpoint will become active
 */

import { logger } from "@/lib/logger";
// NOTE: These imports are prepared for full GraphQL implementation (BUG-002)
// Currently disabled as GraphQL is behind FEATURE_INTEGRATIONS_GRAPHQL_API flag
import { connectToDatabase, getDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { Expense, ExpenseStatus } from "@/server/models/finance/Expense";
import { User } from "@/server/models/User";
import { Property } from "@/server/models/Property";
import { Invoice } from "@/server/models/Invoice";
import { resolveSlaTarget } from "@/lib/sla";
import { getWorkOrderStats, getPropertyCounters, getRevenueStats } from "@/lib/queries";
import { setTenantContext, clearTenantContext } from "@/server/plugins/tenantIsolation";
import { setAuditContext, clearAuditContext } from "@/server/plugins/auditPlugin";
import { verifyToken } from "@/lib/auth";
import { getSessionUser, type SessionUser } from "@/server/middleware/withAuthRbac";
import { isUnauthorizedError } from "@/server/utils/isUnauthorizedError";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { COLLECTIONS } from "@/lib/db/collections";
import crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface GraphQLContext {
  userId?: string;
  orgId?: string;
  roles?: string[];
  locale?: string;
  isAuthenticated: boolean;
}

export interface GraphQLErrorType {
  message: string;
  code?: string;
  path?: string[];
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLErrorType[];
}

export interface ResolverArgs {
  [key: string]: unknown;
}

export type ResolverFn<TResult = unknown, TArgs = ResolverArgs> = (
  parent: unknown,
  args: TArgs,
  context: GraphQLContext,
  info: unknown
) => TResult | Promise<TResult>;

// ============================================================================
// Type Definitions (SDL)
// ============================================================================

/**
 * GraphQL Schema Definition Language (SDL)
 * This defines the API contract for the GraphQL endpoint
 */
export const typeDefs = /* GraphQL */ `
  """
  ISO-8601 DateTime scalar
  """
  scalar DateTime

  """
  JSON scalar for flexible data
  """
  scalar JSON

  """
  Pagination info for list queries
  """
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
    totalCount: Int!
  }

  """
  Standard error type
  """
  type Error {
    code: String!
    message: String!
    field: String
  }

  """
  User type
  """
  type User {
    id: ID!
    email: String!
    name: String
    phone: String
    roles: [String!]!
    organizationId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Organization type
  """
  type Organization {
    id: ID!
    name: String!
    slug: String!
    type: String!
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Work Order status enum
  """
  enum WorkOrderStatus {
    OPEN
    ASSIGNED
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  """
  Work Order priority enum
  """
  enum WorkOrderPriority {
    LOW
    MEDIUM
    HIGH
    EMERGENCY
  }

  """
  Work Order type
  """
  type WorkOrder {
    id: ID!
    title: String!
    description: String
    status: WorkOrderStatus!
    priority: WorkOrderPriority!
    propertyId: String
    unitId: String
    assignedTo: String
    createdBy: String!
    organizationId: String!
    estimatedCost: Float
    actualCost: Float
    scheduledDate: DateTime
    completedDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Work Order connection (pagination)
  """
  type WorkOrderConnection {
    edges: [WorkOrderEdge!]!
    pageInfo: PageInfo!
  }

  type WorkOrderEdge {
    node: WorkOrder!
    cursor: String!
  }

  """
  Work Order filter input
  """
  input WorkOrderFilter {
    status: WorkOrderStatus
    priority: WorkOrderPriority
    propertyId: String
    assignedTo: String
    dateFrom: DateTime
    dateTo: DateTime
  }

  """
  Property type
  """
  type Property {
    id: ID!
    name: String!
    address: String!
    type: String!
    status: String!
    organizationId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    units: [Unit!]
  }

  """
  Unit type
  """
  type Unit {
    id: ID!
    number: String!
    propertyId: String!
    floor: Int
    bedrooms: Int
    bathrooms: Int
    area: Float
    status: String!
    monthlyRent: Float
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Invoice type
  """
  type Invoice {
    id: ID!
    invoiceNumber: String!
    organizationId: String!
    customerId: String
    amount: Float!
    currency: String!
    status: String!
    dueDate: DateTime!
    paidDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Dashboard stats
  """
  type DashboardStats {
    totalWorkOrders: Int!
    openWorkOrders: Int!
    completedWorkOrders: Int!
    totalProperties: Int!
    totalUnits: Int!
    occupancyRate: Float!
    revenueThisMonth: Float!
    expensesThisMonth: Float!
  }

  """
  Health check result
  """
  type HealthCheck {
    status: String!
    mongodb: String!
    redis: String
    timestamp: DateTime!
  }

  # ============================================================================
  # Queries
  # ============================================================================

  type Query {
    """
    Health check - no auth required
    """
    health: HealthCheck!

    """
    Get current user
    """
    me: User

    """
    Get organization by ID
    """
    organization(id: ID!): Organization

    """
    Get work order by ID
    """
    workOrder(id: ID!): WorkOrder

    """
    List work orders with pagination and filters
    """
    workOrders(
      first: Int = 20
      after: String
      filter: WorkOrderFilter
    ): WorkOrderConnection!

    """
    Get property by ID
    """
    property(id: ID!): Property

    """
    List properties
    """
    properties(first: Int = 20, after: String): [Property!]!

    """
    Get invoice by ID
    """
    invoice(id: ID!): Invoice

    """
    Dashboard statistics
    """
    dashboardStats: DashboardStats!
  }

  # ============================================================================
  # Mutations
  # ============================================================================

  """
  Create work order input
  """
  input CreateWorkOrderInput {
    title: String!
    description: String
    priority: WorkOrderPriority = MEDIUM
    propertyId: String
    unitId: String
    scheduledDate: DateTime
  }

  """
  Update work order input
  """
  input UpdateWorkOrderInput {
    title: String
    description: String
    status: WorkOrderStatus
    priority: WorkOrderPriority
    assignedTo: String
    scheduledDate: DateTime
    estimatedCost: Float
  }

  """
  Work order mutation result
  """
  type WorkOrderResult {
    success: Boolean!
    workOrder: WorkOrder
    errors: [Error!]
  }

  type Mutation {
    """
    Create a new work order
    """
    createWorkOrder(input: CreateWorkOrderInput!): WorkOrderResult!

    """
    Update an existing work order
    """
    updateWorkOrder(id: ID!, input: UpdateWorkOrderInput!): WorkOrderResult!

    """
    Delete a work order
    """
    deleteWorkOrder(id: ID!): WorkOrderResult!

    """
    Assign work order to a vendor
    """
    assignWorkOrder(id: ID!, vendorId: String!): WorkOrderResult!

    """
    Complete a work order
    """
    completeWorkOrder(id: ID!, notes: String, actualCost: Float): WorkOrderResult!
  }

  # ============================================================================
  # Subscriptions (future)
  # ============================================================================

  type Subscription {
    """
    Subscribe to work order updates
    """
    workOrderUpdated(organizationId: ID!): WorkOrder!
  }
`;

// ============================================================================
// Resolver Implementations
// ============================================================================

/**
 * GraphQL Error class for consistent error handling
 */
class GraphQLError extends Error {
  code: string;
  extensions: Record<string, unknown>;

  constructor(message: string, options?: { extensions?: Record<string, unknown> }) {
    super(message);
    this.name = "GraphQLError";
    this.code = (options?.extensions?.code as string) || "INTERNAL_ERROR";
    this.extensions = options?.extensions || {};
  }
}

/**
 * Require authentication - throws if not authenticated
 */
function requireAuth(ctx: GraphQLContext): void {
  if (!ctx.isAuthenticated) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }
}

const softDeleteGuard = { isDeleted: { $ne: true }, deletedAt: { $exists: false } };

function normalizeId(id?: unknown): string | undefined {
  if (!id) return undefined;
  try {
    return typeof id === "string" ? id : (id as Types.ObjectId).toString();
  } catch {
    return undefined;
  }
}

function mapPriorityToModel(priority?: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (!priority) return "MEDIUM";
  const normalized = priority.toUpperCase();
  if (normalized === "EMERGENCY") return "CRITICAL";
  if (normalized === "LOW" || normalized === "MEDIUM" || normalized === "HIGH") {
    return normalized as "LOW" | "MEDIUM" | "HIGH";
  }
  if (normalized === "URGENT" || normalized === "CRITICAL") return "CRITICAL";
  return "MEDIUM";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lean() returns dynamic types from MongoDB
function mapWorkOrderDocument(doc: Record<string, any>) {
  return {
    id: normalizeId(doc._id) ?? "",
    title: doc.title ?? doc.workOrderNumber ?? "Work Order",
    description: doc.description ?? "",
    status: doc.status ?? "DRAFT",
    priority: doc.priority ?? "MEDIUM",
    propertyId: normalizeId(doc.location?.propertyId ?? doc.propertyId),
    unitId: doc.location?.unitNumber ?? doc.unitId,
    assignedTo: normalizeId(doc.assignment?.assignedTo?.userId),
    createdBy: normalizeId(doc.createdBy),
    organizationId: normalizeId(doc.orgId),
    estimatedCost: doc.financial?.estimatedCost ?? doc.estimatedCost ?? null,
    actualCost: doc.financial?.actualCost ?? doc.actualCost ?? null,
    scheduledDate: doc.assignment?.scheduledDate?.toISOString?.() 
      ?? doc.work?.estimatedStartTime?.toISOString?.() 
      ?? null,
    completedDate: doc.work?.actualEndTime?.toISOString?.() ?? null,
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

function buildWorkOrderFilter(
  ctx: GraphQLContext,
  filter?: { status?: string; priority?: string; propertyId?: string; assignedTo?: string; dateFrom?: string; dateTo?: string },
) {
  const base: Record<string, unknown> = { ...softDeleteGuard };
  const normalizedOrg = ctx.orgId
    ? Types.ObjectId.isValid(ctx.orgId)
      ? new Types.ObjectId(ctx.orgId)
      : ctx.orgId
    : undefined;

  if (normalizedOrg) {
    base.orgId = normalizedOrg;
  }

  if (filter?.status) {
    const status = filter.status.toUpperCase();
    const statusMap: Record<string, string | string[]> = {
      OPEN: ["SUBMITTED"],
      ASSIGNED: "ASSIGNED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: ["COMPLETED", "VERIFIED", "CLOSED"],
      CANCELLED: "CANCELLED",
    };
    const mapped = statusMap[status] ?? filter.status;
    base.status = Array.isArray(mapped) ? { $in: mapped } : mapped;
  }

  if (filter?.priority) {
    base.priority = mapPriorityToModel(filter.priority);
  }

  if (filter?.propertyId) {
    base["location.propertyId"] = Types.ObjectId.isValid(filter.propertyId)
      ? new Types.ObjectId(filter.propertyId)
      : filter.propertyId;
  }

  if (filter?.assignedTo) {
    base["assignment.assignedTo.userId"] = Types.ObjectId.isValid(filter.assignedTo)
      ? new Types.ObjectId(filter.assignedTo)
      : filter.assignedTo;
  }

  if (filter?.dateFrom || filter?.dateTo) {
    const range: Record<string, Date> = {};
    if (filter.dateFrom) range.$gte = new Date(filter.dateFrom);
    if (filter.dateTo) range.$lte = new Date(filter.dateTo);
    base.createdAt = range;
  }

  return base;
}

async function buildGraphQLContext(request: Request): Promise<GraphQLContext> {
  const locale = request.headers.get("Accept-Language")?.split(",")[0] || "en";
  let sessionUser: SessionUser | null = null;

  try {
    // Use NextAuth session when available
    const nextReq = new NextRequest(request);
    sessionUser = await getSessionUser(nextReq);
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      logger.debug("[GraphQL] Failed to read session user", { error });
    }
  }

  // Fallback to bearer token if available
  if (!sessionUser) {
    const authHeader =
      request.headers.get("authorization") ?? request.headers.get("Authorization");
    const token = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        sessionUser = {
          id: payload.id,
          role: (payload.role as SessionUser["role"]) ?? "USER",
          orgId: payload.orgId,
          tenantId: payload.tenantId ?? payload.orgId,
          email: payload.email,
          name: payload.name,
          roles: payload.role ? [payload.role] : [],
          permissions: [],
          subscriptionPlan: null,
          isSuperAdmin: false,
          vendorId: undefined,
          assignedProperties: undefined,
          impersonatedOrgId: null,
          realOrgId: payload.orgId,
        };
      }
    }
  }

  return {
    isAuthenticated: Boolean(sessionUser?.id),
    userId: sessionUser?.id,
    orgId: sessionUser?.orgId ?? sessionUser?.tenantId,
    roles: sessionUser?.roles ?? (sessionUser?.role ? [sessionUser.role] : []),
    locale,
  };
}

function generateWorkOrderNumber() {
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `WO-${new Date().getFullYear()}-${uuid}`;
}

/**
 * Resolver implementations
 * These provide the business logic for GraphQL operations
 */
export const resolvers = {
  Query: {
    // Health check - no auth required
    health: async (): Promise<{
      status: string;
      mongodb: string;
      redis: string | null;
      timestamp: string;
    }> => {
      return {
        status: "ok",
        mongodb: "connected",
        redis: process.env.REDIS_URL ? "connected" : null,
        timestamp: new Date().toISOString(),
      };
    },

    // Get current user
    me: async (
      _parent: unknown,
      _args: unknown,
      ctx: GraphQLContext
    ): Promise<{
      id: string;
      email: string;
      name: string;
      roles: string[];
      organizationId: string | undefined;
      createdAt: string;
      updatedAt: string;
    } | null> => {
      if (!ctx.isAuthenticated || !ctx.userId) {
        return null;
      }

      try {
        await connectToDatabase();
        const query: Record<string, unknown> = { _id: ctx.userId };
        if (ctx.orgId) {
          query.orgId = Types.ObjectId.isValid(ctx.orgId)
            ? new Types.ObjectId(ctx.orgId)
            : ctx.orgId;
        }
        const user = await User.findOne(query)
          .select({
            _id: 1,
            email: 1,
            username: 1,
            "personal.firstName": 1,
            "personal.lastName": 1,
            "professional.role": 1,
            roles: 1,
            orgId: 1,
            createdAt: 1,
            updatedAt: 1,
          })
          .lean();

        if (!user) {
          return null;
        }

        const fullName =
          user.username ||
          [user.personal?.firstName, user.personal?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

        const resolvedRoles =
          ctx.roles && ctx.roles.length > 0
            ? ctx.roles
            : (user.professional?.role ? [user.professional.role] : user.roles ?? []);
        const orgIdValue = (user as { orgId?: Types.ObjectId | string }).orgId;

        return {
          id: normalizeId(user._id) ?? ctx.userId,
          email: user.email,
          name: fullName || "User",
          roles: resolvedRoles.filter(Boolean) as string[],
          organizationId: normalizeId(orgIdValue) ?? ctx.orgId,
          createdAt: (user.createdAt as Date | undefined)?.toISOString() ?? new Date().toISOString(),
          updatedAt: (user.updatedAt as Date | undefined)?.toISOString() ?? new Date().toISOString(),
        };
      } catch (error) {
        logger.error("[GraphQL] Failed to fetch user", { error, userId: ctx.userId });
        return null;
      }
    },

    // Work orders list
    workOrders: async (
      _parent: unknown,
      args: { first?: number; after?: string; filter?: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      const limit = Math.min(args.first ?? 20, 100);

      try {
        await connectToDatabase();

        const baseQuery = buildWorkOrderFilter(
          ctx,
          args.filter as {
            status?: string;
            priority?: string;
            propertyId?: string;
            assignedTo?: string;
            dateFrom?: string;
            dateTo?: string;
          },
        );

        const cursor =
          args.after && Types.ObjectId.isValid(args.after)
            ? new Types.ObjectId(args.after)
            : undefined;
        const query = { ...baseQuery };
        if (cursor) {
          query._id = { $lt: cursor };
        }

        logger.debug("[GraphQL] Fetching work orders", { filter: args.filter, orgId: ctx.orgId });

        // E1: Parallelize find and countDocuments for performance
        const [docs, totalCount] = await Promise.all([
          WorkOrder.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .lean(),
          WorkOrder.countDocuments(baseQuery),
        ]);
        const hasNextPage = docs.length > limit;
        const nodes = hasNextPage ? docs.slice(0, -1) : docs;
        const edges = nodes.map((doc) => {
          const mapped = mapWorkOrderDocument(doc as Record<string, unknown>);
          return {
            node: mapped,
            cursor: mapped.id,
          };
        });

        return {
          edges,
          pageInfo: {
            hasNextPage,
            hasPreviousPage: Boolean(cursor),
            startCursor: edges[0]?.cursor ?? null,
            endCursor: edges[edges.length - 1]?.cursor ?? null,
            totalCount,
          },
        };
      } catch (error) {
        logger.error("[GraphQL] Failed to fetch work orders", { error, orgId: ctx.orgId });
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: Boolean(args.after),
            startCursor: null,
            endCursor: null,
            totalCount: 0,
          },
        };
      }
    },

    // Single work order
    workOrder: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      if (!args.id || !Types.ObjectId.isValid(args.id)) {
        return null;
      }

      // SEC-FIX: Require orgId to prevent cross-tenant data access (BUG-007 fix)
      if (!ctx.orgId) {
        logger.warn("[GraphQL] workOrder: Missing orgId in context", { userId: ctx.userId, id: args.id });
        return null;
      }

      try {
        await connectToDatabase();
        setTenantContext({ orgId: ctx.orgId, userId: ctx.userId });

        const query: Record<string, unknown> = {
          _id: new Types.ObjectId(args.id),
          orgId: Types.ObjectId.isValid(ctx.orgId)
            ? new Types.ObjectId(ctx.orgId)
            : ctx.orgId,
          ...softDeleteGuard,
        };

        logger.debug("[GraphQL] Fetching work order", { id: args.id, orgId: ctx.orgId });

        const wo = await WorkOrder.findOne(query).lean();
        return wo ? mapWorkOrderDocument(wo as Record<string, unknown>) : null;
      } catch (error) {
        logger.error("[GraphQL] Failed to fetch work order", { error, id: args.id });
        return null;
      } finally {
        clearTenantContext();
      }
    },

    // Dashboard stats
    dashboardStats: async (
      _parent: unknown,
      _args: unknown,
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      // SEC-FIX: Require orgId - never fall back to userId to prevent cross-tenant data access
      if (!ctx.orgId) {
        logger.warn("[GraphQL] dashboardStats: Missing orgId in context", { userId: ctx.userId });
        return {
          totalWorkOrders: 0,
          openWorkOrders: 0,
          completedWorkOrders: 0,
          totalProperties: 0,
          totalUnits: 0,
          occupancyRate: 0,
          revenueThisMonth: 0,
          expensesThisMonth: 0,
        };
      }
      const orgId = ctx.orgId;

      try {
        await connectToDatabase();
        const normalizedOrgId = Types.ObjectId.isValid(orgId)
          ? new Types.ObjectId(orgId)
          : orgId;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [woStats, propertyCounters, revenueStats, unitsCount, expenseAgg] =
          await Promise.all([
            getWorkOrderStats(orgId),
            getPropertyCounters(orgId),
            getRevenueStats(orgId, 30),
            (async () => {
              const db = await getDatabase();
              return db.collection(COLLECTIONS.UNITS).countDocuments({
                orgId: normalizedOrgId,
                ...softDeleteGuard,
              });
            })(),
            Expense.aggregate([
              {
                $match: {
                  orgId: normalizedOrgId,
                  expenseDate: { $gte: startOfMonth },
                  status: { $in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID] },
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ["$totalAmount", "$total"] } },
                },
              },
            ]).exec(),
          ]);

        const openWorkOrders =
          (woStats?.open ?? 0) + (woStats?.inProgress ?? 0) + (woStats?.overdue ?? 0);

        return {
          totalWorkOrders: woStats?.total ?? 0,
          openWorkOrders,
          completedWorkOrders: woStats?.completed ?? 0,
          totalProperties: propertyCounters?.total ?? 0,
          totalUnits: unitsCount ?? 0,
          occupancyRate: Number(propertyCounters?.occupancyRate ?? 0),
          revenueThisMonth: revenueStats?.total ?? 0,
          expensesThisMonth: expenseAgg?.[0]?.total ?? 0,
        };
      } catch (error) {
        logger.error("[GraphQL] Failed to calculate dashboard stats", { error, orgId: ctx.orgId });
        return {
          totalWorkOrders: 0,
          openWorkOrders: 0,
          completedWorkOrders: 0,
          totalProperties: 0,
          totalUnits: 0,
          occupancyRate: 0,
          revenueThisMonth: 0,
          expensesThisMonth: 0,
        };
      }
    },

    // Organization
    organization: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      logger.debug("[GraphQL] Fetching organization", { id: args.id });
      return null;
    },

    // Property
    property: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      logger.debug("[GraphQL] Fetching property", { id: args.id });
      return null;
    },

    // Properties list
    properties: async (
      _parent: unknown,
      args: { first?: number; after?: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      
      // SEC-FIX: Require orgId to prevent cross-tenant data access
      if (!ctx.orgId) {
        logger.warn("[GraphQL] properties: Missing orgId in context", { userId: ctx.userId });
        return [];
      }
      
      try {
        await connectToDatabase();
        setTenantContext({ orgId: ctx.orgId, userId: ctx.userId });
        logger.debug("[GraphQL] Fetching properties", { first: args.first, orgId: ctx.orgId });
        
        // Fetch properties with org filter (tenant isolation plugin will add orgId filter)
        const limit = Math.min(args.first ?? 20, 100);
        const properties = await Property.find({ orgId: ctx.orgId })
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean();
        
        return properties.map((p) => ({
          id: p._id?.toString(),
          code: p.code,
          name: p.name,
          type: p.type,
          address: p.address,
        }));
      } catch (error) {
        logger.error("[GraphQL] Failed to fetch properties", { error, orgId: ctx.orgId });
        return [];
      } finally {
        clearTenantContext();
      }
    },

    // Invoice
    invoice: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      
      // SEC-FIX: Require orgId to prevent cross-tenant data access
      if (!ctx.orgId) {
        logger.warn("[GraphQL] invoice: Missing orgId in context", { userId: ctx.userId, id: args.id });
        return null;
      }
      
      if (!args.id || !Types.ObjectId.isValid(args.id)) {
        return null;
      }
      
      try {
        await connectToDatabase();
        setTenantContext({ orgId: ctx.orgId, userId: ctx.userId });
        logger.debug("[GraphQL] Fetching invoice", { id: args.id, orgId: ctx.orgId });
        
        // Fetch invoice with org filter for tenant isolation
        const invoice = await Invoice.findOne({
          _id: new Types.ObjectId(args.id),
          orgId: ctx.orgId,
        }).lean();
        
        if (!invoice) {
          logger.debug("[GraphQL] Invoice not found", { id: args.id, orgId: ctx.orgId });
          return null;
        }
        
        return {
          id: invoice._id?.toString(),
          number: invoice.number,
          type: invoice.type,
          status: invoice.status,
          issueDate: invoice.issueDate?.toISOString(),
          dueDate: invoice.dueDate?.toISOString(),
          total: invoice.total ?? 0,
          currency: invoice.currency ?? "SAR",
        };
      } catch (error) {
        logger.error("[GraphQL] Failed to fetch invoice", { error, id: args.id });
        return null;
      } finally {
        clearTenantContext();
      }
    },
  },

  Mutation: {
    // Create work order
    createWorkOrder: async (
      _parent: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      logger.info("[GraphQL] Creating work order", {
        userId: ctx.userId,
        input: args.input,
      });

      // SEC-FIX: Require orgId - never fall back to userId to prevent cross-tenant writes
      if (!ctx.orgId || !ctx.userId) {
        logger.warn("[GraphQL] createWorkOrder: Missing orgId or userId", { userId: ctx.userId, orgId: ctx.orgId });
        return {
          success: false,
          workOrder: null,
          errors: [
            {
              code: "INVALID_CONTEXT",
              message: "Organization context is required for creating work orders",
            },
          ],
        };
      }
      const orgId = ctx.orgId;

      const now = new Date();
      const priority = mapPriorityToModel(args.input?.priority as string | undefined);
      const { slaMinutes, dueAt } = resolveSlaTarget(priority, now);
      const responseMinutes = 120;

      const location =
        args.input?.propertyId || args.input?.unitId
          ? {
              propertyId: args.input?.propertyId 
                ? (Types.ObjectId.isValid(args.input.propertyId as string) 
                    ? new Types.ObjectId(args.input.propertyId as string) 
                    : undefined)
                : undefined,
              unitNumber: args.input?.unitId as string | undefined,
            }
          : undefined;

      // NOTE: Using a broad shape because create() will apply defaults and schema validation.
      const workOrderData: Record<string, unknown> = {
        orgId: Types.ObjectId.isValid(orgId) ? new Types.ObjectId(orgId) : orgId,
        workOrderNumber: generateWorkOrderNumber(),
        title: String(args.input?.title ?? "New Work Order"),
        description: (args.input?.description as string) ?? "Created via GraphQL",
        type: "MAINTENANCE",
        category: "GENERAL",
        priority,
        status: "DRAFT",
        location,
        sla: {
          responseTimeMinutes: responseMinutes,
          resolutionTimeMinutes: slaMinutes,
          responseDeadline: new Date(now.getTime() + responseMinutes * 60 * 1000),
          resolutionDeadline: dueAt,
          status: "ON_TIME" as const,
          breachReasons: [],
          escalationLevel: 0,
        },
        requester: {
          type: "STAFF" as const,
          name: (args.input?.requesterName as string) || ctx.userId || "Unknown",
          isAnonymous: false,
          userId: Types.ObjectId.isValid(ctx.userId ?? "")
            ? new Types.ObjectId(ctx.userId)
            : ctx.userId,
        },
        assignment: args.input?.scheduledDate
          ? { 
              scheduledDate: new Date(String(args.input.scheduledDate)),
              reassignmentHistory: [],
            }
          : undefined,
        createdBy: ctx.userId as unknown as Types.ObjectId,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await connectToDatabase();
        setTenantContext({ orgId, userId: ctx.userId });
        setAuditContext({ userId: ctx.userId, timestamp: now });

        const created = await WorkOrder.create(
          workOrderData as Record<string, unknown>,
        );
        const mapped = mapWorkOrderDocument(created.toObject() as Record<string, unknown>);

        return {
          success: true,
          workOrder: mapped,
          errors: [],
        };
      } catch (error) {
        logger.error("[GraphQL] Failed to create work order", { error, userId: ctx.userId });
        return {
          success: false,
          workOrder: null,
          errors: [
            {
              code: "CREATE_FAILED",
              message:
                error instanceof Error ? error.message : "Work order creation via GraphQL failed",
            },
          ],
        };
      } finally {
        clearTenantContext();
        clearAuditContext();
      }
    },

    // Update work order
    updateWorkOrder: async (
      _parent: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      logger.info("[GraphQL] Updating work order", {
        userId: ctx.userId,
        id: args.id,
        input: args.input,
      });

      return {
        success: false,
        workOrder: null,
        errors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "Work order update via GraphQL is not yet implemented",
          },
        ],
      };
    },

    // Delete work order
    deleteWorkOrder: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      logger.info("[GraphQL] Deleting work order", {
        userId: ctx.userId,
        id: args.id,
      });

      return {
        success: false,
        errors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "Work order deletion via GraphQL is not yet implemented",
          },
        ],
      };
    },

    // Assign work order
    assignWorkOrder: async (
      _parent: unknown,
      args: { id: string; vendorId: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      logger.info("[GraphQL] Assigning work order", {
        userId: ctx.userId,
        workOrderId: args.id,
        vendorId: args.vendorId,
      });

      return {
        success: false,
        errors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "Work order assignment via GraphQL is not yet implemented",
          },
        ],
      };
    },

    // Complete work order
    completeWorkOrder: async (
      _parent: unknown,
      args: { id: string; notes?: string; actualCost?: number },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      logger.info("[GraphQL] Completing work order", {
        userId: ctx.userId,
        id: args.id,
        notes: args.notes,
        actualCost: args.actualCost,
      });

      return {
        success: false,
        errors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "Work order completion via GraphQL is not yet implemented",
          },
        ],
      };
    },
  },
};

// ============================================================================
// GraphQL Handler (Stub until graphql-yoga is installed)
// ============================================================================

/**
 * Check if GraphQL dependencies are available
 */
export function isGraphQLAvailable(): boolean {
  try {
    // Check if graphql-yoga is installed
    // Use dynamic string to prevent webpack from trying to resolve at build time
    const moduleName = "graphql" + "-yoga";
    require.resolve(moduleName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a GraphQL handler
 *
 * Returns a stub handler if graphql-yoga is not installed.
 * To enable full support:
 * 1. pnpm add graphql graphql-yoga
 * 2. Set FEATURE_INTEGRATIONS_GRAPHQL_API=true
 *
 * @example
 * // In app/api/graphql/route.ts
 * import { createGraphQLHandler } from '@/lib/graphql';
 * const { handleRequest } = createGraphQLHandler();
 * export { handleRequest as GET, handleRequest as POST };
 */
export function createGraphQLHandler() {
  // Stub handler when graphql-yoga is not installed
  const handleRequest = async (request: Request): Promise<Response> => {
    const isEnabled = process.env.FEATURE_INTEGRATIONS_GRAPHQL_API === "true";

    if (!isEnabled) {
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: "GraphQL API is disabled. Set FEATURE_INTEGRATIONS_GRAPHQL_API=true to enable.",
              code: "FEATURE_DISABLED",
            },
          ],
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!isGraphQLAvailable()) {
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: "GraphQL dependencies not installed. Run: pnpm add graphql graphql-yoga",
              code: "DEPENDENCIES_MISSING",
            },
          ],
        }),
        {
          status: 501,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // If we get here, graphql-yoga should be available
    // Dynamic import to avoid build errors when not installed
    try {
      // Use dynamic string to prevent webpack from trying to resolve at build time
      const moduleName = "graphql" + "-yoga";
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const graphqlYoga = require(moduleName) as {
        createYoga: (config: unknown) => { fetch: (req: Request) => Promise<Response> };
        createSchema: (config: { typeDefs: string; resolvers: unknown }) => unknown;
      };
      const { createYoga, createSchema } = graphqlYoga;

      const yoga = createYoga({
        schema: createSchema({
          typeDefs,
          resolvers,
        }),
        graphqlEndpoint: "/api/graphql",
        fetchAPI: { Response },
        context: async (): Promise<GraphQLContext> => buildGraphQLContext(request),
        graphiql: process.env.NODE_ENV === "development",
      });

      return yoga.fetch(request);
    } catch (error) {
      logger.error("[GraphQL] Failed to initialize yoga", { error });
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: "Failed to initialize GraphQL server",
              code: "INITIALIZATION_ERROR",
            },
          ],
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  return {
    handleRequest,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { GraphQLError };

export default {
  typeDefs,
  resolvers,
  createGraphQLHandler,
  isGraphQLAvailable,
};
