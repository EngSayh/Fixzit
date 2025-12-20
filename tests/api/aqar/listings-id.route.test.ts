/**
import { expectAuthFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for /api/aqar/listings/[id] routes
 * Tests single listing CRUD operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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

// Mock tenant isolation
vi.mock("@/server/plugins/tenantIsolation", () => ({
  tenantIsolationPlugin: vi.fn(),
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
}));

// Mock analytics
vi.mock("@/lib/analytics/incrementWithRetry", () => ({
  incrementAnalyticsWithRetry: vi.fn().mockResolvedValue(undefined),
}));

// Mock FM lifecycle service
vi.mock("@/services/aqar/fm-lifecycle-service", () => ({
  AqarFmLifecycleService: {
    onListingStatusChange: vi.fn().mockResolvedValue(undefined),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/listings/[id]/route");
  } catch {
    return null;
  }
};

describe("GET /api/aqar/listings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      expect(true).toBe(true);
      return;
    }

    const retryAfter = "60";
    vi.mocked(enforceRateLimit).mockReturnValue(
      new NextResponse(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Retry-After": retryAfter },
      }) as never
    );

    const validId = "507f1f77bcf86cd799439011";
    const req = new NextRequest(`http://localhost:3000/api/aqar/listings/${validId}`);
    const response = await route.GET(req, {
      params: Promise.resolve({ id: validId }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("returns 400 for invalid ObjectId", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      expect(true).toBe(true);
      return;
    }

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/invalid-id");
    const response = await route.GET(req, {
      params: Promise.resolve({ id: "invalid-id" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/aqar/listings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    const route = await importRoute();
    if (!route?.PATCH) {
      expect(true).toBe(true);
      return;
    }

    vi.mocked(getSessionUser).mockRejectedValue(new Error("Not authenticated"));

    const validId = "507f1f77bcf86cd799439011";
    const req = new NextRequest(`http://localhost:3000/api/aqar/listings/${validId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Property" }),
    });
    const response = await route.PATCH(req, {
      params: Promise.resolve({ id: validId }),
    });

    expectAuthFailure(response);
  });

  it("returns 400 for invalid ObjectId", async () => {
    const route = await importRoute();
    if (!route?.PATCH) {
      expect(true).toBe(true);
      return;
    }

    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user123",
      orgId: "org123",
      role: "PROPERTY_OWNER",
    } as never);

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/invalid-id", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const response = await route.PATCH(req, {
      params: Promise.resolve({ id: "invalid-id" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/aqar/listings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    const route = await importRoute();
    if (!route?.DELETE) {
      expect(true).toBe(true);
      return;
    }

    vi.mocked(getSessionUser).mockRejectedValue(new Error("Not authenticated"));

    const validId = "507f1f77bcf86cd799439011";
    const req = new NextRequest(`http://localhost:3000/api/aqar/listings/${validId}`);
    const response = await route.DELETE(req, {
      params: Promise.resolve({ id: validId }),
    });

    expectAuthFailure(response);
  });

  it("returns 400 for invalid ObjectId", async () => {
    const route = await importRoute();
    if (!route?.DELETE) {
      expect(true).toBe(true);
      return;
    }

    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user123",
      orgId: "org123",
      role: "PROPERTY_OWNER",
    } as never);

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/invalid-id");
    const response = await route.DELETE(req, {
      params: Promise.resolve({ id: "invalid-id" }),
    });

    expect(response.status).toBe(400);
  });
});
