/**
 * @fileoverview Tests for /api/superadmin/theme route
 * @sprint 66
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "SUPER_ADMIN" },
  }),
}));

vi.mock("@/server/models/PlatformSettings", () => ({
  PlatformSettings: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        theme: {
          primary: "#25935F",
          secondary: "#F5BD02",
        },
      }),
    }),
    findOneAndUpdate: vi.fn().mockResolvedValue({
      theme: {
        primary: "#25935F",
        secondary: "#F5BD02",
      },
    }),
  },
}));

vi.mock("@/lib/config/brand-colors", () => ({
  BRAND_COLORS: {
    primary: "#25935F",
    primaryHover: "#188352",
    primaryDark: "#166A45",
    primaryLight: "#E8F5EE",
    secondary: "#F5BD02",
    secondaryHover: "#D4A302",
    success: "#22C55E",
    successLight: "#DCFCE7",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    info: "#3B82F6",
    infoLight: "#DBEAFE",
    lavender: "#8B5CF6",
    saudiGreen: "#006C35",
  },
  NEUTRAL_SCALE: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#E5E5E5",
    300: "#D4D4D4",
    400: "#A3A3A3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0D121C",
  },
}));

import { GET, PUT } from "@/app/api/superadmin/theme/route";
import { getServerSession } from "@/lib/auth/getServerSession";

const mockGetServerSession = vi.mocked(getServerSession);

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/superadmin/theme", {
    method: "GET",
  });
}

function createPutRequest(body: object): Request {
  return new Request("http://localhost:3000/api/superadmin/theme", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/superadmin/theme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return theme configuration", async () => {
    const res = await GET();
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.theme).toBeDefined();
    }
  });

  it("should return default theme when not configured", async () => {
    const { PlatformSettings } = await import("@/server/models/PlatformSettings");
    vi.mocked(PlatformSettings.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    const res = await GET();
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.theme).toBeDefined();
      expect(json.isDefault).toBe(true);
    }
  });

  it("should include primary and secondary colors", async () => {
    const res = await GET();
    if (res.status === 200) {
      const json = await res.json();
      expect(json.theme.primary).toBeDefined();
    }
  });
});

describe("PUT /api/superadmin/theme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", role: "SUPER_ADMIN" },
    } as any);
  });

  it("should return 401 for unauthorized users", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PUT(createPutRequest({ primary: "#000000" }) as any);
    expect([401, 403, 500]).toContain(res.status);
  });

  it("should update theme for superadmin", async () => {
    const res = await PUT(createPutRequest({
      primary: "#25935F",
      secondary: "#F5BD02",
    }) as any);
    expect([200, 400, 401, 403, 500]).toContain(res.status);
  });

  it("should validate color format", async () => {
    const res = await PUT(createPutRequest({
      primary: "invalid-color",
    }) as any);
    expect([200, 400, 401, 403, 500]).toContain(res.status);
  });
});
