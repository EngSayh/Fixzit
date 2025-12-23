/**
 * Filter Preset API Contract Tests
 * Phase B: Schema pruning and entity validation
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { POST, GET } from "@/app/api/filters/presets/route";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { FilterPreset } from "@/server/models/common/FilterPreset";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// In-memory preset store to avoid real DB/server-only module issues in jsdom
const presetStore: any[] = [];
let presetCounter = 1;

const matchesQuery = (preset: any, query: Record<string, any>) =>
  Object.entries(query).every(([key, value]) => {
    if (value && typeof value === "object" && "$in" in value) {
      return (value.$in as unknown[]).includes(preset[key]);
    }
    return preset[key] === value;
  });

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => null),
}));

vi.mock("@/server/models/common/FilterPreset", () => ({
  FilterPreset: {
    find: vi.fn((query: Record<string, unknown>) => ({
      sort: vi.fn(() => ({
        lean: vi.fn(() => ({
          exec: vi.fn(async () =>
            presetStore.filter((preset) => matchesQuery(preset, query || {})),
          ),
        })),
      })),
    })),
    countDocuments: vi.fn(async (query: Record<string, unknown>) =>
      presetStore.filter((preset) => matchesQuery(preset, query || {})).length,
    ),
    create: vi.fn(async (doc: any) => {
      const preset = {
        ...doc,
        _id: String(presetCounter++),
        updated_at: new Date(),
        created_at: new Date(),
      };
      presetStore.push(preset);
      return preset;
    }),
    deleteMany: vi.fn(async (query: Record<string, unknown>) => {
      let deleted = 0;
      for (let i = presetStore.length - 1; i >= 0; i -= 1) {
        if (matchesQuery(presetStore[i], query || {})) {
          presetStore.splice(i, 1);
          deleted += 1;
        }
      }
      return { deletedCount: deleted };
    }),
  },
}));

// Mock dependencies
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "user_123",
    orgId: "org_456",
    username: "testuser",
  })),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

describe("Filter Preset API - Contract Tests", () => {
  beforeAll(async () => {
    await connectDb();
    await FilterPreset.deleteMany({ org_id: "org_456" });
  });

  afterAll(async () => {
    await FilterPreset.deleteMany({ org_id: "org_456" });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    presetStore.length = 0;
    presetCounter = 1;
  });

  it("should reject invalid entity_type", async () => {
    const req = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "invalid_entity",
        name: "Test Preset",
        filters: { status: "open" },
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
  });

  it("should normalize legacy entity_type aliases", async () => {
    const req = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "work_orders", // Legacy snake_case
        name: "Legacy Work Orders",
        filters: { status: "open" },
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.preset.entity_type).toBe("workOrders"); // Normalized to camelCase
  });

  it("should prune unknown filter keys per schema", async () => {
    const req = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "workOrders",
        name: "Test Work Orders",
        filters: {
          status: "open",
          priority: "high",
          unknownKey: "should be removed",
          anotherBadKey: 123,
        },
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    const savedFilters = data.preset.filters;
    
    // Should keep valid schema keys
    expect(savedFilters.status).toBe("open");
    expect(savedFilters.priority).toBe("high");
    
    // Should remove unknown keys
    expect(savedFilters.unknownKey).toBeUndefined();
    expect(savedFilters.anotherBadKey).toBeUndefined();
  });

  it("should reject filters with dangerous keys ($, .)", async () => {
    const req = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "invoices",
        name: "Test Invoices",
        filters: {
          status: "paid",
          "$where": "malicious code", // Should be sanitized
          "nested.path": "also bad",
        },
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    const savedFilters = data.preset.filters;
    
    // Should keep valid key
    expect(savedFilters.status).toBe("paid");
    
    // Should remove dangerous keys
    expect(savedFilters.$where).toBeUndefined();
    expect(savedFilters["nested.path"]).toBeUndefined();
  });

  it("should handle entity types with no schema (backward compatibility)", async () => {
    const req = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "customEntity", // No schema defined
        name: "Custom Entity Preset",
        filters: { anyKey: "anyValue" },
      }),
    });

    const response = await POST(req);
    // Should accept unknown entity if normalized (or reject based on policy)
    // Currently, normalizeFilterEntityType returns null for unknown, which fails validation
    expect(response.status).toBe(400);
  });

  it("should auto-apply default preset when no filters/search set", async () => {
    // Create a default preset
    const createReq = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "employees",
        name: "Active Employees",
        filters: { status: "active" },
        is_default: true,
      }),
    });

    const createResponse = await POST(createReq);
    expect(createResponse.status).toBe(201);

    // List presets
    const listReq = new NextRequest(
      "http://localhost/api/filters/presets?entity_type=employees",
      { method: "GET" }
    );

    const listResponse = await GET(listReq);
    expect(listResponse.status).toBe(200);
    
    const data = await listResponse.json();
    const defaultPreset = data.presets.find((p: any) => p.is_default);
    
    expect(defaultPreset).toBeDefined();
    expect(defaultPreset.filters.status).toBe("active");
  });

  it("should enforce preset limit per entity (max 20)", async () => {
    // Create 20 presets for products
    for (let i = 0; i < 20; i++) {
      const req = new NextRequest("http://localhost/api/filters/presets", {
        method: "POST",
        body: JSON.stringify({
          entity_type: "products",
          name: `Product Preset ${i}`,
          filters: { category: `cat_${i}` },
        }),
      });
      await POST(req);
    }

    // Try to create 21st preset
    const req21 = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "products",
        name: "Product Preset 21",
        filters: { category: "cat_21" },
      }),
    });

    const response = await POST(req21);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe("Preset limit reached");
  });
});
