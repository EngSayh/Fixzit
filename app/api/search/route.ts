import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import {
  APPS,
  AppKey,
  DEFAULT_SCOPE,
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
const SEARCH_ENTITY_PERMISSIONS: Record<SearchEntity, string> = {
  work_orders: "wo.read",
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
 * STRICT v4.1: Based on 14-role matrix from types/user.ts
 */
const PERMISSION_ROLES: Record<string, readonly UserRoleType[]> = {
  // Work Orders - FM core functionality
  "wo.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
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
  ],
  // Properties & Units
  "properties.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.TEAM_MEMBER,
    UserRole.OWNER,
  ],
  // Tenants (lease tenants)
  "tenants.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.SUPPORT_AGENT,
  ],
  // Vendors
  "vendors.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.VENDOR,
  ],
  // Finance - Invoices (restricted)
  "finance.invoices.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.PROCUREMENT,
    UserRole.AUDITOR,
  ],
  // Souq - Products
  "souq.products.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.VENDOR,
  ],
  // Souq - Services
  "souq.services.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.VENDOR,
  ],
  // Souq - RFQs
  "souq.rfq.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.VENDOR,
  ],
  // Souq - Orders
  "souq.orders.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
  ],
  // Aqar - Listings
  "aqar.listings.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.OWNER,
  ],
  // Aqar - Projects
  "aqar.projects.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.OWNER,
  ],
  // Aqar - Agents
  "aqar.agents.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FM_MANAGER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.OWNER,
  ],
};

// Evaluate whether the requester can search a given entity
function canSearchEntity(session: SessionUser, entity: SearchEntity): boolean {
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

const WORK_ORDERS_ENTITY = "work_orders" as SearchEntity;

// Helper function to generate href based on entity type
function generateHref(entity: string, id: string): string {
  const baseRoutes: Record<string, string> = {
    [WORK_ORDERS_ENTITY]: "/fm/work-orders",
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
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 401 }
      );
    }
    orgId = session.orgId;
    // Convert to ObjectId for MongoDB queries (tenantIsolationPlugin stores orgId as ObjectId)
    if (!ObjectId.isValid(orgId)) {
      logger.error("Invalid orgId format in session", { orgId });
      return NextResponse.json(
        { error: "Invalid organization context" },
        { status: 400 }
      );
    }
    orgObjectId = new ObjectId(orgId);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
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
        ? entities
        : getSearchEntitiesForScope(moduleScope, app);
    if (scope === "all") {
      const combined = new Set([
        ...searchEntities,
        ...appConfig.searchEntities,
      ]);
      searchEntities = Array.from(combined);
    }

    // SEC-002: Enforce RBAC - filter out entities the user cannot access
    searchEntities = searchEntities.filter((entity) =>
      canSearchEntity(session, entity as SearchEntity)
    );

    if (searchEntities.length === 0) {
      return NextResponse.json(
        { error: "Forbidden: no accessible search entities for this role" },
        { status: 403 },
      );
    }

    const results: SearchResult[] = [];

    // Search across different entity types based on app
    for (const entity of searchEntities) {
      try {
        let collection:
          | ReturnType<NonNullable<typeof mongoose.connection.db>["collection"]>
          | undefined;
        // SEC-003: Consistent soft-delete filter (both deletedAt and isDeleted)
        let searchQuery: Record<string, unknown> = { 
          $text: { $search: q },
          deletedAt: { $exists: false },
          isDeleted: { $ne: true },
        };
        const projection: Record<string, unknown> = {
          score: { $meta: "textScore" },
        };

        const mdb = mongoose.connection?.db;
        if (!mdb) continue;

        switch (entity) {
          case WORK_ORDERS_ENTITY:
            collection = mdb.collection(COLLECTIONS.WORK_ORDERS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "properties":
            collection = mdb.collection(COLLECTIONS.PROPERTIES);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "units":
            collection = mdb.collection(COLLECTIONS.UNITS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "tenants":
            collection = mdb.collection(COLLECTIONS.TENANTS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "vendors":
            collection = mdb.collection(COLLECTIONS.VENDORS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "invoices":
            collection = mdb.collection(COLLECTIONS.INVOICES);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "products":
            collection = mdb.collection(COLLECTIONS.PRODUCTS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "services":
            collection = mdb.collection(COLLECTIONS.SERVICES);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "rfqs":
            collection = mdb.collection(COLLECTIONS.RFQS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "orders":
            collection = mdb.collection(COLLECTIONS.ORDERS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "listings":
            collection = mdb.collection(COLLECTIONS.SOUQ_LISTINGS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "projects":
            collection = mdb.collection(COLLECTIONS.PROJECTS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          case "agents":
            collection = mdb.collection(COLLECTIONS.AGENTS);
            searchQuery = {
              $text: { $search: q },
              orgId: orgObjectId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
              isDeleted: { $ne: true },
            };
            break;
          default:
            continue;
        }

        if (collection) {
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

          const items = await collection
            .find(searchQuery)
            .project(projection)
            .sort({ score: { $meta: "textScore" } })
            .limit(5)
            .toArray();

          items.forEach((item: SearchItem) => {
            const id = item._id?.toString() || "";
            const normalized: SearchResult = {
              id,
              entity,
              title:
                item.title || item.name || item.code || `Untitled ${entity}`,
              subtitle:
                item.description || item.address || item.status || undefined,
              href: generateHref(entity, id),
              score: typeof item.score === "number" ? item.score : undefined,
            };
            results.push(normalized);
          });
        }
      } catch (error) {
        logger.warn(`Search failed for entity ${entity}`, { error });
        // Continue with other entities
      }
    }

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
