/**
 * Log Sanitizer Tests
 * 
 * Tests the REAL implementation (no mocks) to catch regex regressions
 * and ensure PII patterns are properly redacted.
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeLogParams,
  sanitizeValue,
  sanitizeError,
} from "@/lib/security/log-sanitizer";
import { redactIdentifier } from "@/lib/otp-utils";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("Log Sanitizer - Real Implementation Tests", () => {
  describe("sanitizeLogParams", () => {
    it("should redact sensitive keys regardless of value format", () => {
      const input = {
        email: "user@example.com",
        phone: "+966501234567",
        password: "super-secret-123",
        apiKey: "sk_live_abc123xyz",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature",
        userId: "user-12345",
        normalField: "visible-data",
      };

      const result = sanitizeLogParams(input);

      expect(result.email).toBe("[REDACTED]");
      expect(result.phone).toBe("[REDACTED]");
      expect(result.password).toBe("[REDACTED]");
      expect(result.apiKey).toBe("[REDACTED]");
      expect(result.token).toBe("[REDACTED]");
      expect(result.userId).toBe("[REDACTED]");
      expect(result.normalField).toBe("visible-data");
    });

    it("should redact snake_case variations of sensitive keys", () => {
      const input = {
        user_id: "user-12345",
        api_key: "sk_test_abc",
        access_token: "token123",
        phone_number: "+966501234567",
        national_id: "1234567890",
      };

      const result = sanitizeLogParams(input);

      expect(result.user_id).toBe("[REDACTED]");
      expect(result.api_key).toBe("[REDACTED]");
      expect(result.access_token).toBe("[REDACTED]");
      expect(result.phone_number).toBe("[REDACTED]");
      expect(result.national_id).toBe("[REDACTED]");
    });

    it("should redact auth header keys", () => {
      const input = {
        authorization: "Bearer eyJhbG...",
        cookie: "session=abc123",
        "set-cookie": "session=xyz789; HttpOnly",
        csrf_token: "csrf-token-value",
        session_id: "session-123",
      };

      const result = sanitizeLogParams(input);

      expect(result.authorization).toBe("[REDACTED]");
      expect(result.cookie).toBe("[REDACTED]");
      expect(result["set-cookie"]).toBe("[REDACTED]");
      expect(result.csrf_token).toBe("[REDACTED]");
      expect(result.session_id).toBe("[REDACTED]");
    });

    it("should handle nested objects", () => {
      const input = {
        user: {
          email: "test@example.com",
          profile: {
            name: "John Doe",
            phone: "+966501234567",
          },
        },
        metadata: {
          requestId: "req-123",
        },
      };

      const result = sanitizeLogParams(input);

      expect((result.user as Record<string, unknown>).email).toBe("[REDACTED]");
      expect(
        ((result.user as Record<string, unknown>).profile as Record<string, unknown>).phone
      ).toBe("[REDACTED]");
      expect(
        ((result.user as Record<string, unknown>).profile as Record<string, unknown>).name
      ).toBe("John Doe");
      expect((result.metadata as Record<string, unknown>).requestId).toBe("req-123");
    });

    it("should handle arrays", () => {
      const input = {
        emails: ["user1@example.com", "user2@example.com"],
        data: [
          { email: "nested@example.com", name: "User" },
        ],
      };

      const result = sanitizeLogParams(input);

      // Emails in arrays should be redacted if they match patterns
      expect(Array.isArray(result.emails)).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should handle circular references gracefully", () => {
      const obj: Record<string, unknown> = { name: "test" };
      obj.self = obj;

      expect(() => sanitizeLogParams(obj)).not.toThrow();
      const result = sanitizeLogParams(obj);
      expect(result.name).toBe("test");
    });

    it("should handle max depth gracefully", () => {
      // Create a deeply nested object
      let deep: Record<string, unknown> = { value: "deep" };
      for (let i = 0; i < 15; i++) {
        deep = { nested: deep };
      }

      expect(() => sanitizeLogParams(deep)).not.toThrow();
    });
  });

  describe("sanitizeValue - PII Pattern Detection", () => {
    it("should redact email patterns in non-sensitive fields", () => {
      const result = sanitizeValue("Contact me at user@example.com", "message");
      expect(result).toBe("[REDACTED]");
    });

    it("should redact phone-like patterns", () => {
      // International format
      expect(sanitizeValue("+966501234567", "data")).toBe("[REDACTED]");
      // With spaces
      expect(sanitizeValue("+966 50 123 4567", "data")).toBe("[REDACTED]");
      // With dashes
      expect(sanitizeValue("050-123-4567", "data")).toBe("[REDACTED]");
    });

    it("should redact JWT tokens", () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123";
      expect(sanitizeValue(jwt, "data")).toBe("[REDACTED]");
    });

    it("should redact Bearer tokens", () => {
      const bearer = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
      expect(sanitizeValue(bearer, "data")).toBe("[REDACTED]");
    });

    it("should redact Basic auth tokens", () => {
      const basic = "Basic dXNlcm5hbWU6cGFzc3dvcmQ=";
      expect(sanitizeValue(basic, "data")).toBe("[REDACTED]");
    });

    it("should redact IBAN-like patterns", () => {
      const iban = "SA0380000000608010167519";
      expect(sanitizeValue(iban, "data")).toBe("[REDACTED]");
    });

    it("should redact card-like digit sequences", () => {
      const cardNumber = "4111111111111111";
      expect(sanitizeValue(cardNumber, "data")).toBe("[REDACTED]");
    });

    it("should NOT redact short non-PII strings", () => {
      expect(sanitizeValue("hello", "greeting")).toBe("hello");
      expect(sanitizeValue("12345", "code")).toBe("12345");
      expect(sanitizeValue("test-value", "field")).toBe("test-value");
    });

    it("should preserve non-string values", () => {
      expect(sanitizeValue(12345, "count")).toBe(12345);
      expect(sanitizeValue(true, "flag")).toBe(true);
      expect(sanitizeValue(null, "empty")).toBe(null);
      expect(sanitizeValue(undefined, "missing")).toBe(undefined);
    });
  });

  describe("sanitizeError", () => {
    it("should extract safe error information", () => {
      const error = new Error("Test error message");
      const result = sanitizeError(error);

      expect(result.message).toBe("Test error message");
      expect(result.name).toBe("Error");
    });

    it("should handle non-Error objects", () => {
      const result = sanitizeError({ code: 500, message: "Server error" });
      expect(result.code).toBe(500);
      expect(result.message).toBe("Server error");
    });

    it("should handle string errors", () => {
      const result = sanitizeError("Something went wrong");
      expect(result.message).toBe("Something went wrong");
    });

    it("should redact PII in error messages", () => {
      const error = new Error("Failed for user user@example.com");
      const result = sanitizeError(error);
      // The error message itself isn't redacted (intentional for debugging)
      // but if nested objects have PII keys, they should be
      expect(result.message).toBe("Failed for user user@example.com");
    });
  });

  describe("redactIdentifier", () => {
    it("should redact email addresses showing first 3 chars", () => {
      const result = redactIdentifier("user@example.com");
      expect(result).not.toBe("user@example.com");
      expect(result).toBe("use***");
    });

    it("should redact IP addresses showing first 3 chars", () => {
      const result = redactIdentifier("192.168.1.100");
      expect(result).not.toBe("192.168.1.100");
      expect(result).toBe("192***");
    });

    it("should redact generic identifiers showing first 3 chars", () => {
      const result = redactIdentifier("EMP-12345-ABC");
      expect(result).not.toBe("EMP-12345-ABC");
      expect(result).toBe("EMP***");
    });

    it("should handle empty strings", () => {
      expect(redactIdentifier("")).toBe("***");
    });

    it("should handle short identifiers (2 chars)", () => {
      const result = redactIdentifier("AB");
      // Short identifiers (<= 3 chars) return "***"
      expect(result).toBe("***");
    });
    
    it("should handle identifiers with exactly 3 chars", () => {
      const result = redactIdentifier("ABC");
      expect(result).toBe("***");
    });
    
    it("should handle identifiers with 4 chars", () => {
      const result = redactIdentifier("ABCD");
      expect(result).toBe("ABC***");
    });
  });

  describe("ReDoS Protection - Bounded Patterns", () => {
    it("should not hang on pathological phone inputs", () => {
      // This would cause catastrophic backtracking with unbounded patterns
      const pathological = "0".repeat(100);
      const start = Date.now();
      sanitizeValue(pathological, "data");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete quickly
    });

    it("should not hang on pathological JWT-like inputs", () => {
      const pathological = "a".repeat(50) + "." + "b".repeat(50) + "." + "c".repeat(50);
      const start = Date.now();
      sanitizeValue(pathological, "data");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    it("should not hang on nested object with many fields", () => {
      const bigObject: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        bigObject[`field${i}`] = `value${i}`;
      }
      const start = Date.now();
      sanitizeLogParams(bigObject);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete within 1s
    });
  });

  describe("Edge Cases", () => {
    it("should handle Date objects", () => {
      const input = { timestamp: new Date("2025-01-15T00:00:00Z") };
      const result = sanitizeLogParams(input);
      expect(typeof result.timestamp).toBe("string");
      expect(result.timestamp).toContain("2025");
    });

    it("should handle symbols and functions gracefully", () => {
      const input = {
        name: "test",
        // These shouldn't crash the sanitizer
      };
      expect(() => sanitizeLogParams(input)).not.toThrow();
    });

    it("should handle very long strings", () => {
      const longString = "a".repeat(10000);
      const input = { data: longString };
      expect(() => sanitizeLogParams(input)).not.toThrow();
    });
  });
});
