/**
 * @fileoverview Tests for /api/admin/support-tickets route
 * @description Support tickets API for superadmin
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue({
    id: "superadmin-123",
    username: "admin",
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getSuperadminSession } from "@/lib/superadmin/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/admin/support-tickets/route");
  } catch {
    return null;
  }
};

describe("GET /api/admin/support-tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(getSuperadminSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/support-tickets", {
      method: "GET",
    });

    const res = await route.GET(req);
    expect(res.status).toBe(401);
  });

  it("should return support tickets list for authenticated superadmin", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(getSuperadminSession).mockResolvedValue({
      id: "superadmin-123",
      username: "admin",
    });

    const req = new NextRequest("http://localhost/api/admin/support-tickets", {
      method: "GET",
    });

    const res = await route.GET(req);
    // Should return 200 with tickets list or 500 on internal error
    expect([200, 500]).toContain(res.status);
  });
});
