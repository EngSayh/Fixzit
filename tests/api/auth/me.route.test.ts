import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { GET } from "@/app/api/auth/me/route";

describe("auth/me route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guest payload when no session exists", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ authenticated: false, user: null });
  });

  it("returns user payload when session is present", async () => {
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "TENANT",
        orgId: "org-1",
        permissions: ["read"],
        isSuperAdmin: false,
      },
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(body.user).toMatchObject({
      id: "user-1",
      email: "user@example.com",
      role: "TENANT",
      orgId: "org-1",
    });
  });
});
