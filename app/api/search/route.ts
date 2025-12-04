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
// Use canonical "module:action" permission keys (Permission model format).
// Wildcards:
//   - "*" grants all
//   - "<module>:*" grants all actions within a module
// ============================================================================

type EntityPermissionConfig = {
  permission: string; // canonical module:action
  allowedRoles: readonly UserRoleType[];
};

// Extended type to include legacy alias for backward compatibility
type ExtendedSearchEntity = SearchEntity | typeof WORK_ORDERS_ENTITY_LEGACY;

export const ENTITY_PERMISSION_CONFIG: Record<ExtendedSearchEntity, EntityPermissionConfig> = {
  workOrders: {
    permission: "workorders:read",
    allowedRoles: [
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
      UserRole.SUPPORT_AGENT,
    ],
  },
  work_orders: {
    permission: "workorders:read", // legacy alias for backwards compatibility
    allowedRoles: [
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
      UserRole.SUPPORT_AGENT,
    ],
  },
  properties: {
    permission: "properties:read",
    allowedRoles: [
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
      UserRole.TENANT,
    ],
  },
  units: {
    permission: "properties:read", // units belong to properties
    allowedRoles: [
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
      UserRole.TENANT,
    ],
  },
  tenants: {
    permission: "tenants:read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.SUPPORT_AGENT,
      UserRole.HR,
      UserRole.HR_OFFICER,
    ],
  },
  vendors: {
    permission: "vendors:read",
    allowedRoles: [
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
      UserRole.VENDOR,
    ],
  },
  invoices: {
    permission: "finance:invoice.read",
    allowedRoles: [
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
  },
  products: {
    permission: "souq:products.read",
    allowedRoles: [
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
      UserRole.VENDOR,
    ],
  },
  services: {
    permission: "souq:services.read",
    allowedRoles: [
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
      UserRole.VENDOR,
    ],
  },
  rfqs: {
    permission: "souq:rfq.read",
    allowedRoles: [
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
      UserRole.VENDOR,
    ],
  },
  orders: {
    permission: "souq:orders.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROCUREMENT,
      UserRole.FINANCE,
      UserRole.FINANCE_OFFICER,
      UserRole.VENDOR,
    ],
  },
  listings: {
    permission: "aqar:listings.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.FM_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.OWNER,
      UserRole.VENDOR,
    ],
  },
  projects: {
    permission: "aqar:projects.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.FM_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.OWNER,
    ],
  },
  agents: {
    permission: "aqar:agents.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.FM_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.OWNER,
      UserRole.SUPPORT_AGENT,
    ],
  },
};

