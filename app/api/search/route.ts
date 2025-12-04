import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import {
  APPS,
  AppKey,
  DEFAULT_SCOPE,
  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY,
  getSearchEntitiesForScope,
} from "@/config/topbar-modules";
import type { ModuleScope, SearchEntity } from "@/config/topbar-modules";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import {
  getSessionUser,
  UnauthorizedError,
  type SessionUser,
} from "@/server/middleware/withAuthRbac";
import { ObjectId } from "mongodb";
import { UserRole, type UserRoleType } from "@/types/user";

// ============================================================================
// SEARCH RBAC CONFIGURATION - SEC-002
// ============================================================================
// Each search entity requires specific permissions to query.
// Users can only search entities they have read access to.
// This prevents lateral data discovery across modules (e.g., regular user
// searching finance invoices or admin-only data).
// ============================================================================

/**
 * Entity-to-permission mapping for search RBAC
 * Format: entity -> required permission key
 */
const SEARCH_ENTITY_PERMISSIONS: Partial<Record<SearchEntity, string>> = {
  [WORK_ORDERS_ENTITY]: "wo.read",
  [WORK_ORDERS_ENTITY_LEGACY]: "wo.read", // legacy alias (normalized later)
  properties: "properties.read",
  units: "properties.read", // Units are sub-entities of properties
  tenants: "tenants.read",
  vendors: "vendors.read",
  invoices: "finance.invoices.read",
  products: "souq.products.read",
  services: "souq.services.read",
  rfqs: "souq.rfq.read",
  orders: "souq.orders.read",
  listings: "aqar.listings.read",
  projects: "aqar.projects.read",
  agents: "aqar.agents.read",
};
/**
 * Roles that have access to each permission
 * STRICT v4.1: Based on 14-role matrix + sub-roles from types/user.ts
 * Includes CORPORATE_OWNER, HR_OFFICER, SUPPORT_AGENT where applicable
 */
const PERMISSION_ROLES: Record<string, readonly UserRoleType[]> = {
  // Work Orders - FM core functionality
  "wo.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.TEAM_MEMBER,
    UserRole.TECHNICIAN,
    UserRole.VENDOR,
    UserRole.OWNER,
    UserRole.TENANT,
    UserRole.SUPPORT_AGENT, // Support needs WO visibility for ticket correlation
  ],
  // Properties & Units - add CORPORATE_OWNER and TENANT (scoped via applyEntityScope)
  "properties.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.TEAM_MEMBER,
    UserRole.OWNER,
    UserRole.TENANT, // Tenants can view properties their units belong to (scoped)
  ],
  // Tenants (lease tenants) - add HR_OFFICER for people data access
  "tenants.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.SUPPORT_AGENT,
    UserRole.HR, // HR needs tenant/people data
    UserRole.HR_OFFICER, // HR sub-role for PII access
  ],
  // Vendors - add CORPORATE_OWNER and PROPERTY_MANAGER
  "vendors.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.VENDOR, // Vendors see only their own record (scoped)
  ],
  // Finance - Invoices (restricted) - add CORPORATE_OWNER
  "finance.invoices.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.PROCUREMENT,
    UserRole.AUDITOR,
  ],
  // Souq - Products - add CORPORATE_OWNER and PROPERTY_MANAGER
  "souq.products.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.VENDOR, // Vendors see only their own products (scoped)
  ],
  // Souq - Services - add CORPORATE_OWNER and PROPERTY_MANAGER
  "souq.services.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.VENDOR, // Vendors see only their own services (scoped)
  ],
  // Souq - RFQs - add CORPORATE_OWNER
  "souq.rfq.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.VENDOR, // Vendors can see RFQs they've been invited to
  ],
  // Souq - Orders - add CORPORATE_OWNER and VENDOR
  "souq.orders.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.VENDOR, // Vendors see only their own orders (scoped)
  ],
  // Aqar - Listings - add CORPORATE_OWNER
  "aqar.listings.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.OWNER, // Owners see only their assigned properties (scoped)
    UserRole.VENDOR, // Vendors see only their own listings (scoped)
  ],
  // Aqar - Projects - add CORPORATE_OWNER
  "aqar.projects.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.OWNER, // Owners see only their assigned projects (scoped)
  ],
  // Aqar - Agents - add CORPORATE_OWNER and SUPPORT_AGENT
  "aqar.agents.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.OWNER,
    UserRole.SUPPORT_AGENT, // Support needs agent visibility for CRM
  ],
};

