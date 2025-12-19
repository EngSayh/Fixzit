import { describe, it, expect } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  signPasswordResetToken,
  verifyPasswordResetToken,
  passwordResetLink,
} from "@/lib/auth/passwordReset";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

describe("Password Reset Token", () => {
  const TEST_SECRET = "test-secret-key-12345";
  const TEST_EMAIL = "user@example.com";

  describe("signPasswordResetToken", () => {
    it("generates a base64url encoded token", () => {
      const token = signPasswordResetToken(TEST_EMAIL, TEST_SECRET);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      // base64url should not contain + / =
      expect(token).not.toMatch(/[+/=]/);
    });

    it("generates different tokens for same email (due to random component)", () => {
      const token1 = signPasswordResetToken(TEST_EMAIL, TEST_SECRET);
      const token2 = signPasswordResetToken(TEST_EMAIL, TEST_SECRET);
      expect(token1).not.toBe(token2);
    });

    it("generates different tokens with different secrets", () => {
      const token1 = signPasswordResetToken(TEST_EMAIL, "secret1");
      const token2 = signPasswordResetToken(TEST_EMAIL, "secret2");
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyPasswordResetToken", () => {
    it("validates a correctly signed token", () => {
      const now = Date.now();
      const token = signPasswordResetToken(TEST_EMAIL, TEST_SECRET, now);
      const result = verifyPasswordResetToken(token, TEST_SECRET, now);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.email).toBe(TEST_EMAIL);
      }
    });

    it("rejects token signed with different secret", () => {
      const token = signPasswordResetToken(TEST_EMAIL, "secret1");
      const result = verifyPasswordResetToken(token, "secret2");
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("signature");
      }
    });

    it("rejects expired token (after 1 hour)", () => {
      const now = Date.now();
      const token = signPasswordResetToken(TEST_EMAIL, TEST_SECRET, now);
      
      // Verify just before expiry works
      const almostExpired = now + 59 * 60 * 1000; // 59 minutes later
      const result1 = verifyPasswordResetToken(token, TEST_SECRET, almostExpired);
      expect(result1.ok).toBe(true);
      
      // Verify after expiry fails
      const afterExpiry = now + 61 * 60 * 1000; // 61 minutes later
      const result2 = verifyPasswordResetToken(token, TEST_SECRET, afterExpiry);
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.reason).toBe("expired");
      }
    });

    it("rejects malformed token", () => {
      const result = verifyPasswordResetToken("invalid-token", TEST_SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid");
      }
    });

    it("rejects empty token", () => {
      const result = verifyPasswordResetToken("", TEST_SECRET);
      expect(result.ok).toBe(false);
    });

    it("rejects token with tampered email", () => {
      const token = signPasswordResetToken(TEST_EMAIL, TEST_SECRET);
      // Decode, modify, and re-encode (won't have valid signature)
      const decoded = Buffer.from(token, "base64url").toString("utf8");
      const parts = decoded.split("|");
      parts[0] = "hacker@evil.com"; // tamper email
      const tampered = Buffer.from(parts.join("|")).toString("base64url");
      
      const result = verifyPasswordResetToken(tampered, TEST_SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("signature");
      }
    });
  });

  describe("passwordResetLink", () => {
    it("builds correct reset URL", () => {
      const token = "test-token-123";
      const origin = "https://fixzit.co";
      const link = passwordResetLink(origin, token);
      
      expect(link).toBe("https://fixzit.co/forgot-password/reset?token=test-token-123");
    });

    it("handles origin without trailing slash", () => {
      const link = passwordResetLink("https://example.com", "abc");
      expect(link).toBe("https://example.com/forgot-password/reset?token=abc");
    });
  });
});
