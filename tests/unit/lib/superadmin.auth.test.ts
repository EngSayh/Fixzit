import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  applySuperadminCookies,
  clearSuperadminCookies,
  SUPERADMIN_COOKIE_NAME,
} from "@/lib/superadmin/auth";

describe("superadmin cookies", () => {
  let response: Response;
  let mockCookies: { set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";

    mockCookies = {
      set: vi.fn(),
    };
    response = { cookies: mockCookies } as unknown as Response;
  });

  it("sets the session cookie at root path for UI and API access", () => {
    applySuperadminCookies(response, "token-123", 3600);

    expect(mockCookies.set).toHaveBeenCalledWith(
      SUPERADMIN_COOKIE_NAME,
      "token-123",
      expect.objectContaining({
        path: "/",
      })
    );
  });

  it("clears cookies across legacy paths and names", () => {
    clearSuperadminCookies(response);

    const calls = mockCookies.set.mock.calls;
    const paths = calls.map(([, , opts]) => opts.path);
    const names = calls.map(([name]) => name);

    expect(paths).toEqual(
      expect.arrayContaining(["/", "/superadmin", "/api/superadmin", "/api/issues"])
    );
    expect(names).toEqual(
      expect.arrayContaining([SUPERADMIN_COOKIE_NAME, `${SUPERADMIN_COOKIE_NAME}.legacy`])
    );
  });
});
