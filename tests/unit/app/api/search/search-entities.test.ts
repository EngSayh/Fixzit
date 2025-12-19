import { describe, expect, it } from "vitest";
import {
  ENTITY_COLLECTION_MAP,
  TEXT_INDEXED_ENTITIES,
} from "@/app/api/search/route";
import { COLLECTIONS } from "@/lib/db/collections";
import type { SearchEntity } from "@/config/topbar-modules";
import {
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY,
} from "@/config/topbar-modules";

const EXPECTED_ENTITIES: SearchEntity[] = [
  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY, // legacy alias
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
];

describe("search route – text search coverage", () => {
  it("TEXT_INDEXED_ENTITIES matches the indexed collections", () => {
    const actual = Array.from(TEXT_INDEXED_ENTITIES).sort();
    const expected = [...EXPECTED_ENTITIES].sort();
    expect(actual).toEqual(expected);
  });

  it("ENTITY_COLLECTION_MAP covers all text-indexed entities with COLLECTIONS constants", () => {
    const keys = Object.keys(ENTITY_COLLECTION_MAP).sort();
    const expected = [...EXPECTED_ENTITIES].sort();
    expect(keys).toEqual(expected);

    // Every mapping points to a defined collection name from COLLECTIONS
    for (const [entity, collectionName] of Object.entries(ENTITY_COLLECTION_MAP)) {
      expect(collectionName).toBeDefined();
      const value = collectionName as string;
      expect(Object.values(COLLECTIONS)).toContain(value);

      // Work orders (both canonical and legacy) must map to canonical collection
      if (entity === WORK_ORDERS_ENTITY || entity === WORK_ORDERS_ENTITY_LEGACY) {
        expect(value).toBe(COLLECTIONS.WORK_ORDERS);
      }
    }
  });
});
