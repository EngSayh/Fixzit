/**
 * Unit tests for escalation.service.ts (P1 - HIGH PRIORITY)
 * Tests: resolveEscalationContact function for escalation routing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock mongo connection
vi.mock("@/lib/mongo", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

// Mock domains config
vi.mock("@/lib/config/domains", () => ({
  EMAIL_DOMAINS: {
    support: "support@fixzit.co",
    noreply: "noreply@fixzit.co",
  },
}));

// Mock User model
const mockUserFindOne = vi.fn();
vi.mock("@/server/models/User", () => ({
  User: {
    findOne: mockUserFindOne,
  },
}));

// Import after mocks
import { resolveEscalationContact, type EscalationContact } from "@/server/services/escalation.service";
import type { SessionUser } from "@/server/middleware/withAuthRbac";
import { logger } from "@/lib/logger";
import { UserRole } from "@/types/user";

// Helper to create mock session user
function createSessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-123",
    email: "test@example.com",
    role: UserRole.TENANT,
    orgId: "org-456",
    tenantId: "tenant-123",
    isSuperAdmin: false,
    ...overrides,
  };
}

describe("resolveEscalationContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.ESCALATION_FALLBACK_EMAIL;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Authorization", () => {
    it("should return fallback for unauthorized roles", async () => {
      const user = createSessionUser({ role: UserRole.CUSTOMER });
      
      const result = await resolveEscalationContact(user);
      
      expect(result).toEqual({
        role: "SUPPORT",
        email: "support@fixzit.co",
        name: "Fixzit Support Team",
      });
    });

    it("should return fallback for PUBLIC role", async () => {
      const user = createSessionUser({ role: UserRole.VIEWER });
      
      const result = await resolveEscalationContact(user);
      
      expect(result.role).toBe("SUPPORT");
    });

    it("should allow TENANT role to query org contacts", async () => {
      const user = createSessionUser({ role: "TENANT" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce({
          _id: { toString: () => "admin-123" },
          email: "admin@org.com",
          professional: { role: "ADMIN" },
        }),
      });
      
      const result = await resolveEscalationContact(user);
      
      expect(result.email).toBe("admin@org.com");
      expect(result.role).toBe("ADMIN");
    });

    it("should allow VENDOR role to query org contacts", async () => {
      const user = createSessionUser({ role: "VENDOR" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce({
          _id: { toString: () => "admin-123" },
          email: "admin@org.com",
          professional: { role: "CORPORATE_ADMIN" },
        }),
      });
      
      const result = await resolveEscalationContact(user);
      
      expect(result.role).toBe("CORPORATE_ADMIN");
    });

    it("should allow OWNER role to query org contacts", async () => {
      const user = createSessionUser({ role: "OWNER" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce({
          _id: { toString: () => "super-admin-123" },
          email: "super@org.com",
          professional: { role: "SUPER_ADMIN" },
        }),
      });
      
      const result = await resolveEscalationContact(user);
      
      expect(result.role).toBe("SUPER_ADMIN");
    });
  });

  describe("Org Contact Resolution", () => {
    it("should return org admin contact when found", async () => {
      const user = createSessionUser({ role: UserRole.TENANT, orgId: "org-123" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce({
          _id: { toString: () => "contact-456" },
          username: "orgadmin",
          email: "orgadmin@example.com",
          professional: { role: "ADMIN" },
        }),
      });
      
      const result = await resolveEscalationContact(user);
      
      expect(result).toEqual({
        role: "ADMIN",
        name: "orgadmin",
        email: "orgadmin@example.com",
        user_id: "contact-456",
      });
    });

    it("should return user fallback when no org contact found", async () => {
      const user = createSessionUser({ role: UserRole.TENANT, orgId: "org-123" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce(null),
      });
      
      const result = await resolveEscalationContact(user);
      
      // Falls back to user's own info when no org contact found
      expect(result.email).toBe(user.email);
      expect(result.role).toBe(user.role);
    });

    it("should use ESCALATION_FALLBACK_EMAIL env var if set", async () => {
      process.env.ESCALATION_FALLBACK_EMAIL = "custom-support@company.com";
      const user = createSessionUser({ role: UserRole.CUSTOMER });
      
      const result = await resolveEscalationContact(user);
      
      expect(result.email).toBe("custom-support@company.com");
    });
  });

  describe("Display Name Derivation", () => {
    it("should use username as display name if available", async () => {
      const user = createSessionUser({ role: "ADMIN" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce({
          _id: { toString: () => "123" },
          username: "johndoe",
          email: "john@example.com",
          professional: { role: "ADMIN" },
          personal: { firstName: "John", lastName: "Doe" },
        }),
      });
      
      const result = await resolveEscalationContact(user);
      
      expect(result.name).toBe("johndoe");
    });

    it("should fall back to firstName + lastName if no username", async () => {
      const user = createSessionUser({ role: "ADMIN" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce({
          _id: { toString: () => "123" },
          email: "john@example.com",
          professional: { role: "ADMIN" },
          personal: { firstName: "John", lastName: "Doe" },
        }),
      });
      
      const result = await resolveEscalationContact(user);
      
      expect(result.name).toBe("John Doe");
    });

    it("should handle missing name fields gracefully", async () => {
      const user = createSessionUser({ role: "ADMIN" });
      mockUserFindOne.mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce({
          _id: { toString: () => "123" },
          email: "john@example.com",
          professional: { role: "ADMIN" },
        }),
      });
      
      const result = await resolveEscalationContact(user);
      
      // Should be undefined or empty, not throw
      expect(result.email).toBe("john@example.com");
    });
  });

  describe("Error Handling", () => {
    it("should return fallback on DB error", async () => {
      const user = createSessionUser({ role: "TENANT", orgId: "org-123" });
      mockUserFindOne.mockImplementationOnce(() => {
        throw new Error("DB connection failed");
      });
      
      const result = await resolveEscalationContact(user);
      
      // Fallback returns user's own info when DB fails
      expect(result.user_id).toBe(user.id);
      expect(logger.error).toHaveBeenCalledWith(
        "[resolveEscalationContact] DB lookup failed, using fallback",
        expect.any(Object)
      );
    });

    it("should handle user without orgId by returning user info as fallback", async () => {
      const user = createSessionUser({ role: UserRole.TENANT, orgId: undefined as unknown as string });
      
      const result = await resolveEscalationContact(user);
      
      // Without orgId, returns user's own info as fallback
      expect(result.user_id).toBe(user.id);
      expect(result.role).toBe("TENANT");
    });
  });

  describe("Context Parameter", () => {
    it("should accept optional context parameter", async () => {
      const user = createSessionUser({ role: UserRole.CUSTOMER });
      
      // Should not throw with context
      const result = await resolveEscalationContact(user, "work-order-123");
      
      expect(result.role).toBe("SUPPORT");
    });

    it("should accept module context", async () => {
      const user = createSessionUser({ role: UserRole.CUSTOMER });
      
      // Module-aware context
      const result = await resolveEscalationContact(user, "FM");
      
      expect(result).toBeDefined();
    });
  });
});
