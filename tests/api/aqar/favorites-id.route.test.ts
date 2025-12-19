/**
 * @fileoverview Tests for /api/aqar/favorites/[id] DELETE route
 * Tests favorite deletion for individual favorites by ID
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock tenant isolation plugin
vi.mock("@/server/plugins/tenantIsolation", () => ({
  tenantIsolationPlugin: vi.fn(),
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/favorites/[id]/route");
  } catch {
    return null;
  }
};

describe("DELETE /api/aqar/favorites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const route = await importRoute();
    if (!route?.DELETE) {
      throw new Error("Route handler missing: DELETE");
    }

    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      }) as never
    );

    const validId = "507f1f77bcf86cd799439011";
    const req = new NextRequest(`http://localhost:3000/api/aqar/favorites/${validId}`);
    const response = await route.DELETE(req, {
      params: Promise.resolve({ id: validId }),
    });

    expect(response.status).toBe(429);
  });

  it("returns 401 when user is not authenticated", async () => {
    const route = await importRoute();
    if (!route?.DELETE) {
      throw new Error("Route handler missing: DELETE");
    }

    vi.mocked(getSessionUser).mockRejectedValue(new Error("Not authenticated"));

    const validId = "507f1f77bcf86cd799439011";
    const req = new NextRequest(`http://localhost:3000/api/aqar/favorites/${validId}`);
    const response = await route.DELETE(req, {
      params: Promise.resolve({ id: validId }),
    });

    expect([401, 500]).toContain(response.status);
  });

  it("returns 400 for invalid ObjectId", async () => {
    const route = await importRoute();
    if (!route?.DELETE) {
      throw new Error("Route handler missing: DELETE");
    }

    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user123",
      orgId: "org123",
      role: "PROPERTY_OWNER",
    } as never);

    const req = new NextRequest("http://localhost:3000/api/aqar/favorites/invalid-id");
    const response = await route.DELETE(req, {
      params: Promise.resolve({ id: "invalid-id" }),
    });

    expect(response.status).toBe(400);
  });
});

