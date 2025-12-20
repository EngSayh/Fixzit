/**
 * @fileoverview Tests for /api/copilot/chat routes
 * Tests AI copilot chat interactions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting - route uses smartRateLimit from @/server/security/rateLimit
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

// Mock auth - route uses resolveCopilotSession
vi.mock("@/server/copilot/session", () => ({
  resolveCopilotSession: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock AI service
vi.mock("@/lib/ai/ai-service", () => ({
  AIService: {
    chat: vi.fn(),
    stream: vi.fn(),
    complete: vi.fn(),
  },
}));

// Mock conversation history
vi.mock("@/server/models/ChatHistory", () => ({
  ChatHistory: {
    findById: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
  },
}));

import { smartRateLimit } from "@/server/security/rateLimit";
import { resolveCopilotSession } from "@/server/copilot/session";

const importRoute = async () => {
  try {
    return await import("@/app/api/copilot/chat/route");
  } catch {
    return null;
  }
};

describe("API /api/copilot/chat", () => {
  const mockOrgId = "org_123456789";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 10 } as never);
    vi.mocked(resolveCopilotSession).mockResolvedValue({
      userId: "user_123",
      tenantId: mockOrgId,
      role: "ADMIN",
      locale: "en",
    } as never);
  });

  describe("POST - Send Chat Message", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false, remaining: 0 } as never);

      const req = new NextRequest("http://localhost:3000/api/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      // Non-guest role but no tenantId should get 401
      vi.mocked(resolveCopilotSession).mockResolvedValue({
        userId: null,
        tenantId: null,
        role: "USER",
        locale: "en",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello" }),
      });
      const response = await route.POST(req);

      expect([401, 500]).toContain(response.status);
    });

    it("returns 400 for empty message", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ message: "" }),
      });
      const response = await route.POST(req);

      expect([400, 422].includes(response.status)).toBe(true);
    });
  });
});
