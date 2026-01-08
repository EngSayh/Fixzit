/**
 * @fileoverview Tests for Superadmin Chatbot Settings API
 * @route GET/PUT /api/superadmin/content/chatbot
 * @agent [AGENT-001-A]
 */
import { expectAuthFailure } from '@/tests/api/_helpers';
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
    create: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Dynamic imports AFTER mocks
const { GET, PUT } = await import("@/app/api/superadmin/content/chatbot/route");
const { ChatbotSettings } = await import("@/server/models/ChatbotSettings");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Superadmin Chatbot Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
      orgId: "org-123",
    } as any);
  });

  describe("GET /api/superadmin/content/chatbot", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it("should return default settings when no settings exist", async () => {
      vi.mocked(ChatbotSettings.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.enabled).toBe(true);
      expect(data.provider).toBe("internal");
      expect(data.welcomeMessage).toBeDefined();
      expect(data.hasApiKey).toBe(false);
    });

    it("should return existing settings with API key masked", async () => {
      vi.mocked(ChatbotSettings.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          enabled: true,
          provider: "openai",
          apiKey: "sk-secret-key",
          model: "gpt-4",
          welcomeMessage: "Hello!",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.hasApiKey).toBe(true);
      expect(data.apiKey).toBeUndefined();
    });
  });

  describe("PUT /api/superadmin/content/chatbot", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
        body: JSON.stringify({ enabled: false }),
      });
      const response = await PUT(request);

      expectAuthFailure(response);
    });

    it("should update chatbot settings", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: true,
        data: { enabled: false, welcomeMessage: "Hi there!" },
      } as any);

      vi.mocked(ChatbotSettings.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          enabled: false,
          welcomeMessage: "Hi there!",
          provider: "internal",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
        body: JSON.stringify({ enabled: false, welcomeMessage: "Hi there!" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.enabled).toBe(false);
    });

    it("should validate color format", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: false,
        error: { issues: [{ path: ["primaryColor"], message: "Invalid hex color" }] },
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
        body: JSON.stringify({ primaryColor: "invalid-color" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
    });

    it("should allow updating API key", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: true,
        data: { newApiKey: "sk-new-api-key-12345" },
      } as any);

      vi.mocked(ChatbotSettings.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          enabled: true,
          provider: "openai",
          apiKeyEncrypted: "encrypted",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/chatbot", {
        method: "PUT",
        body: JSON.stringify({ newApiKey: "sk-new-api-key-12345" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
    });
  });
});
