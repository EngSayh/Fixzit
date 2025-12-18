import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  findChain: {
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  },
  countDocuments: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/server/models/common/FilterPreset", () => ({
  FilterPreset: {
    find: vi.fn(() => hoisted.findChain),
    countDocuments: hoisted.countDocuments,
    create: hoisted.create,
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => ({ id: "u1", orgId: "org-1" })),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

import * as route from "@/app/api/filters/presets/route";

describe("Filter presets API tenancy + validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.findChain.exec.mockResolvedValue([
      { org_id: "org-1", user_id: "u1", entity_type: "workOrders", filters: {} },
    ]);
    hoisted.countDocuments.mockResolvedValue(0);
    hoisted.create.mockResolvedValue({
      _id: "preset-1",
      org_id: "org-1",
      user_id: "u1",
      entity_type: "workOrders",
      name: "My preset",
      filters: { status: "OPEN" },
      sort: { field: "createdAt", direction: "desc" },
      search: "abc",
      is_default: false,
    });
  });

  it("GET scopes presets by org and user and normalizes entity_type", async () => {
    const request = new NextRequest("http://localhost/api/filters/presets?entity_type=workOrders");
    const response = await route.GET(request);
    const body = await response.json();

    expect(body.presets).toHaveLength(1);
    expect(body.presets[0]).toMatchObject({
      org_id: "org-1",
      user_id: "u1",
      entity_type: "workOrders",
    });
    expect(hoisted.findChain.sort).toHaveBeenCalledWith({ is_default: -1, updated_at: -1 });
    expect(hoisted.findChain.exec).toHaveBeenCalledTimes(1);
  });

  it("POST enforces org/user scoping and preset limit before create", async () => {
    const request = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "workOrders",
        name: "Default WO filters",
        filters: { status: "OPEN" },
        sort: { field: "createdAt", direction: "desc" },
        search: "abc",
        is_default: true,
      }),
    });

    const response = await route.POST(request);
    expect(response.status).toBe(201);

    expect(hoisted.countDocuments).toHaveBeenCalledWith({
      org_id: "org-1",
      user_id: "u1",
      entity_type: { $in: ["workOrders", "work_orders"] },
    });
    expect(hoisted.create).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-1",
        user_id: "u1",
        entity_type: "workOrders",
        filters: { status: "OPEN" },
        is_default: true,
      }),
    );
  });

  it("rejects requests without org context", async () => {
    const auth = await import("@/server/middleware/withAuthRbac");
    vi.spyOn(auth, "getSessionUser").mockResolvedValueOnce({ id: "u1", orgId: undefined as never });

    const request = new NextRequest("http://localhost/api/filters/presets", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "workOrders",
        name: "Default WO filters",
        filters: { status: "OPEN" },
      }),
    });

    const response = await route.POST(request);
    expect(response.status).toBe(403);
  });
});
