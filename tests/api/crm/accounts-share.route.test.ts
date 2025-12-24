/**
 * @fileoverview Tests for /api/crm/accounts/share route
 * Tests CRM account sharing functionality, RBAC, tenant isolation
 * @module tests/api/crm/accounts-share.route.test
 * 
 * Pattern: Static imports with mutable context variables (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === Mutable state for mocks (survives vi.clearAllMocks) ===
type MockUser = {
  id: string;
  orgId: string;
  tenantId: string;
  role: string;
} | null;

let mockSessionUser: MockUser = null;
let mockRateLimitResponse: Response | null = null;
let mockCrmLeadFindOne: ReturnType<typeof vi.fn> = vi.fn();
let mockCrmLeadCreate: ReturnType<typeof vi.fn> = vi.fn();
let mockCrmActivityCreate: ReturnType<typeof vi.fn> = vi.fn();

// Mock rate limiting with mutable state
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: () => mockRateLimitResponse,
}));

// Mock authentication with mutable state
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => mockSessionUser),
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Module-scoped mock functions for tenant/audit context
const mockSetTenantContext = vi.fn();
const mockClearTenantContext = vi.fn();
const mockSetAuditContext = vi.fn();
const mockClearAuditContext = vi.fn();

// Mock tenant context with module-scoped functions
vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: (...args: unknown[]) => mockSetTenantContext(...args),
  clearTenantContext: (...args: unknown[]) => mockClearTenantContext(...args),
}));

// Mock audit context with module-scoped functions
vi.mock("@/server/plugins/auditPlugin", () => ({
  setAuditContext: (...args: unknown[]) => mockSetAuditContext(...args),
  clearAuditContext: (...args: unknown[]) => mockClearAuditContext(...args),
}));

// Mock CRM models with mutable state
vi.mock("@/server/models/CrmLead", () => ({
  default: {
    findOne: (...args: unknown[]) => mockCrmLeadFindOne(...args),
    create: (...args: unknown[]) => mockCrmLeadCreate(...args),
  },
}));

vi.mock("@/server/models/CrmActivity", () => ({
  default: {
    create: (...args: unknown[]) => mockCrmActivityCreate(...args),
  },
}));

// Mock security headers
vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

// Static imports AFTER vi.mock() calls - POST uses mocked dependencies
import { POST } from "@/app/api/crm/accounts/share/route";

describe("API /api/crm/accounts/share", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_admin_123",
    orgId: mockOrgId,
    tenantId: mockOrgId,
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable mock state
    mockSessionUser = mockUser;
    mockRateLimitResponse = null;
    mockCrmLeadFindOne = vi.fn();
    mockCrmLeadCreate = vi.fn();
    mockCrmActivityCreate = vi.fn();
  });

  describe("POST /api/crm/accounts/share", () => {
    it("should create new account when company does not exist", async () => {
      const mockCreatedAccount = {
        _id: "lead_new_123",
        company: "New Corp",
        kind: "ACCOUNT",
      };

      mockCrmLeadFindOne.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue(null),
      });
      mockCrmLeadCreate.mockResolvedValueOnce(mockCreatedAccount);
      mockCrmActivityCreate.mockResolvedValueOnce({});

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "New Corp",
          segment: "enterprise",
        }),
      });

      const res = await POST(req);
      
      expect(res.status).toBe(200);
      expect(mockCrmLeadFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          company: "New Corp",
          kind: "ACCOUNT",
        })
      );
      expect(mockCrmLeadCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          company: "New Corp",
          kind: "ACCOUNT",
        })
      );
      expect(mockCrmActivityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          leadId: mockCreatedAccount._id,
          type: "HANDOFF",
        })
      );
      expect(mockSetTenantContext).toHaveBeenCalledWith({ orgId: mockOrgId });
      expect(mockClearTenantContext).toHaveBeenCalled();
    });

    it("should share existing account without recreation", async () => {
      const mockExistingAccount = {
        _id: "lead_existing_456",
        company: "Existing Corp",
        kind: "ACCOUNT",
      };

      mockCrmLeadFindOne.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue(mockExistingAccount),
      });
      mockCrmActivityCreate.mockResolvedValueOnce({});

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Existing Corp",
        }),
      });

      const res = await POST(req);
      
      expect(res.status).toBe(200);
      expect(mockCrmLeadFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          company: "Existing Corp",
          kind: "ACCOUNT",
        })
      );
      expect(mockCrmLeadCreate).not.toHaveBeenCalled();
      expect(mockCrmActivityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          leadId: mockExistingAccount._id,
          type: "HANDOFF",
        })
      );
    });

    it("should reject request without authentication", async () => {
      mockSessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Test Corp",
        }),
      });

      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });

    it("should validate required company field", async () => {
      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          // Missing company field
          notes: "Invalid",
        }),
      });

      const res = await POST(req);
      
      expect(res.status).toBe(422);
    });

    it("should enforce rate limiting", async () => {
      mockRateLimitResponse = Response.json(
        { error: "Rate limit exceeded" }, 
        { status: 429 }
      ) as Response;

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Rate Test Corp",
        }),
      });

      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });

    it("should handle database errors gracefully", async () => {
      mockCrmLeadFindOne.mockRejectedValueOnce(new Error("DB error"));

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Error Corp",
        }),
      });

      const res = await POST(req);
      
      expect(res.status).toBe(500);
    });

    it("should set tenant and audit context", async () => {
      mockCrmLeadFindOne.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue(null),
      });
      mockCrmLeadCreate.mockResolvedValueOnce({ _id: "lead_123", kind: "ACCOUNT" });
      mockCrmActivityCreate.mockResolvedValueOnce({});

      const req = new NextRequest("http://localhost:3000/api/crm/accounts/share", {
        method: "POST",
        body: JSON.stringify({
          company: "Context Test Corp",
        }),
      });

      await POST(req);

      expect(mockSetTenantContext).toHaveBeenCalledWith({ orgId: mockOrgId });
      expect(mockSetAuditContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          ipAddress: "127.0.0.1",
        })
      );
      expect(mockClearTenantContext).toHaveBeenCalled();
      expect(mockClearAuditContext).toHaveBeenCalled();
    });
  });
});
