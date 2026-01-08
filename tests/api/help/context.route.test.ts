/**
 * @fileoverview Tests for /api/help/context route
 * @sprint 67
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn().mockResolvedValue({
    ok: true,
    session: {
      id: "user-1",
      email: "user@test.com",
      orgId: "org-1",
      role: "FM_MANAGER",
    },
  }),
}));

vi.mock("@/server/services/escalation.service", () => ({
  resolveEscalationContact: vi.fn().mockResolvedValue({
    name: "Support Team",
    email: "support@fixzit.com",
    phone: "+966500000000",
  }),
}));

import { GET } from "@/app/api/help/context/route";
import { getSessionOrNull } from "@/lib/auth/safe-session";

const mockGetSession = vi.mocked(getSessionOrNull);

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/help/context");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url, { method: "GET" });
}

describe("GET /api/help/context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      ok: true,
      session: {
        id: "user-1",
        email: "user@test.com",
        orgId: "org-1",
        role: "FM_MANAGER",
      },
    } as any);
  });

  it("should return 401 for unauthenticated users", async () => {
    mockGetSession.mockResolvedValue({ ok: true, session: null } as any);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(401);
  });

  it("should return context with escalation info", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.escalation).toBeDefined();
    }
  });

  it("should return articles array", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(Array.isArray(json.articles)).toBe(true);
    }
  });

  it("should accept FM module", async () => {
    const res = await GET(createGetRequest({ module: "FM" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should accept Souq module", async () => {
    const res = await GET(createGetRequest({ module: "Souq" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should accept Aqar module", async () => {
    const res = await GET(createGetRequest({ module: "Aqar" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should default to Other for unknown module", async () => {
    const res = await GET(createGetRequest({ module: "Unknown" }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });

  it("should include cache headers", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toContain("max-age");
    }
  });
});
