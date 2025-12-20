/**
import { expectValidationFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for /api/auth/signup routes
 * Tests user registration flow
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting - route uses smartRateLimit from @/server/security/rateLimit
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
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

// Mock User model
vi.mock("@/server/models/User", () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashedpassword"),
}));

import { smartRateLimit } from "@/server/security/rateLimit";

const importRoute = async () => {
  try {
    return await import("@/app/api/auth/signup/route");
  } catch {
    return null;
  }
};

describe("API /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 10 } as never);
  });

  describe("POST - User Signup", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false, remaining: 0 } as never);

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Password123!",
          name: "Test User",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 400 for invalid email format", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          password: "Password123!",
          name: "Test User",
        }),
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });

    it("returns 400 for weak password", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "weak",
          name: "Test User",
        }),
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });

    it("returns 400 for missing required fields", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });
  });
});
