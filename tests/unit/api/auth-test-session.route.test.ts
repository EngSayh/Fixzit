import { describe, it, expect, vi, beforeEach } from "vitest";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const connectToDatabaseMock = vi.fn();
const findOneLeanMock = vi.fn();
const findOneMock = vi.fn(() => ({ lean: findOneLeanMock }));
const loggerErrorMock = vi.fn();

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/server/models/User", () => ({
  User: {
    findOne: findOneMock,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

// Minimal NextRequest stub for handler
function buildRequest(body: Record<string, unknown>) {
  const nextUrl = new URL("https://example.com/api/auth/test/session");
  return {
    nextUrl,
    json: vi.fn().mockResolvedValue(body),
  } as unknown;
}

describe("POST /api/auth/test/session (fail-closed)", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(enforceRateLimit).mockReturnValue(null);
    connectToDatabaseMock.mockResolvedValue(undefined);
    findOneLeanMock.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      orgId: "507f1f77bcf86cd799439012",
      professional: { role: "ADMIN" },
      roles: ["ADMIN"],
      permissions: ["*"],
    });
  });

  it("returns 503 when Mongo connection fails (no token minted)", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("no mongo"));
    const mod = await import("@/app/api/auth/test/session/route");
    const res = await mod.POST(
      buildRequest({ email: "user@example.com", orgId: "507f1f77bcf86cd799439012" }) as any,
    );

    expect(res.status).toBe(503);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "[auth:test:session] Mongo connection failed",
      expect.objectContaining({
        orgId: "507f1f77bcf86cd799439012",
      }),
    );
  });

  it("returns 404 when user not found", async () => {
    findOneLeanMock.mockResolvedValueOnce(null);
    const mod = await import("@/app/api/auth/test/session/route");
    const res = await mod.POST(
      buildRequest({ email: "nouser@example.com", orgId: "507f1f77bcf86cd799439012" }) as any,
    );

    expect(res.status).toBe(404);
    expect(findOneMock).toHaveBeenCalled();
  });
});