// Text-search-ready entities (must have a text index). Exported for regression tests.
export const TEXT_INDEXED_ENTITIES = new Set<SearchEntity>([
  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY,
  "properties",
  "units",
  "tenants",
  "vendors",
  "invoices",
  "products",
  "services",
  "rfqs",
  "orders",
  "listings",
  "projects",
  "agents",
]);

// Entity -> collection name map for text search; keeps coverage and testability aligned with COLLECTIONS.
export const ENTITY_COLLECTION_MAP = {
  [WORK_ORDERS_ENTITY]: COLLECTIONS.WORK_ORDERS,
  [WORK_ORDERS_ENTITY_LEGACY]: COLLECTIONS.WORK_ORDERS, // legacy alias
  properties: COLLECTIONS.PROPERTIES,
  units: COLLECTIONS.UNITS,
  tenants: COLLECTIONS.TENANTS,
  vendors: COLLECTIONS.VENDORS,
  invoices: COLLECTIONS.INVOICES,
  products: COLLECTIONS.PRODUCTS,
  services: COLLECTIONS.SERVICES,
  rfqs: COLLECTIONS.RFQS,
  orders: COLLECTIONS.ORDERS,
  listings: COLLECTIONS.SOUQ_LISTINGS,
  projects: COLLECTIONS.PROJECTS,
  agents: COLLECTIONS.AGENTS,
} as Record<SearchEntity, string | undefined>;

// Normalize legacy entity names to canonical form
const normalizeEntity = (entity: string): SearchEntity =>
  entity === WORK_ORDERS_ENTITY_LEGACY ? WORK_ORDERS_ENTITY : (entity as SearchEntity);

// Evaluate whether the requester can search a given entity
export function canSearchEntity(session: SessionUser, entity: SearchEntity): boolean {
  if (session.isSuperAdmin) return true;

  const permission = SEARCH_ENTITY_PERMISSIONS[entity];
  if (!permission) {
    logger.warn("[search] Unknown entity requested", { entity });
    return false;
  }

  const perms = session.permissions || [];
  if (perms.includes("*") || perms.includes(permission)) {
    return true;
  }

  const allowedRoles = PERMISSION_ROLES[permission];
  if (!allowedRoles) {
    logger.warn("[search] No roles configured for permission", { permission, entity });
    return false;
  }

  const normalizedRoles = new Set<string>();
  const primaryRole = session.role?.toUpperCase();
  if (primaryRole) normalizedRoles.add(primaryRole);
  (session.roles || []).forEach((role) => normalizedRoles.add(String(role).toUpperCase()));

  return allowedRoles.some((role) => normalizedRoles.has(role));
}

// Helpers for per-role scoping
const hasRole = (session: SessionUser, role: UserRoleType): boolean => {
  if (!role) return false;
  const target = role.toUpperCase();
  const primary = session.role?.toUpperCase();
  if (primary === target) return true;
  return (session.roles || []).some((r) => String(r).toUpperCase() === target);
};

const toObjectIds = (ids?: string[]) =>
  (ids || []).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

type ScopedQueryResult = { allowed: boolean; query: Record<string, unknown> };

