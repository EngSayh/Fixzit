/**
 * @fileoverview Tests for /api/filters/presets/[id] route
 * 
 * Pattern: Module-scoped mutable state for mocks (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// === Module-scoped mutable state (survives vi.clearAllMocks) ===
type MockSession = { id: string; orgId: string | undefined; role: string } | null;
let mockSession: MockSession = null;
let mockSessionThrows = false;
let mockFilterPresetResult: unknown = null;

// Module-scoped mock function (preserves spy across tests)
const mockFindOneAndDelete = vi.fn();

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock auth with mutable state
vi.mock("@/server/middleware/withAuthRbac", () => {
  class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  }
  return {
    getSessionUser: vi.fn(async () => {
      if (mockSessionThrows) throw new UnauthorizedError("unauth");
      return mockSession;
    }),
    UnauthorizedError,
  };
});

// Mock FilterPreset with module-scoped function
vi.mock("@/server/models/common/FilterPreset", () => ({
  FilterPreset: {
    findOneAndDelete: (...args: unknown[]) => mockFindOneAndDelete(...args),
  },
}));

// Dynamic import for route to ensure mocks are applied correctly in CI shards
async function importRoute() {
  const mod = await import("@/app/api/filters/presets/[id]/route");
  return { DELETE: mod.DELETE };
}

describe("API /api/filters/presets/:id", () => {
  const defaultSession = {
    id: "user_123",
    orgId: "org_abc",
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state
    mockSession = defaultSession;
    mockSessionThrows = false;
    mockFilterPresetResult = null;
    // Reset mock implementation
    mockFindOneAndDelete.mockImplementation(async () => mockFilterPresetResult);
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSessionThrows = true;

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const { DELETE } = await importRoute();
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(res.status).toBe(401);
    });

    it("returns 403 when orgId is missing", async () => {
      mockSession = { id: "user_123", orgId: undefined, role: "ADMIN" };

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const { DELETE } = await importRoute();
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(res.status).toBe(403);
    });

    it("returns 404 when preset not found", async () => {
      mockFilterPresetResult = null;

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const { DELETE } = await importRoute();
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(mockFindOneAndDelete).toHaveBeenCalledWith({
        _id: "1",
        org_id: "org_abc",
        user_id: "user_123",
      });
      expect(res.status).toBe(404);
    });

    it("deletes preset with tenant + user scope", async () => {
      mockFilterPresetResult = { entity_type: "work_orders" };

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const { DELETE } = await importRoute();
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(res.status).toBe(200);
      expect(mockFindOneAndDelete).toHaveBeenCalledWith({
        _id: "1",
        org_id: "org_abc",
        user_id: "user_123",
      });
    });
  });
});
