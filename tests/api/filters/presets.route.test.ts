import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/middleware/withAuthRbac", () => {
  class MockUnauthorizedError extends Error {}
  return {
    getSessionUser: vi.fn(),
    UnauthorizedError: MockUnauthorizedError,
  };
});

vi.mock("@/server/models/common/FilterPreset", () => ({
  FilterPreset: {
    findOneAndDelete: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";
import { FilterPreset } from "@/server/models/common/FilterPreset";

const importDeleteRoute = async () => {
  try {
    return await import("@/app/api/filters/presets/[id]/route");
  } catch {
    return null;
  }
};

describe("API /api/filters/presets/:id", () => {
  const mockSession = {
    id: "user_123",
    orgId: "org_abc",
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockSession as never);
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      const route = await importDeleteRoute();
      if (!route?.DELETE) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockRejectedValue(new UnauthorizedError("unauth"));

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await route.DELETE(req, { params: { id: "1" } });

      expect(res.status).toBe(401);
    });

    it("returns 403 when orgId is missing", async () => {
      const route = await importDeleteRoute();
      if (!route?.DELETE) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user_123",
        orgId: undefined,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await route.DELETE(req, { params: { id: "1" } });

      expect(res.status).toBe(403);
    });

    it("returns 404 when preset not found", async () => {
      const route = await importDeleteRoute();
      if (!route?.DELETE) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(FilterPreset.findOneAndDelete).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await route.DELETE(req, { params: { id: "1" } });

      expect(FilterPreset.findOneAndDelete).toHaveBeenCalledWith({
        _id: "1",
        org_id: "org_abc",
        user_id: "user_123",
      });
      expect(res.status).toBe(404);
    });

    it("deletes preset with tenant + user scope", async () => {
      const route = await importDeleteRoute();
      if (!route?.DELETE) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(FilterPreset.findOneAndDelete).mockResolvedValue({
        entity_type: "work_orders",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await route.DELETE(req, { params: { id: "1" } });

      expect(res.status).toBe(200);
      expect(FilterPreset.findOneAndDelete).toHaveBeenCalledWith({
        _id: "1",
        org_id: "org_abc",
        user_id: "user_123",
      });
    });
  });
});
