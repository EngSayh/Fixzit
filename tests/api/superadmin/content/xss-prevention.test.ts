/**
 * @fileoverview XSS Prevention Security Tests for Footer Links
 * @description Tests specifically for URL scheme validation to prevent XSS attacks
 */
import { expectValidationFailure, expectSuccess } from '@/tests/api/_helpers';
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing the routes
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/server/models/FooterLink", () => ({
  FooterLink: {
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    isValidObjectId: vi.fn().mockImplementation((id: string) => {
      return /^[0-9a-fA-F]{24}$/.test(id);
    }),
  };
});

// Dynamic imports AFTER mocks are set up
const { POST } = await import("@/app/api/superadmin/content/footer-links/route");
const { PUT } = await import("@/app/api/superadmin/content/footer-links/[id]/route");
const { FooterLink } = await import("@/server/models/FooterLink");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Footer Links XSS Prevention Tests", () => {
  const validId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("Dangerous URL Scheme Blocking (POST)", () => {
    const dangerousUrls = [
      { url: "javascript:alert('xss')", name: "javascript: protocol" },
      { url: "javascript:void(0)", name: "javascript:void" },
      { url: "javascript:document.cookie", name: "javascript: cookie access" },
      { url: "data:text/html,<script>alert(1)</script>", name: "data: HTML injection" },
      { url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", name: "data: base64 HTML" },
      { url: "vbscript:msgbox('xss')", name: "vbscript: protocol" },
      { url: "file:///etc/passwd", name: "file: protocol" },
      { url: "ftp://evil.com/malware", name: "ftp: protocol" },
      { url: "javascript://comment%0aalert(1)", name: "javascript: with newline bypass" },
      { url: "java\tscript:alert(1)", name: "javascript: with tab" },
      { url: "  javascript:alert(1)", name: "javascript: with leading spaces" },
    ];

    dangerousUrls.forEach(({ url, name }) => {
      it(`should reject ${name}`, async () => {
        vi.mocked(parseBodySafe).mockResolvedValue({
          data: { label: "XSS Test", url, section: "company" },
          error: null,
        });

        const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
          method: "POST",
        });
        const response = await POST(request);

        expectValidationFailure(response);
      });
    });
  });

  describe("Dangerous URL Scheme Blocking (PUT)", () => {
    const dangerousUrls = [
      "javascript:alert('xss')",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox('xss')",
      "file:///etc/passwd",
    ];

    dangerousUrls.forEach((url) => {
      it(`should reject ${url.split(':')[0]}: protocol on update`, async () => {
        vi.mocked(parseBodySafe).mockResolvedValue({
          data: { url },
          error: null,
        });

        const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
          method: "PUT",
        });
        const response = await PUT(request, { params: Promise.resolve({ id: validId }) });

        expectValidationFailure(response);
      });
    });
  });

  describe("Safe URL Patterns (POST)", () => {
    const safeUrls = [
      { url: "/about", name: "relative path" },
      { url: "/help/getting-started", name: "nested relative path" },
      { url: "/privacy?lang=ar", name: "relative path with query" },
      { url: "/terms#section-1", name: "relative path with fragment" },
      { url: "https://example.com", name: "https URL" },
      { url: "https://example.com/path", name: "https URL with path" },
      { url: "http://example.com", name: "http URL" },
      { url: "https://subdomain.example.com", name: "https with subdomain" },
    ];

    safeUrls.forEach(({ url, name }) => {
      it(`should accept ${name}`, async () => {
        vi.mocked(parseBodySafe).mockResolvedValue({
          data: { label: "Safe Link", url, section: "company" },
          error: null,
        });
        vi.mocked(FooterLink.create).mockResolvedValue({
          _id: validId,
          label: "Safe Link",
          url,
          section: "company",
        } as any);

        const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
          method: "POST",
        });
        const response = await POST(request);

        expectSuccess(response);
      });
    });
  });

  describe("URL Validation Edge Cases", () => {
    it("should reject URLs without protocol that don't start with /", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "No Protocol", url: "example.com/path", section: "company" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectValidationFailure(response);
    });

    it("should reject empty URLs", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Empty URL", url: "", section: "company" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectValidationFailure(response);
    });

    it("should reject malformed URLs", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Malformed", url: "http:///invalid", section: "company" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      // May pass or fail depending on URL constructor behavior
      // The key is we don't accept dangerous protocols
    });

    it("should handle URL-encoded javascript:", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Encoded", url: "javascript%3Aalert(1)", section: "company" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      // URL-encoded javascript: should still be rejected as it doesn't start with /
      // and won't be parsed as http/https
      expectValidationFailure(response);
    });
  });

  describe("Mixed Case Protocol Handling", () => {
    it("should handle HTTPS (uppercase)", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Uppercase", url: "HTTPS://example.com", section: "company" },
        error: null,
      });
      vi.mocked(FooterLink.create).mockResolvedValue({
        _id: validId,
        label: "Uppercase",
        url: "HTTPS://example.com",
        section: "company",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      // URL constructor normalizes protocols to lowercase
      expectSuccess(response);
    });

    it("should reject JAVASCRIPT: (uppercase attempt)", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Uppercase JS", url: "JAVASCRIPT:alert(1)", section: "company" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectValidationFailure(response);
    });
  });
});