export function applyEntityScope(
  entity: SearchEntity,
  session: SessionUser,
  baseQuery: Record<string, unknown>,
): ScopedQueryResult {
  // Broad roles keep base org scoping
  const isSuperUser =
    session.isSuperAdmin ||
    hasRole(session, UserRole.SUPER_ADMIN) ||
    hasRole(session, UserRole.CORPORATE_ADMIN) ||
    hasRole(session, UserRole.ADMIN) ||
    hasRole(session, UserRole.MANAGER) ||
    hasRole(session, UserRole.FM_MANAGER) ||
    hasRole(session, UserRole.OPERATIONS_MANAGER);

  if (isSuperUser) {
    return { allowed: true, query: baseQuery };
  }

  const scopedQuery = { ...baseQuery };

  switch (entity) {
    case WORK_ORDERS_ENTITY: {
      // Tenants limited to their own requests (by requester.userId)
      if (hasRole(session, UserRole.TENANT)) {
        if (!ObjectId.isValid(session.id)) return { allowed: false, query: scopedQuery };
        scopedQuery["requester.userId"] = new ObjectId(session.id);
      }
      // Technicians limited to assignments
      if (hasRole(session, UserRole.TECHNICIAN)) {
        if (!ObjectId.isValid(session.id)) return { allowed: false, query: scopedQuery };
        scopedQuery["assignment.assignedTo.userId"] = new ObjectId(session.id);
      }
      // Vendors limited to their vendor assignments
      if (hasRole(session, UserRole.VENDOR)) {
        if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["assignment.assignedTo.vendorId"] = new ObjectId(session.vendorId);
      }
      // Owners limited to owned/managed properties - require assignment
      if (hasRole(session, UserRole.OWNER)) {
        if (!session.assignedProperties?.length) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["location.propertyId"] = {
          $in: toObjectIds(session.assignedProperties),
        };
      }
      return { allowed: true, query: scopedQuery };
    }
    case "properties": {
      if (hasRole(session, UserRole.OWNER)) {
        if (!session.assignedProperties?.length) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["_id"] = { $in: toObjectIds(session.assignedProperties) };
      }
      if (hasRole(session, UserRole.TENANT)) {
        if (!session.units?.length) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["units.unitId"] = { $in: toObjectIds(session.units) };
      }
      return { allowed: true, query: scopedQuery };
    }
    case "units": {
      if (hasRole(session, UserRole.TENANT)) {
        if (!session.units?.length) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["_id"] = { $in: toObjectIds(session.units) };
      }
      if (hasRole(session, UserRole.OWNER)) {
        if (!session.assignedProperties?.length) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["propertyId"] = { $in: toObjectIds(session.assignedProperties) };
      }
      return { allowed: true, query: scopedQuery };
    }
    case "tenants": {
      if (hasRole(session, UserRole.TENANT)) {
        if (!session.tenantId || !ObjectId.isValid(session.tenantId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["_id"] = new ObjectId(session.tenantId);
      }
      return { allowed: true, query: scopedQuery };
    }
    case "vendors": {
      if (hasRole(session, UserRole.VENDOR)) {
        if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["_id"] = new ObjectId(session.vendorId);
      }
      return { allowed: true, query: scopedQuery };
    }
    case "orders": {
      if (hasRole(session, UserRole.VENDOR)) {
        if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["vendorId"] = new ObjectId(session.vendorId);
      }
      return { allowed: true, query: scopedQuery };
    }
    case "products":
    case "services":
    case "listings": {
      if (hasRole(session, UserRole.VENDOR)) {
        if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["vendorId"] = new ObjectId(session.vendorId);
      }
      return { allowed: true, query: scopedQuery };
    }
    default:
      return { allowed: true, query: scopedQuery };
  }
}

// Helper function to generate href based on entity type
function generateHref(entity: string, id: string): string {
  const baseRoutes: Record<string, string> = {
    [WORK_ORDERS_ENTITY]: "/fm/work-orders",
    [WORK_ORDERS_ENTITY_LEGACY]: "/fm/work-orders",
    properties: "/fm/properties",
    units: "/fm/properties/units",
    tenants: "/fm/tenants",
    vendors: "/souq/vendors",
    invoices: "/finance/invoices",
    products: "/souq/products",
    services: "/souq/services",
    rfqs: "/souq/rfqs",
    orders: "/souq/orders",
    listings: "/aqar/properties",
    projects: "/aqar/properties",
    agents: "/aqar",
  };

  const basePath = baseRoutes[entity] || "/dashboard";
  return `${basePath}?highlight=${id}`;
}

type SearchResult = {
  id: string;
  entity: string;
  title: string;
  subtitle?: string;
  href: string;
  score?: number;
};

/**
 * @openapi
 * /api/search:
 *   get:
 *     summary: search operations
 *     tags: [search]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // SEC-001: Authentication required - search exposes sensitive data
  let orgId: string;
  let orgObjectId: ObjectId;
  let session: SessionUser;
  try {
    session = await getSessionUser(req);
    if (!session.orgId) {
      return createSecureResponse(
        { error: "Organization context required" },
        401,
        req,
      );
    }
    orgId = session.orgId;
    // Convert to ObjectId for MongoDB queries (tenantIsolationPlugin stores orgId as ObjectId)
    if (!ObjectId.isValid(orgId)) {
      logger.error("Invalid orgId format in session", { orgId });
      return createSecureResponse(
        { error: "Invalid organization context" },
        400,
        req,
      );
    }
    orgObjectId = new ObjectId(orgId);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }
    throw error;
  }

  try {
    const mongoose = await connectToDatabase(); // Ensure database connection
    const { searchParams } = new URL(req.url);
    const app = (searchParams.get("app") || "fm") as AppKey;
    const q = (searchParams.get("q") || "").trim();
    const scope = searchParams.get("scope") === "all" ? "all" : "module";
    const moduleScope =
      (searchParams.get("module") as ModuleScope) || DEFAULT_SCOPE;
    const entities = (searchParams.get("entities") || "")
      .split(",")
      .filter(Boolean);

    if (!q) {
      return createSecureResponse({ results: [] }, 200, req);
    }

    const appConfig = APPS[app];
    if (!appConfig) {
      return createSecureResponse({ results: [] }, 200, req);
    }

    let searchEntities =
      entities.length > 0
        ? entities.map(normalizeEntity)
        : getSearchEntitiesForScope(moduleScope, app).map(normalizeEntity);
    if (scope === "all") {
      const combined = new Set<SearchEntity>([
        ...searchEntities,
        ...appConfig.searchEntities.map(normalizeEntity),
      ]);
      searchEntities = Array.from(combined);
    }

    // Only search collections with text indexes
    searchEntities = searchEntities.filter((entity) =>
      TEXT_INDEXED_ENTITIES.has(entity as SearchEntity),
    );

    // SEC-002: Enforce RBAC - filter out entities the user cannot access
    searchEntities = searchEntities.filter((entity) =>
      canSearchEntity(session, entity as SearchEntity)
    );

    if (searchEntities.length === 0) {
      return createSecureResponse(
        { error: "Forbidden: no accessible search entities for this role" },
        403,
        req,
      );
    }

    // Parallelized search across all entities for improved latency (SEC-003)
    // Each entity search is independent and can run concurrently
    const mdb = mongoose.connection?.db;
    if (!mdb) {
      logger.error("[search] MongoDB connection not available");
      return createSecureResponse({ results: [] }, 500, req);
    }

    interface SearchItem {
      _id?: { toString: () => string };
      title?: string;
      name?: string;
      code?: string;
      description?: string;
      address?: string;
      status?: string;
      score?: number;
    }

    const baseQuery: Record<string, unknown> = {
      $text: { $search: q },
      orgId: orgObjectId, // SEC-001: Tenant isolation
      deletedAt: { $exists: false },
      isDeleted: { $ne: true },
    };

    const projection: Record<string, unknown> = {
      score: { $meta: "textScore" },
    };

    // Execute all entity searches in parallel
    const entityResults = await Promise.all(
      searchEntities.map(async (entity): Promise<SearchResult[]> => {
        try {
          const collectionName = ENTITY_COLLECTION_MAP[entity as SearchEntity];
          if (!collectionName) return [];

          const collection = mdb.collection(collectionName);

          // Apply per-role scoping (STRICT v4 least-privilege)
          const scoped = applyEntityScope(entity as SearchEntity, session, { ...baseQuery });
          if (!scoped.allowed) {
            return [];
          }
          const searchQuery = scoped.query;

          const items = await collection
            .find(searchQuery)
            .project(projection)
            .sort({ score: { $meta: "textScore" } })
            .limit(5)
            .toArray();

          return items.map((item: SearchItem): SearchResult => {
            const id = item._id?.toString() || "";
            return {
              id,
              entity,
              title: item.title || item.name || item.code || `Untitled ${entity}`,
              subtitle: item.description || item.address || item.status || undefined,
              href: generateHref(entity, id),
              score: typeof item.score === "number" ? item.score : undefined,
            };
          });
        } catch (error) {
          logger.warn(`Search failed for entity ${entity}`, { error });
          return []; // Continue with other entities
        }
      }),
    );

    // Flatten results from all entities
    const results = entityResults.flat();

    // Sort by score and limit results, stripping score after ordering
    const normalizedResults = results
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20)
      .map(({ score: _score, ...rest }) => rest);
    return createSecureResponse({ results: normalizedResults }, 200, req);
  } catch (error) {
    logger.error(
      "Search API error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ results: [] }, 500, req);
  }
}
