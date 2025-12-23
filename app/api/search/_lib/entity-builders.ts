/**
 * @fileoverview Search Entity Builders
 * @description Entity collection mappings, text index configuration, and href generation
 * @module api/search/_lib/entity-builders
 */

import { COLLECTIONS } from "@/lib/db/collections";
import {
  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY,
} from "@/config/topbar-modules";
import type { ExtendedSearchEntity } from "./permissions";

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
  [WORK_ORDERS_ENTITY_LEGACY]: COLLECTIONS.WORK_ORDERS, // legacy alias for API backward compatibility
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

// Base routes for entity navigation
const BASE_ROUTES: Record<string, string> = {
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

/**
 * Generate href for search result navigation
 */
export function generateHref(entity: string, id: string): string {
  const basePath = BASE_ROUTES[entity] || "/dashboard";
  return `${basePath}?highlight=${id}`;
}

export type SearchResult = {
  id: string;
  entity: string;
  title: string;
  subtitle?: string;
  href: string;
  score?: number;
};

/**
 * Map raw search item to SearchResult
 */
export function mapSearchResult(
  entity: string,
  item: {
    _id?: { toString: () => string };
    title?: string;
    name?: string;
    code?: string;
    description?: string;
    address?: string;
    status?: string;
    score?: number;
  },
): SearchResult {
  const id = item._id?.toString() || "";
  return {
    id,
    entity,
    title: item.title || item.name || item.code || `Untitled ${entity}`,
    subtitle: item.description || item.address || item.status || undefined,
    href: generateHref(entity, id),
    score: typeof item.score === "number" ? item.score : undefined,
  };
}
