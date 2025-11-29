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
} from "@/lib/otp-utils";

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
      expect(buildOtpKey("EMP001", "ACME-001")).toBe("EMP001::ACME-001");
      expect(buildOtpKey("EMP-ABC", "DEMO")).toBe("EMP-ABC::DEMO");
    });

    it("should return identifier only for personal logins", () => {
      expect(buildOtpKey("user@email.com", null)).toBe("user@email.com");
      expect(buildOtpKey("test@example.com", null)).toBe("test@example.com");
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
        expect(redactIdentifier("admin@fixzit.co")).toBe("adm***");
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
});
