import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

process.env.SKIP_ENV_VALIDATION = "true";
process.env.NEXTAUTH_SECRET = "test-secret-refresh-32chars";

type JsonBody = Record<string, unknown>;
type JsonResponse = { status: number; body: JsonBody };

vi.mock("next/server", () => {
  const mockNextResponseJson = (body: JsonBody, init?: ResponseInit): JsonResponse => ({
    status: init?.status ?? 200,
    body,
  });

  return {
    NextRequest: class {},
    NextResponse: {
      json: mockNextResponseJson,
    },
  };
});

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

const mockUser = {
  findById: vi.fn(),
};
vi.mock("@/server/models/User", () => ({
  User: mockUser,
}));

const mockValidate = vi.fn();
const mockPersist = vi.fn();
const mockRevoke = vi.fn();
vi.mock("@/lib/refresh-token-store", () => ({
  validateRefreshJti: (...args: unknown[]) => mockValidate(...args),
  persistRefreshJti: (...args: unknown[]) => mockPersist(...args),
  revokeRefreshJti: (...args: unknown[]) => mockRevoke(...args),
}));

let POST: any;

describe("API /api/auth/refresh replay protection", () => {
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/auth/refresh/route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    mockAuth.mockResolvedValue({
      user: { id: "u1", role: "TENANT", orgId: "org1" },
    });
    mockUser.findById.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve({
            status: "ACTIVE",
            professional: { role: "TENANT" },
            orgId: "org1",
          }),
      }),
    });
    mockValidate.mockResolvedValue(true);
  });

  const makeReq = (token: string) =>
    ({
      cookies: { get: () => ({ value: token }) },
      nextUrl: new URL("https://example.com/api/auth/refresh"),
    } as any);

  it("rejects token without jti", async () => {
    const token = jwt.sign({ sub: "u1", type: "refresh" }, process.env.NEXTAUTH_SECRET!, {
      expiresIn: 60,
    });
    const res = await POST(makeReq(token));
    expect(res.status).toBe(401);
  });

  it("rejects unknown jti in production", async () => {
    process.env.NODE_ENV = "production";
    mockValidate.mockResolvedValue(false);
    const token = jwt.sign(
      { sub: "u1", type: "refresh", jti: "unknown" },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: 60 },
    );
    const res = await POST(makeReq(token));
    expect(res.status).toBe(401);
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it("registers unknown jti once in non-production", async () => {
    process.env.NODE_ENV = "test";
    mockValidate.mockResolvedValue(false);
    const token = jwt.sign(
      { sub: "u1", type: "refresh", jti: "legacy" },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: 60 },
    );
    const res = await POST(makeReq(token));
    expect(res.status).toBe(200);
    expect(mockPersist).toHaveBeenCalledWith("u1", "legacy", expect.any(Number));
  });

  it("allows known jti and rotates to new jti", async () => {
    mockValidate.mockResolvedValue(true);
    const token = jwt.sign(
      { sub: "u1", type: "refresh", jti: "known" },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: 60 },
    );
    const res = await POST(makeReq(token));
    expect(res.status).toBe(200);
    expect(mockPersist).toHaveBeenCalledWith("u1", expect.any(String), expect.any(Number));
    // Verify old JTI is revoked during rotation
    expect(mockRevoke).toHaveBeenCalledWith("u1", "known");
  });
});
