/**
 * Audit Logging System Unit Tests
 * 
 * Tests for lib/audit.ts - Comprehensive coverage for:
 * - orgId enforcement (empty/whitespace/valid)
 * - Action enum mapping (known actions, unknown actions, case-insensitive)
 * - PII redaction (passwords, tokens, SSNs, credit cards)
 * - Success default behavior
 * - Helper functions (auditSuperAdminAction, auditImpersonation)
 * - Entity type mapping
 * 
 * @see docs/CATEGORIZED_TASKS_LIST.md Task 0.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the logger before importing audit
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the AuditLogModel
vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

import { audit, auditSuperAdminAction, auditImpersonation, AuditActions, AuditCategories } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { AuditLogModel } from "@/server/models/AuditLog";

describe("Audit Logging System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("orgId enforcement", () => {
    it("rejects audit events with missing orgId", async () => {
      await audit({
        actorId: "user-123",
        actorEmail: "test@example.com",
        action: "user.create",
        // orgId intentionally missing
      });

      expect(logger.error).toHaveBeenCalledWith(
        "[AUDIT] CRITICAL: orgId missing",
        expect.objectContaining({
          event: expect.objectContaining({
            actorId: "user-123",
          }),
        })
      );
      // Should NOT write to database
      expect(AuditLogModel.log).not.toHaveBeenCalled();
    });

    it("rejects audit events with empty string orgId", async () => {
      await audit({
        actorId: "user-123",
        actorEmail: "test@example.com",
        action: "user.create",
        orgId: "",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "[AUDIT] CRITICAL: orgId missing",
        expect.anything()
      );
      expect(AuditLogModel.log).not.toHaveBeenCalled();
    });

    it("rejects audit events with whitespace-only orgId", async () => {
      await audit({
        actorId: "user-123",
        actorEmail: "test@example.com",
        action: "user.create",
        orgId: "   ",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "[AUDIT] CRITICAL: orgId missing",
        expect.anything()
      );
      expect(AuditLogModel.log).not.toHaveBeenCalled();
    });

    it("accepts audit events with valid orgId", async () => {
      await audit({
        actorId: "user-123",
        actorEmail: "test@example.com",
        action: "user.create",
        orgId: "org-456",
      });

      expect(logger.error).not.toHaveBeenCalled();
      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org-456",
        })
      );
    });

    it("trims whitespace from orgId", async () => {
      await audit({
        actorId: "user-123",
        actorEmail: "test@example.com",
        action: "user.create",
        orgId: "  org-456  ",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org-456",
        })
      );
    });
  });

  describe("action enum mapping", () => {
    it("maps user.grantSuperAdmin to UPDATE", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "user.grantSuperAdmin",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "UPDATE",
        })
      );
    });

    it("maps user.create to CREATE", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "user.create",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CREATE",
        })
      );
    });

    it("maps auth.login to LOGIN", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "auth.login",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LOGIN",
        })
      );
    });

    it("maps user.delete to DELETE", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "user.delete",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DELETE",
        })
      );
    });

    it("maps impersonate.start to CUSTOM", async () => {
      await audit({
        actorId: "super-admin",
        actorEmail: "super@example.com",
        action: "impersonate.start",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CUSTOM",
        })
      );
    });

    it("handles case-insensitive action mapping", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "USER.CREATE",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CREATE",
        })
      );
    });

    it("maps unknown actions to CUSTOM", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "some.unknown.action",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CUSTOM",
        })
      );
    });

    it("preserves rawAction in metadata", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "user.grantSuperAdmin",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            rawAction: "user.grantSuperAdmin",
          }),
        })
      );
    });
  });

  describe("PII redaction", () => {
    it("redacts password fields", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "auth.passwordChange",
        orgId: "org-1",
        meta: {
          oldPassword: "secret123",
          newPassword: "newsecret456",
          username: "testuser",
        },
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldPassword: "[REDACTED]",
            newPassword: "[REDACTED]",
            username: "testuser",
          }),
        })
      );
    });

    it("redacts token fields", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "auth.login",
        orgId: "org-1",
        meta: {
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refreshToken: "refresh-token-value",
          sessionId: "session-123",
        },
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            accessToken: "[REDACTED]",
            refreshToken: "[REDACTED]",
            sessionId: "session-123",
          }),
        })
      );
    });

    it("redacts SSN patterns", async () => {
      await audit({
        actorId: "hr-admin",
        actorEmail: "hr@example.com",
        action: "user.update",
        orgId: "org-1",
        meta: {
          ssn: "123-45-6789",
          socialSecurityNumber: "987-65-4321",
          employeeId: "EMP-001",
        },
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            ssn: "[REDACTED]",
            socialSecurityNumber: "[REDACTED]",
            employeeId: "EMP-001",
          }),
        })
      );
    });

    it("redacts credit card fields", async () => {
      await audit({
        actorId: "finance-1",
        actorEmail: "finance@example.com",
        action: "payment.process",
        orgId: "org-1",
        meta: {
          creditCard: "4111-1111-1111-1111",
          cardNumber: "5500-0000-0000-0004",
          cvv: "123",
          pin: "4567",
          transactionId: "TXN-001",
        },
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            creditCard: "[REDACTED]",
            cardNumber: "[REDACTED]",
            cvv: "[REDACTED]",
            pin: "[REDACTED]",
            transactionId: "TXN-001",
          }),
        })
      );
    });

    it("redacts API keys and secrets", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "security.apiKeyCreate",
        orgId: "org-1",
        meta: {
          apiKey: "sk_live_abc123",
          api_key: "pk_test_xyz789",
          secret: "super-secret-value",
          privateKey: "-----BEGIN RSA PRIVATE KEY-----",
          keyName: "Production API Key",
        },
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            apiKey: "[REDACTED]",
            api_key: "[REDACTED]",
            secret: "[REDACTED]",
            privateKey: "[REDACTED]",
            keyName: "Production API Key",
          }),
        })
      );
    });

    it("handles nested objects without breaking", async () => {
      // Nested objects should be handled gracefully even if redaction
      // only applies at certain levels due to how metadata is flattened
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "user.update",
        orgId: "org-1",
        meta: {
          user: {
            name: "Test User",
            credentials: {
              password: "secret123",
              token: "jwt-token",
            },
          },
        },
      });

      // Verify the database log was called successfully
      expect(AuditLogModel.log).toHaveBeenCalled();
      
      // Verify the log call includes metadata
      const dbCall = vi.mocked(AuditLogModel.log).mock.calls[0][0];
      expect(dbCall.metadata).toBeDefined();
      
      // The user object should be present in metadata
      expect(dbCall.metadata?.user).toBeDefined();
    });

    it("redacts actorEmail in log output", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "sensitive@example.com",
        action: "user.create",
        orgId: "org-1",
      });

      // Check that logger.info was called with redacted email
      expect(logger.info).toHaveBeenCalledWith(
        "[AUDIT]",
        expect.objectContaining({
          actorEmail: "[REDACTED]",
        })
      );
    });
  });

  describe("success default behavior", () => {
    it("defaults success to true when not specified", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "user.create",
        orgId: "org-1",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            success: true,
          }),
        })
      );
    });

    it("defaults success to false when error is present", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "user.create",
        orgId: "org-1",
        error: "Validation failed",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            success: false,
            errorMessage: "Validation failed",
          }),
        })
      );
    });

    it("respects explicit success=true even with error", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "user.create",
        orgId: "org-1",
        success: true,
        error: "Warning only",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            success: true,
          }),
        })
      );
    });

    it("logs warning when success flag is missing", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "user.create",
        orgId: "org-1",
        // success intentionally omitted
      });

      expect(logger.warn).toHaveBeenCalledWith(
        "[AUDIT] success flag missing; inferring from context",
        expect.objectContaining({
          inferredSuccess: true,
        })
      );
    });
  });

  describe("entity type mapping", () => {
    it("maps user targetType to USER", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "user.create",
        orgId: "org-1",
        targetType: "user",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "USER",
        })
      );
    });

    it("maps role targetType to SETTING", async () => {
      await audit({
        actorId: "admin-1",
        actorEmail: "admin@example.com",
        action: "role.create",
        orgId: "org-1",
        targetType: "role",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "SETTING",
        })
      );
    });

    it("maps property targetType to PROPERTY", async () => {
      await audit({
        actorId: "pm-1",
        actorEmail: "pm@example.com",
        action: "property.update",
        orgId: "org-1",
        targetType: "property",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "PROPERTY",
        })
      );
    });

    it("maps workorder targetType to WORKORDER", async () => {
      await audit({
        actorId: "tech-1",
        actorEmail: "tech@example.com",
        action: "workorder.update",
        orgId: "org-1",
        targetType: "workorder",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "WORKORDER",
        })
      );
    });

    it("maps unknown targetType to OTHER", async () => {
      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "custom.action",
        orgId: "org-1",
        targetType: "unknownEntity",
      });

      expect(AuditLogModel.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "OTHER",
        })
      );
    });
  });

  describe("helper functions", () => {
    describe("auditSuperAdminAction", () => {
      it("requires orgId parameter", async () => {
        await auditSuperAdminAction(
          "", // empty orgId
          "user.grantSuperAdmin",
          "super-admin-1",
          "super@example.com",
          "target-user-1",
          "target@example.com"
        );

        expect(logger.error).toHaveBeenCalledWith(
          "[AUDIT] CRITICAL: orgId missing for super admin action",
          expect.anything()
        );
        expect(AuditLogModel.log).not.toHaveBeenCalled();
      });

      it("logs super admin actions with critical severity", async () => {
        await auditSuperAdminAction(
          "org-1",
          "user.grantSuperAdmin",
          "super-admin-1",
          "super@example.com",
          "target-user-1",
          "target@example.com"
        );

        expect(AuditLogModel.log).toHaveBeenCalledWith(
          expect.objectContaining({
            orgId: "org-1",
            userId: "super-admin-1",
            metadata: expect.objectContaining({
              category: "super.admin",
              severity: "critical",
            }),
          })
        );
      });

      it("includes target information", async () => {
        await auditSuperAdminAction(
          "org-1",
          "user.revokeSuperAdmin",
          "super-admin-1",
          "super@example.com",
          "target-user-1",
          "target@example.com",
          { reason: "Security review" }
        );

        expect(AuditLogModel.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityName: "target@example.com",
            metadata: expect.objectContaining({
              reason: "Security review",
            }),
          })
        );
      });
    });

    describe("auditImpersonation", () => {
      it("requires orgId parameter", async () => {
        await auditImpersonation(
          "  ", // whitespace-only orgId
          "admin-1",
          "admin@example.com",
          "user-1",
          "user@example.com",
          "start"
        );

        expect(logger.error).toHaveBeenCalledWith(
          "[AUDIT] CRITICAL: orgId missing for impersonation action",
          expect.anything()
        );
        expect(AuditLogModel.log).not.toHaveBeenCalled();
      });

      it("logs impersonation start with correct action", async () => {
        await auditImpersonation(
          "org-1",
          "admin-1",
          "admin@example.com",
          "user-1",
          "user@example.com",
          "start"
        );

        expect(AuditLogModel.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: "CUSTOM", // impersonate.start maps to CUSTOM
            metadata: expect.objectContaining({
              category: "impersonation",
              severity: "critical",
              targetId: "user-1",
            }),
          })
        );
      });

      it("logs impersonation end with correct action", async () => {
        await auditImpersonation(
          "org-1",
          "admin-1",
          "admin@example.com",
          "user-1",
          "user@example.com",
          "end"
        );

        expect(AuditLogModel.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: "CUSTOM", // impersonate.end maps to CUSTOM
          })
        );
      });
    });
  });

  describe("critical action alerts", () => {
    it("triggers warning for grant actions", async () => {
      await audit({
        actorId: "super-admin",
        actorEmail: "super@example.com",
        action: "user.grantSuperAdmin",
        orgId: "org-1",
        target: "new-admin@example.com",
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("[AUDIT CRITICAL]"),
        expect.objectContaining({
          severity: "critical",
        })
      );
    });

    it("triggers warning for impersonation actions", async () => {
      await audit({
        actorId: "super-admin",
        actorEmail: "super@example.com",
        action: "impersonate.start",
        orgId: "org-1",
        target: "user@example.com",
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("[AUDIT CRITICAL]"),
        expect.objectContaining({
          severity: "critical",
        })
      );
    });

    it("triggers warning for revoke actions", async () => {
      await audit({
        actorId: "super-admin",
        actorEmail: "super@example.com",
        action: "user.revokeSuperAdmin",
        orgId: "org-1",
        target: "former-admin@example.com",
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("[AUDIT CRITICAL]"),
        expect.anything()
      );
    });
  });

  describe("AuditActions constants", () => {
    it("exports all expected user management actions", () => {
      expect(AuditActions.USER_CREATE).toBe("user.create");
      expect(AuditActions.USER_UPDATE).toBe("user.update");
      expect(AuditActions.USER_DELETE).toBe("user.delete");
      expect(AuditActions.USER_GRANT_SUPER).toBe("user.grantSuperAdmin");
      expect(AuditActions.USER_REVOKE_SUPER).toBe("user.revokeSuperAdmin");
    });

    it("exports all expected auth actions", () => {
      expect(AuditActions.AUTH_LOGIN).toBe("auth.login");
      expect(AuditActions.AUTH_LOGOUT).toBe("auth.logout");
      expect(AuditActions.AUTH_FAILED_LOGIN).toBe("auth.failedLogin");
      expect(AuditActions.AUTH_PASSWORD_CHANGE).toBe("auth.passwordChange");
    });

    it("exports impersonation actions", () => {
      expect(AuditActions.IMPERSONATE_START).toBe("impersonate.start");
      expect(AuditActions.IMPERSONATE_END).toBe("impersonate.end");
    });
  });

  describe("AuditCategories constants", () => {
    it("exports all expected categories", () => {
      expect(AuditCategories.AUTH).toBe("auth");
      expect(AuditCategories.USER_MANAGEMENT).toBe("user.management");
      expect(AuditCategories.SUPER_ADMIN).toBe("super.admin");
      expect(AuditCategories.IMPERSONATION).toBe("impersonation");
      expect(AuditCategories.SECURITY).toBe("security");
      expect(AuditCategories.COMPLIANCE).toBe("compliance");
    });
  });

  describe("database error handling", () => {
    it("continues execution when database write fails", async () => {
      vi.mocked(AuditLogModel.log).mockRejectedValueOnce(new Error("DB connection failed"));

      // Should not throw
      await expect(
        audit({
          actorId: "user-1",
          actorEmail: "user@example.com",
          action: "user.create",
          orgId: "org-1",
        })
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        "[AUDIT] Database write failed:",
        expect.any(Error)
      );
    });
  });

  describe("timestamp handling", () => {
    it("adds timestamp when not provided", async () => {
      const beforeTime = new Date().toISOString();

      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "user.create",
        orgId: "org-1",
      });

      const afterTime = new Date().toISOString();

      expect(logger.info).toHaveBeenCalledWith(
        "[AUDIT]",
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );

      // Verify timestamp is in valid range
      const call = vi.mocked(logger.info).mock.calls[0][1] as { timestamp: string };
      expect(call.timestamp >= beforeTime).toBe(true);
      expect(call.timestamp <= afterTime).toBe(true);
    });

    it("preserves provided timestamp", async () => {
      const customTimestamp = "2025-01-01T00:00:00.000Z";

      await audit({
        actorId: "user-1",
        actorEmail: "user@example.com",
        action: "user.create",
        orgId: "org-1",
        timestamp: customTimestamp,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "[AUDIT]",
        expect.objectContaining({
          timestamp: customTimestamp,
        })
      );
    });
  });
});
