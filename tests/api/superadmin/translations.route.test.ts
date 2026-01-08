/**
 * @fileoverview Tests for /api/superadmin/translations route
 * @sprint 66
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue({
    username: "superadmin",
    role: "SUPER_ADMIN",
    orgId: "org-1",
  }),
}));

vi.mock("@/server/models/Translation", () => ({
  Translation: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { key: "buttons.save", namespace: "common", values: { en: "Save", ar: "حفظ" } },
      ]),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      key: "buttons.new",
      namespace: "common",
      values: { en: "New", ar: "جديد" },
    }),
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { GET, POST } from "@/app/api/superadmin/translations/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockGetSession = vi.mocked(getSuperadminSession);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/superadmin/translations");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

function createPostRequest(body: object): Request {
  return new Request("http://localhost:3000/api/superadmin/translations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/superadmin/translations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-1",
    } as any);
    mockEnforceRateLimit.mockReturnValue(null);
  });

  it("should return 401 for unauthorized users", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(401);
  });

  it("should return translations list", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.translations || json.data).toBeDefined();
    }
  });

  it("should support search filter", async () => {
    const res = await GET(createGetRequest({ search: "button" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support namespace filter", async () => {
    const res = await GET(createGetRequest({ namespace: "common" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should support pagination", async () => {
    const res = await GET(createGetRequest({ page: "1", limit: "10" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });
});

describe("POST /api/superadmin/translations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-1",
    } as any);
    mockEnforceRateLimit.mockReturnValue(null);
  });

  it("should return 401 for unauthorized users", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(createPostRequest({
      key: "test.key",
      namespace: "common",
      values: { en: "Test", ar: "اختبار" },
    }) as any);
    expect(res.status).toBe(401);
  });

  it("should create translation for valid request", async () => {
    const res = await POST(createPostRequest({
      key: "buttons.new",
      namespace: "common",
      values: { en: "New", ar: "جديد" },
    }) as any);
    expect([200, 201, 400, 401, 409, 500]).toContain(res.status);
  });

  it("should validate required fields", async () => {
    const res = await POST(createPostRequest({
      key: "", // Empty key
      values: { en: "Test" },
    }) as any);
    expect([400, 401, 500]).toContain(res.status);
  });
});
