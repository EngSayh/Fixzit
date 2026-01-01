/**
 * @fileoverview Superadmin Chatbot Settings API Tests
 * @description Tests for GET/PUT /api/superadmin/content/chatbot
 */
import { expectAuthFailure, expectValidationFailure, expectSuccess, expectRateLimited } from '@/tests/api/_helpers';
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing the route
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/server/models/ChatbotSettings", () => ({
  ChatbotSettings: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
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

// Dynamic imports AFTER mocks are set up
const { GET, PUT } = await import("@/app/api/superadmin/content/chatbot/route");
const { ChatbotSettings } = await import("@/server/models/ChatbotSettings");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Superadmin Chatbot Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");

    // Default: rate limit allows requests
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET /api/superadmin/content/chatbot", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expectAuthFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expectRateLimited(response);
    });

    it("should return default settings when none exist", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(ChatbotSettings.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expectSuccess(response);
      const data = await response.json();
      expect(data.enabled).toBe(true);
      expect(data.provider).toBe("internal");
      expect(data.primaryColor).toBe("#0061A8");
      expect(data.hasApiKey).toBe(false);
    });

    it("should return existing settings with hasApiKey flag", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(ChatbotSettings.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          enabled: true,
          provider: "openai",
          apiKey: "encrypted-key-here",
          model: "gpt-4",
          welcomeMessage: "Custom welcome",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expectSuccess(response);
      const data = await response.json();
      expect(data.hasApiKey).toBe(true);
      expect(data.apiKey).toBeUndefined(); // API key should never be returned
      expect(data.provider).toBe("openai");
    });

    it("should include X-Robots-Tag header", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(ChatbotSettings.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });
  });

  describe("PUT /api/superadmin/content/chatbot", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectRateLimited(response);
    });

    it("should return 400 for invalid JSON body", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: null,
        error: "Invalid JSON",
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Invalid JSON");
    });

    it("should return 400 for invalid hex color", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { primaryColor: "not-a-hex" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Validation failed");
    });

    it("should return 400 for invalid provider", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { provider: "invalid-provider" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
    });

    it("should update settings successfully", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          enabled: false,
          provider: "anthropic",
          welcomeMessage: "Updated welcome",
        },
        error: null,
      });
      vi.mocked(ChatbotSettings.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          enabled: false,
          provider: "anthropic",
          welcomeMessage: "Updated welcome",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectSuccess(response);
      const data = await response.json();
      // Route returns spread of settings, not nested object
      expect(data.enabled).toBe(false);
      expect(data.provider).toBe("anthropic");
    });

    it("should clear API key when empty string provided", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { newApiKey: "" },
        error: null,
      });
      vi.mocked(ChatbotSettings.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          apiKey: null,
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectSuccess(response);
      expect(ChatbotSettings.findOneAndUpdate).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ $set: expect.objectContaining({ apiKey: null }) }),
        expect.any(Object)
      );
    });

    it("should validate maxTokens range (100-4000)", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { maxTokens: 5000 }, // Above max
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
    });

    it("should validate temperature range (0-2)", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { temperature: 3 }, // Above max
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
    });
  });
});
