import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockFindById = vi.fn();
const mockPersistJti = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findById: (...args: unknown[]) => ({
      select: () => ({
        lean: async () => mockFindById(...args),
      }),
    }),
  },
}));

vi.mock("@/lib/refresh-token-store", () => ({
  persistRefreshJti: (...args: unknown[]) => mockPersistJti(...args),
}));

import { POST } from "@/app/api/auth/post-login/route";
import { UserStatus } from "@/types/user";

describe("auth/post-login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.AUTH_SECRET = "secret";
  });

  it("returns 401 when session is missing", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest("http://example.com/api/auth/post-login", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("denies token issuance for inactive users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockFindById.mockResolvedValueOnce({
      status: "PENDING",
      professional: {},
    });
    const req = new NextRequest("http://example.com/api/auth/post-login", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockPersistJti).not.toHaveBeenCalled();
  });

  it("issues access and refresh cookies for active users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockFindById.mockResolvedValueOnce({
      status: UserStatus.ACTIVE,
      professional: { role: "TENANT" },
      orgId: "org-1",
    });
    const req = new NextRequest("http://example.com/api/auth/post-login", {
      method: "POST",
    });

    const res = await POST(req);
    const cookies = res.cookies.getAll();

    expect(res.status).toBe(200);
    expect(mockPersistJti).toHaveBeenCalled();
    expect(cookies.some((c) => c.name === "fxz.access")).toBe(true);
    expect(cookies.some((c) => c.name === "fxz.refresh")).toBe(true);
  });
});
