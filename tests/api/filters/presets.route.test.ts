import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock with inline class definition (vi.mock is hoisted)
vi.mock("@/server/middleware/withAuthRbac", () => {
  class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  }
  return {
    getSessionUser: vi.fn(),
    UnauthorizedError,
  };
});

vi.mock("@/server/models/common/FilterPreset", () => ({
  FilterPreset: {
    findOneAndDelete: vi.fn(),
  },
}));

// Static imports AFTER mocks are defined (mocks hoist automatically)
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";
import { FilterPreset } from "@/server/models/common/FilterPreset";
import { DELETE } from "@/app/api/filters/presets/[id]/route";

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
      vi.mocked(getSessionUser).mockRejectedValue(new UnauthorizedError("unauth"));

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(res.status).toBe(401);
    });

    it("returns 403 when orgId is missing", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user_123",
        orgId: undefined,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(res.status).toBe(403);
    });

    it("returns 404 when preset not found", async () => {
      vi.mocked(FilterPreset.findOneAndDelete).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(FilterPreset.findOneAndDelete).toHaveBeenCalledWith({
        _id: "1",
        org_id: "org_abc",
        user_id: "user_123",
      });
      expect(res.status).toBe(404);
    });

    it("deletes preset with tenant + user scope", async () => {
      vi.mocked(FilterPreset.findOneAndDelete).mockResolvedValue({
        entity_type: "work_orders",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/filters/presets/1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(res.status).toBe(200);
      expect(FilterPreset.findOneAndDelete).toHaveBeenCalledWith({
        _id: "1",
        org_id: "org_abc",
        user_id: "user_123",
      });
    });
  });
});
