import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import {
  APPS,
  AppKey,
  DEFAULT_SCOPE,
  getSearchEntitiesForScope,
} from "@/config/topbar-modules";
import type { ModuleScope } from "@/config/topbar-modules";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";

// Helper function to generate href based on entity type
function generateHref(entity: string, id: string): string {
  const baseRoutes: Record<string, string> = {
    work_orders: "/fm/work-orders",
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
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // SEC-001: Authentication required - search exposes sensitive data
  let orgId: string;
  try {
    const session = await getSessionUser(req);
    if (!session.orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 401 }
      );
    }
    orgId = session.orgId;
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
    const results: SearchResult[] = [];

    // Search across different entity types based on app
    for (const entity of searchEntities) {
      try {
        let collection:
          | ReturnType<NonNullable<typeof mongoose.connection.db>["collection"]>
          | undefined;
        let searchQuery: Record<string, unknown> = { $text: { $search: q } };
        const projection: Record<string, unknown> = {
          score: { $meta: "textScore" },
        };

        const mdb = mongoose.connection?.db;
        if (!mdb) continue;

        switch (entity) {
          case "work_orders":
            collection = mdb.collection("work_orders");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "properties":
            collection = mdb.collection("properties");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "units":
            collection = mdb.collection("units");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "tenants":
            collection = mdb.collection("tenants");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "vendors":
            collection = mdb.collection("vendors");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "invoices":
            collection = mdb.collection("invoices");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "products":
            collection = mdb.collection("products");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "services":
            collection = mdb.collection("services");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "rfqs":
            collection = mdb.collection("rfqs");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "orders":
            collection = mdb.collection("orders");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "listings":
            collection = mdb.collection("listings");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "projects":
            collection = mdb.collection("projects");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
            };
            break;
          case "agents":
            collection = mdb.collection("agents");
            searchQuery = {
              $text: { $search: q },
              orgId, // SEC-001: Tenant isolation
              deletedAt: { $exists: false },
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
