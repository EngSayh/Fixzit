import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

// Mocks must be declared before importing the route to ensure they apply
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockValidate = vi.fn(async () => true);
const mockPersist = vi.fn(async () => undefined);
vi.mock("@/lib/refresh-token-store", () => ({
  validateRefreshJti: (...args: unknown[]) => mockValidate(...args),
  persistRefreshJti: (...args: unknown[]) => mockPersist(...args),
}));

const mockConnect = vi.fn();
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: (...args: unknown[]) => mockConnect(...args),
}));

const mockFindById = vi.fn();
vi.mock("@/server/models/User", () => ({
  User: {
    findById: (...args: unknown[]) => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockImplementation(async () => mockFindById(...args)),
    }),
  },
}));

import { NextRequest } from "next/server";
import { POST, REFRESH_COOKIE } from "@/app/api/auth/refresh/route";
import { logger } from "@/lib/logger";

function makeRequest(token: string) {
  return new NextRequest("https://example.com/api/auth/refresh", {
    method: "POST",
    headers: {
      cookie: `${REFRESH_COOKIE}=${token}`,
    },
  });
}

describe("auth/refresh route", () => {
  const secret = "test-secret";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = secret;
    mockFindById.mockResolvedValue({
      status: "ACTIVE",
      professional: { role: "TENANT" },
      orgId: "org-1",
    });
    mockConnect.mockResolvedValue(undefined);
  });

  it("rejects tokens missing refresh type (prevents access-token replay)", async () => {
    const accessToken = jwt.sign({ sub: "user-1" }, secret, { expiresIn: 60 });
    const req = makeRequest(accessToken);

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid token type" });
  });

  it("accepts valid refresh tokens with type=refresh and matches session user", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const refreshToken = jwt.sign(
      { sub: userId, type: "refresh", jti: "jti-123" },
      secret,
      { expiresIn: 60 },
    );
    mockAuth.mockResolvedValue({
      user: { id: userId, role: "TENANT", orgId: "org-1" },
    });

    const req = makeRequest(refreshToken);
    const res = await POST(req);

    const errors = (logger.error as unknown as { mock: { calls: unknown[][] } }).mock
      .calls;
    const body = await res.json();
    expect(mockAuth).toHaveBeenCalledTimes(1);
    expect(errors).toEqual([]);
    expect(res.status).toBe(200);
    expect(body).toHaveProperty("accessToken");
  });
});
