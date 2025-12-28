/**
 * @fileoverview Tests for /api/finance/payments/[id]/[action] route
 * Tests payment reconciliation actions (reconcile, clear, bounce)
 * FINANCIAL TAG: Critical for payment status management
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/middleware/withAuthRbac")>();
  return {
    ...actual,
    getSessionUser: vi.fn(),
  };
});

// Mock auth context
vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn((_user, fn) => fn()),
}));

// Mock RBAC
vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

// Mock API parsing
vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Payment model
vi.mock("@/server/models/finance/Payment", () => ({
  Payment: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

// Mock error responses
vi.mock("@/server/utils/errorResponses", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/utils/errorResponses")>();
  return {
    ...actual,
    forbiddenError: vi.fn(() => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })),
    unauthorizedError: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
    notFoundError: vi.fn(() => new Response(JSON.stringify({ error: "Not found" }), { status: 404 })),
    validationError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
    isForbidden: vi.fn().mockReturnValue(false),
  };
});

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { requirePermission } from "@/config/rbac.config";
import { parseBodyOrNull } from "@/lib/api/parse-body";
import { Payment } from "@/server/models/finance/Payment";

const importRoute = () => import("@/app/api/finance/payments/[id]/[action]/route");

describe("POST /api/finance/payments/[id]/[action]", () => {
  const mockOrgId = "507f1f77bcf86cd799439011";
  const mockPaymentId = "507f1f77bcf86cd799439012";
  const mockUser = {
    id: "507f1f77bcf86cd799439013",
    orgId: mockOrgId,
    role: "FINANCE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(requirePermission).mockReturnValue(undefined);
  });

  describe("Action: reconcile", () => {
    const reconcileBody = {
      bankStatementDate: new Date().toISOString(),
      bankStatementReference: "STMT-2025-001",
      clearedAmount: 1000,
    };

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest(`http://localhost/api/finance/payments/${mockPaymentId}/reconcile`, {
        method: "POST",
        body: JSON.stringify(reconcileBody),
      });
      const { POST } = await importRoute();
      const res = await POST(req, { params: Promise.resolve({ id: mockPaymentId, action: "reconcile" }) });

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const req = new NextRequest(`http://localhost/api/finance/payments/${mockPaymentId}/reconcile`, {
        method: "POST",
        body: JSON.stringify(reconcileBody),
      });
      const { POST } = await importRoute();
      const res = await POST(req, { params: Promise.resolve({ id: mockPaymentId, action: "reconcile" }) });

      expect(res.status).toBe(429);
    });

    it("returns 400 for invalid action", async () => {
      vi.mocked(parseBodyOrNull).mockResolvedValue({});

      const req = new NextRequest(`http://localhost/api/finance/payments/${mockPaymentId}/invalid-action`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const { POST } = await importRoute();
      const res = await POST(req, { params: Promise.resolve({ id: mockPaymentId, action: "invalid-action" }) });

      expect(res.status).toBe(400);
    });
  });

  describe("Action: clear", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest(`http://localhost/api/finance/payments/${mockPaymentId}/clear`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const { POST } = await importRoute();
      const res = await POST(req, { params: Promise.resolve({ id: mockPaymentId, action: "clear" }) });

      expect(res.status).toBe(401);
    });
  });

  describe("Action: bounce", () => {
    const bounceBody = {
      bounceReason: "Insufficient funds",
      bounceDate: new Date().toISOString(),
      bounceCharges: 50,
    };

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest(`http://localhost/api/finance/payments/${mockPaymentId}/bounce`, {
        method: "POST",
        body: JSON.stringify(bounceBody),
      });
      const { POST } = await importRoute();
      const res = await POST(req, { params: Promise.resolve({ id: mockPaymentId, action: "bounce" }) });

      expect(res.status).toBe(401);
    });

    it("returns 400 when bounce reason is missing", async () => {
      vi.mocked(parseBodyOrNull).mockResolvedValue({ bounceDate: new Date().toISOString() });

      const req = new NextRequest(`http://localhost/api/finance/payments/${mockPaymentId}/bounce`, {
        method: "POST",
        body: JSON.stringify({ bounceDate: new Date().toISOString() }),
      });
      const { POST } = await importRoute();
      const res = await POST(req, { params: Promise.resolve({ id: mockPaymentId, action: "bounce" }) });

      expect(res.status).toBe(400);
    });
  });
});
