/**
 * @fileoverview Tests for /api/fm/support/escalations routes
 * Tests FM escalation management
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock FM auth/permissions
vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn().mockResolvedValue({
    userId: "user-123",
    orgId: "org-123",
    tenantId: "org-123",
    isSuperAdmin: false,
  }),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn((_req: unknown, tenantId: string) => ({ tenantId })),
  isCrossTenantMode: vi.fn().mockReturnValue(false),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    internalError: () => new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 }),
  },
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
    }),
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const importRoute = async () => {
  try {
    return await import("@/app/api/fm/support/escalations/route");
  } catch {
    return null;
  }
};

describe("API /api/fm/support/escalations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST - Create Escalation", () => {
    it("creates escalation for authenticated user", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const req = new NextRequest("http://localhost:3000/api/fm/support/escalations", {
        method: "POST",
        body: JSON.stringify({
          incidentId: "INC-123",
          service: "Work Orders",
          severity: "critical",
          summary: "Escalation summary needs twenty chars",
          symptoms: "System outage detected",
          preferredChannel: "bridge",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expect(response.status).toBe(201);
    });
  });
});
