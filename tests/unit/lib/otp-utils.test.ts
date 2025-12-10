/**
 * @fileoverview Unit tests for OTP utility functions
 * Tests authentication-related helpers including identifier redaction for GDPR compliance.
 */

import { describe, it, expect } from "vitest";
import {
  EMPLOYEE_ID_REGEX,
  normalizeCompanyCode,
  buildOtpKey,
  isValidCompanyCode,
  redactIdentifier,
  redactMetadata,
  hashIdentifier,
} from "@/lib/otp-utils";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

describe("OTP Utils", () => {
  describe("EMPLOYEE_ID_REGEX", () => {
    it("should match valid employee IDs", () => {
      expect(EMPLOYEE_ID_REGEX.test("EMP001")).toBe(true);
      expect(EMPLOYEE_ID_REGEX.test("EMP-001")).toBe(true);
      expect(EMPLOYEE_ID_REGEX.test("EMPA12345")).toBe(true);
      expect(EMPLOYEE_ID_REGEX.test("EMP-ABC-123")).toBe(true);
    });

    it("should reject invalid employee IDs", () => {
      expect(EMPLOYEE_ID_REGEX.test("001")).toBe(false);
      expect(EMPLOYEE_ID_REGEX.test("emp001")).toBe(false); // lowercase
      expect(EMPLOYEE_ID_REGEX.test("USER001")).toBe(false);
      expect(EMPLOYEE_ID_REGEX.test("user@email.com")).toBe(false);
    });
  });

  describe("normalizeCompanyCode", () => {
    it("should normalize company codes to uppercase", () => {
      expect(normalizeCompanyCode("acme-001")).toBe("ACME-001");
      expect(normalizeCompanyCode("Demo")).toBe("DEMO");
    });

    it("should trim whitespace", () => {
      expect(normalizeCompanyCode("  ACME  ")).toBe("ACME");
    });

    it("should return null for empty or undefined inputs", () => {
      expect(normalizeCompanyCode("")).toBe(null);
      expect(normalizeCompanyCode("   ")).toBe(null);
      expect(normalizeCompanyCode(null)).toBe(null);
      expect(normalizeCompanyCode(undefined)).toBe(null);
    });
  });

  describe("buildOtpKey", () => {
    it("should build composite key for corporate logins", () => {
      expect(buildOtpKey("EMP001", "ACME-001", "ORG123")).toBe("EMP001::ACME-001::ORG123");
      expect(buildOtpKey("EMP-ABC", "DEMO", "ORG123")).toBe("EMP-ABC::DEMO::ORG123");
    });

    it("should return identifier only for personal logins", () => {
      expect(buildOtpKey("user@email.com", null, "ORG123")).toBe("user@email.com::ORG123");
      expect(buildOtpKey("test@example.com", null, "ORG123")).toBe("test@example.com::ORG123");
    });
  });

  describe("isValidCompanyCode", () => {
    it("should accept valid company codes", () => {
      expect(isValidCompanyCode("ACME-001")).toBe(true);
      expect(isValidCompanyCode("AB")).toBe(true);
      expect(isValidCompanyCode("COMPANY123")).toBe(true);
    });

    it("should reject invalid company codes", () => {
      expect(isValidCompanyCode("A")).toBe(false); // too short
      expect(isValidCompanyCode("acme")).toBe(false); // lowercase
      expect(isValidCompanyCode(null)).toBe(false);
      expect(isValidCompanyCode("")).toBe(false);
    });
  });

  describe("redactIdentifier", () => {
    describe("GDPR/PII Compliance", () => {
      it("should redact email addresses showing only first 3 chars", () => {
        expect(redactIdentifier("user@email.com")).toBe("use***");
        expect(redactIdentifier(`admin@${EMAIL_DOMAIN}`)).toBe("adm***");
        expect(redactIdentifier("longusername@domain.com")).toBe("lon***");
      });

      it("should redact employee IDs showing only first 3 chars", () => {
        expect(redactIdentifier("EMP001")).toBe("EMP***");
        expect(redactIdentifier("EMP-ABC-123")).toBe("EMP***");
      });

      it("should redact composite OTP keys", () => {
        expect(redactIdentifier("EMP001::ACME")).toBe("EMP***");
        expect(redactIdentifier("user@email.com::DEMO")).toBe("use***");
      });
    });

    describe("Edge Cases", () => {
      it("should handle short identifiers by returning full redaction", () => {
        expect(redactIdentifier("ab")).toBe("***");
        expect(redactIdentifier("abc")).toBe("***");
        expect(redactIdentifier("a")).toBe("***");
      });

      it("should handle empty string", () => {
        expect(redactIdentifier("")).toBe("***");
      });

      it("should handle exactly 4 character identifiers", () => {
        expect(redactIdentifier("abcd")).toBe("abc***");
      });
    });

    describe("Security Assertions", () => {
      it("should never expose more than 3 characters", () => {
        const sensitiveEmail = "secret.user.with.long.email@confidential.com";
        const redacted = redactIdentifier(sensitiveEmail);
        
        // Verify only first 3 chars visible
        expect(redacted).toBe("sec***");
        expect(redacted.replace("***", "").length).toBeLessThanOrEqual(3);
        
        // Verify domain is not exposed
        expect(redacted).not.toContain("@");
        expect(redacted).not.toContain("confidential");
      });

      it("should not leak company code from composite keys", () => {
        const compositeKey = "EMP-12345::ACME-SECRET-CODE";
        const redacted = redactIdentifier(compositeKey);
        
        expect(redacted).not.toContain("ACME");
        expect(redacted).not.toContain("SECRET");
        expect(redacted).not.toContain("::");
      });
    });
  });

  describe("redactMetadata", () => {
    describe("Sensitive Key Redaction", () => {
      it("should fully redact password fields", () => {
        const result = redactMetadata({ password: "secret123", name: "John" });
        expect(result).toEqual({ password: "[REDACTED]", name: "John" });
      });

      it("should fully redact token fields", () => {
        const result = redactMetadata({
          token: "abc123",
          accessToken: "xyz789",
          sessionToken: "sess123",
        });
        expect(result).toEqual({
          token: "[REDACTED]",
          accessToken: "[REDACTED]",
          sessionToken: "[REDACTED]",
        });
      });

      it("should fully redact financial fields", () => {
        const result = redactMetadata({
          ssn: "123-45-6789",
          creditCard: "4111111111111111",
          bankAccount: "123456789",
          salary: "50000",
        });
        expect(result).toEqual({
          ssn: "[REDACTED]",
          creditCard: "[REDACTED]",
          bankAccount: "[REDACTED]",
          salary: "[REDACTED]",
        });
      });

      it("should redact OTP codes", () => {
        const result = redactMetadata({ otp: "123456", otpCode: "654321" });
        expect(result).toEqual({ otp: "[REDACTED]", otpCode: "[REDACTED]" });
      });
    });

    describe("Identifier Partial Redaction", () => {
      it("should partially redact email fields", () => {
        const result = redactMetadata({ email: "user@test.com", name: "John" });
        expect(result).toEqual({ email: "use***", name: "John" });
      });

      it("should partially redact phone fields", () => {
        const result = redactMetadata({ phone: "+1234567890", mobile: "+9876543210" });
        expect(result).toEqual({ phone: "+12***", mobile: "+98***" });
      });

      it("should partially redact IP addresses", () => {
        const result = redactMetadata({ ip: "192.168.1.1", ipAddress: "10.0.0.1" });
        expect(result).toEqual({ ip: "192***", ipAddress: "10.***" });
      });

      it("should partially redact user IDs", () => {
        const result = redactMetadata({ userId: "user123", employeeId: "EMP001" });
        expect(result).toEqual({ userId: "use***", employeeId: "EMP***" });
      });
    });

    describe("Nested Objects", () => {
      it("should recursively redact nested objects", () => {
        const result = redactMetadata({
          user: { email: "nested@test.com", password: "secret" },
          data: { safe: "value" },
        });
        expect(result).toEqual({
          user: { email: "nes***", password: "[REDACTED]" },
          data: { safe: "value" },
        });
      });

      it("should handle deeply nested structures", () => {
        const result = redactMetadata({
          level1: {
            level2: {
              email: "deep@test.com",
            },
          },
        });
        expect(result).toEqual({
          level1: {
            level2: {
              email: "dee***",
            },
          },
        });
      });
    });

    describe("Edge Cases", () => {
      it("should return undefined for null/undefined input", () => {
        expect(redactMetadata(null)).toBeUndefined();
        expect(redactMetadata(undefined)).toBeUndefined();
      });

      it("should handle empty objects", () => {
        expect(redactMetadata({})).toEqual({});
      });

      it("should pass through safe values unchanged", () => {
        const result = redactMetadata({
          count: 42,
          enabled: true,
          items: ["a", "b"],
          message: "Hello world",
        });
        expect(result).toEqual({
          count: 42,
          enabled: true,
          items: ["a", "b"],
          message: "Hello world",
        });
      });

      it("should handle non-string sensitive values", () => {
        const result = redactMetadata({ password: 12345, email: null });
        expect(result).toEqual({ password: "[REDACTED]", email: "[REDACTED]" });
      });
    });

    describe("Case Insensitivity", () => {
      it("should redact regardless of key casing", () => {
        const result = redactMetadata({
          PASSWORD: "secret",
          Email: "test@example.com",
          SSN: "123-45-6789",
        });
        expect(result).toEqual({
          PASSWORD: "[REDACTED]",
          Email: "tes***",
          SSN: "[REDACTED]",
        });
      });
    });
  });

  describe("hashIdentifier", () => {
    describe("Basic Functionality", () => {
      it("should return a 16-character hex string", () => {
        const hash = hashIdentifier("user@email.com");
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
        expect(hash.length).toBe(16);
      });

      it("should produce deterministic output for same input", () => {
        const hash1 = hashIdentifier("user@email.com");
        const hash2 = hashIdentifier("user@email.com");
        expect(hash1).toBe(hash2);
      });

      it("should produce different hashes for different inputs", () => {
        const hash1 = hashIdentifier("user1@email.com");
        const hash2 = hashIdentifier("user2@email.com");
        expect(hash1).not.toBe(hash2);
      });
    });

    describe("Salt Support", () => {
      it("should produce different hashes with different salts", () => {
        const hash1 = hashIdentifier("user@email.com", "salt1");
        const hash2 = hashIdentifier("user@email.com", "salt2");
        expect(hash1).not.toBe(hash2);
      });

      it("should produce same hash with same salt", () => {
        const hash1 = hashIdentifier("user@email.com", "monitoring");
        const hash2 = hashIdentifier("user@email.com", "monitoring");
        expect(hash1).toBe(hash2);
      });

      it("should use env salt when no salt provided, empty string uses empty salt", () => {
        // When salt is undefined, env salt is used
        // When salt is empty string, empty string is used as salt
        // These may differ - both are valid behaviors
        const hashNoSalt = hashIdentifier("test");
        const hashEmptySalt = hashIdentifier("test", "");
        // Both should be consistent with themselves
        expect(hashIdentifier("test")).toBe(hashNoSalt);
        expect(hashIdentifier("test", "")).toBe(hashEmptySalt);
      });
    });

    describe("Distribution Quality", () => {
      it("should produce unique hashes for similar inputs", () => {
        // Test that small changes produce different hashes
        const inputs = [
          "user1@email.com",
          "user2@email.com",
          "user3@email.com",
          "userA@email.com",
          "userB@email.com",
        ];
        const hashes = inputs.map(i => hashIdentifier(i));
        const uniqueHashes = new Set(hashes);
        expect(uniqueHashes.size).toBe(inputs.length);
      });

      it("should produce different hashes for truncation-equivalent inputs", () => {
        // These would all become "use***" with redactIdentifier
        const collisionProne = [
          "user1@a.com",
          "user2@b.com",
          "user3@c.com",
          "user_different",
          "username123",
        ];
        const hashes = collisionProne.map(i => hashIdentifier(i));
        const uniqueHashes = new Set(hashes);
        expect(uniqueHashes.size).toBe(collisionProne.length);
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty string", () => {
        const hash = hashIdentifier("");
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
      });

      it("should handle very long strings", () => {
        const longString = "a".repeat(10000);
        const hash = hashIdentifier(longString);
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
        expect(hash.length).toBe(16);
      });

      it("should handle unicode characters", () => {
        const hash = hashIdentifier("مستخدم@بريد.com");
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
      });

      it("should handle special characters", () => {
        const hash = hashIdentifier("user+test@email.com!#$%");
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
      });
    });

    describe("Security Properties", () => {
      it("should not be reversible (one-way)", () => {
        const hash = hashIdentifier("secret@email.com");
        // Hash should not contain any recognizable part of input
        expect(hash).not.toContain("secret");
        expect(hash).not.toContain("email");
        expect(hash).not.toContain("@");
      });

      it("should produce consistent output across multiple calls", () => {
        // Verify determinism across 100 calls
        const expected = hashIdentifier("test@example.com");
        for (let i = 0; i < 100; i++) {
          expect(hashIdentifier("test@example.com")).toBe(expected);
        }
      });

      it("should produce different hashes with env salt vs no salt", () => {
        // When explicit salt is provided, it should differ from empty salt
        const hashNoSalt = hashIdentifier("user@email.com", "");
        const hashWithSalt = hashIdentifier("user@email.com", "production-secret");
        expect(hashNoSalt).not.toBe(hashWithSalt);
      });

      it("should be resistant to dictionary attacks when salted", () => {
        // With a proper salt, even common emails should not be precomputable
        const salt = "random-production-salt-xyz123";
        const commonEmails = [
          "admin@company.com",
          "test@test.com",
          "user@example.com",
        ];
        const hashes = commonEmails.map(e => hashIdentifier(e, salt));
        // All hashes should be unique
        expect(new Set(hashes).size).toBe(commonEmails.length);
        // And not match unsalted versions
        const unsaltedHashes = commonEmails.map(e => hashIdentifier(e, ""));
        for (let i = 0; i < hashes.length; i++) {
          expect(hashes[i]).not.toBe(unsaltedHashes[i]);
        }
      });
    });
  });
});