// Text-search-ready entities (must have a text index). Exported for regression tests.
export const TEXT_INDEXED_ENTITIES = new Set<ExtendedSearchEntity>([
  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY, // legacy alias for API backward compatibility
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
export const ENTITY_COLLECTION_MAP: Record<string, string | undefined> = {
  workOrders: COLLECTIONS.WORK_ORDERS,
  work_orders: COLLECTIONS.WORK_ORDERS, // legacy alias for API backward compatibility
  properties: COLLECTIONS.PROPERTIES,
  units: COLLECTIONS.UNITS,
  tenants: COLLECTIONS.TENANTS,
  vendors: COLLECTIONS.VENDORS,
  invoices: COLLECTIONS.INVOICES,
  products: COLLECTIONS.PRODUCTS,
  services: COLLECTIONS.SERVICES,
  rfqs: COLLECTIONS.RFQS,
  orders: COLLECTIONS.ORDERS,
  listings: COLLECTIONS.LISTINGS, // FIXED: Use LISTINGS (aqar_listings), not SOUQ_LISTINGS
  projects: COLLECTIONS.PROJECTS,
  agents: COLLECTIONS.AGENTS,
};

// Normalize legacy entity names to canonical form
const normalizeEntity = (entity: string): SearchEntity =>
  entity === WORK_ORDERS_ENTITY_LEGACY ? WORK_ORDERS_ENTITY : (entity as SearchEntity);

const hasPermissionKey = (session: SessionUser, permission: string): boolean => {
  if (session.isSuperAdmin) return true;
  const normalizedPermission = permission.toLowerCase();
  const moduleKey = normalizedPermission.split(":")[0];
  const permissions = (session.permissions || []).map((p) => String(p).toLowerCase());

  if (permissions.includes("*")) return true;
  if (moduleKey && permissions.includes(`${moduleKey}:*`)) return true;
  return permissions.includes(normalizedPermission);
};

// Evaluate whether the requester can search a given entity
export function canSearchEntity(session: SessionUser, entity: SearchEntity): boolean {
  const normalizedEntity = normalizeEntity(entity);
  if (session.isSuperAdmin) return true;

  const config = ENTITY_PERMISSION_CONFIG[normalizedEntity];
  if (!config) {
    logger.warn("[search] Unknown entity requested", { entity: normalizedEntity });
    return false;
  }

  if (hasPermissionKey(session, config.permission)) {
    return true;
  }

  return config.allowedRoles.some((role) => hasRole(session, role));
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
  // Broad roles keep base org scoping - these roles see all org data
  // SEC-002: Aligned with ENTITY_PERMISSION_CONFIG allowedRoles
  const isSuperUser =
    session.isSuperAdmin ||
    hasRole(session, UserRole.SUPER_ADMIN) ||
    hasRole(session, UserRole.CORPORATE_ADMIN) ||
    hasRole(session, UserRole.CORPORATE_OWNER) ||
    hasRole(session, UserRole.ADMIN) ||
    hasRole(session, UserRole.MANAGER) ||
    hasRole(session, UserRole.FM_MANAGER) ||
    hasRole(session, UserRole.OPERATIONS_MANAGER) ||
    // TEAM_MEMBER and SUPPORT_AGENT are org-facing roles; they retain org-wide visibility for search
    hasRole(session, UserRole.TEAM_MEMBER) ||
    hasRole(session, UserRole.SUPPORT_AGENT);

  if (isSuperUser) {
    return { allowed: true, query: baseQuery };
  }

  const scopedQuery = { ...baseQuery };
  const scopedEntity = normalizeEntity(entity);

  switch (scopedEntity) {
    case WORK_ORDERS_ENTITY: {
      // Collect role-based conditions with OR semantics for multi-role users
      const roleConditions: Record<string, unknown>[] = [];

      if (hasRole(session, UserRole.TENANT) && ObjectId.isValid(session.id)) {
        roleConditions.push({ "requester.userId": new ObjectId(session.id) });
      }
      if (hasRole(session, UserRole.TECHNICIAN) && ObjectId.isValid(session.id)) {
        roleConditions.push({ "assignment.assignedTo.userId": new ObjectId(session.id) });
      }
      if (hasRole(session, UserRole.VENDOR) && session.vendorId && ObjectId.isValid(session.vendorId)) {
        roleConditions.push({ "assignment.assignedTo.vendorId": new ObjectId(session.vendorId) });
      }
      if (hasRole(session, UserRole.OWNER) && session.assignedProperties?.length) {
        roleConditions.push({ "location.propertyId": { $in: toObjectIds(session.assignedProperties) } });
      }
      if (hasRole(session, UserRole.PROPERTY_MANAGER) && session.assignedProperties?.length) {
        roleConditions.push({ "location.propertyId": { $in: toObjectIds(session.assignedProperties) } });
      }

      if (roleConditions.length === 0) {
        return { allowed: false, query: scopedQuery };
      }
      if (roleConditions.length === 1) {
        Object.assign(scopedQuery, roleConditions[0]);
      } else {
        scopedQuery.$or = roleConditions;
      }
      return { allowed: true, query: scopedQuery };
    }
    case "properties": {
      // OR semantics: multi-role users see properties matching ANY role
      const roleConditions: Record<string, unknown>[] = [];
      if (hasRole(session, UserRole.OWNER) && session.assignedProperties?.length) {
        roleConditions.push({ _id: { $in: toObjectIds(session.assignedProperties) } });
      }
      if (hasRole(session, UserRole.PROPERTY_MANAGER) && session.assignedProperties?.length) {
        roleConditions.push({ _id: { $in: toObjectIds(session.assignedProperties) } });
      }
      if (hasRole(session, UserRole.TENANT) && session.units?.length) {
        roleConditions.push({ "units.unitId": { $in: toObjectIds(session.units) } });
      }
      if (roleConditions.length === 0) {
        return { allowed: false, query: scopedQuery };
      } else if (roleConditions.length === 1) {
        Object.assign(scopedQuery, roleConditions[0]);
      } else {
        scopedQuery.$or = roleConditions;
      }
      return { allowed: true, query: scopedQuery };
    }
    case "units": {
      // OR semantics: multi-role users see units matching ANY role
      const roleConditions: Record<string, unknown>[] = [];
      if (hasRole(session, UserRole.TENANT) && session.units?.length) {
        roleConditions.push({ _id: { $in: toObjectIds(session.units) } });
      }
      if (hasRole(session, UserRole.OWNER) && session.assignedProperties?.length) {
        roleConditions.push({ propertyId: { $in: toObjectIds(session.assignedProperties) } });
      }
      if (hasRole(session, UserRole.PROPERTY_MANAGER) && session.assignedProperties?.length) {
        roleConditions.push({ propertyId: { $in: toObjectIds(session.assignedProperties) } });
      }
      if (roleConditions.length === 0) {
        return { allowed: false, query: scopedQuery };
      } else if (roleConditions.length === 1) {
        Object.assign(scopedQuery, roleConditions[0]);
      } else {
        scopedQuery.$or = roleConditions;
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
    case "rfqs": {
      if (hasRole(session, UserRole.VENDOR)) {
        if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["invitedVendors.vendorId"] = new ObjectId(session.vendorId);
      }
      return { allowed: true, query: scopedQuery };
    }
    case "products":
    case "services": {
      if (hasRole(session, UserRole.VENDOR)) {
        if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["vendorId"] = new ObjectId(session.vendorId);
      }
      return { allowed: true, query: scopedQuery };
    }
    case "listings": {
      if (hasRole(session, UserRole.VENDOR)) {
        if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["vendorId"] = new ObjectId(session.vendorId);
      }
      if (hasRole(session, UserRole.OWNER)) {
        if (!session.assignedProperties?.length) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["propertyId"] = { $in: toObjectIds(session.assignedProperties) };
      }
      return { allowed: true, query: scopedQuery };
    }
    case "projects": {
      if (hasRole(session, UserRole.OWNER)) {
        if (!session.assignedProperties?.length) {
          return { allowed: false, query: scopedQuery };
        }
        scopedQuery["propertyId"] = { $in: toObjectIds(session.assignedProperties) };
      }
      return { allowed: true, query: scopedQuery };
    }
    case "agents": {
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

    // Dedup normalized entities to prevent duplicate collection queries
    // when both canonical and legacy names are passed (e.g., workOrders,work_orders)
    let searchEntities =
      entities.length > 0
        ? Array.from(new Set(entities.map(normalizeEntity)))
        : Array.from(new Set(getSearchEntitiesForScope(moduleScope, app).map(normalizeEntity)));
    if (scope === "all") {
      const combined = new Set<SearchEntity>([
        ...searchEntities,
        ...appConfig.searchEntities.map(normalizeEntity),
      ]);
      searchEntities = Array.from(combined);
    }
    // Prevent duplicate searches when both canonical and legacy entities are provided
    searchEntities = Array.from(new Set(searchEntities));

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
      title: 1,
      name: 1,
      code: 1,
      description: 1,
      address: 1,
      status: 1,
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
