import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/admin/notifications/test/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin-1", role: "SUPER_ADMIN" } })),
}));
vi.mock("@/lib/audit", () => ({
  audit: vi.fn(async () => {}),
}));

describe("Admin test notifications endpoint", () => {
  beforeEach(() => {
    process.env.WHATSAPP_BUSINESS_API_KEY = "test-key";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "12345";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHATSAPP_BUSINESS_API_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  it("sanitizes WhatsApp provider errors and does not leak raw payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: "Rate limit hit", code: 4, type: "OAuthException" },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new Request("http://localhost/api/admin/notifications/test", {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: "+15551234567",
        channel: "whatsapp",
        message: "hello",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("WhatsApp API error: Rate limit hit");
    expect(JSON.stringify(body.error)).not.toContain("OAuthException");
  });
});
