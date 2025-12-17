/**
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  email?: string;
  role?: string;
};
let sessionUser: SessionUser | null = {
  email: "admin@fixzit.co",
  role: "SUPER_ADMIN",
};

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));
vi.mock("@/lib/mongodb-unified", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/server/models/SMSSettings", () => ({
  SMSSettings: {
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock("@/lib/api/parse-body", () => ({ parseBodySafe: vi.fn() }));
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(undefined),
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { connectToDatabase } = await import("@/lib/mongodb-unified");
const { SMSSettings } = await import("@/server/models/SMSSettings");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Admin SMS Settings API - SSRF protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionUser = { role: "SUPER_ADMIN", email: "admin@fixzit.co" };
    vi.mocked(connectToDatabase).mockResolvedValue(undefined as any);
  });

  const buildRequest = (body?: string) =>
    new NextRequest("http://localhost/api/admin/sms/settings", {
      method: "PUT",
      body,
    });

  it("rejects non-HTTPS webhook URLs", async () => {
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { slaBreachNotifyWebhook: "http://localhost:3000/webhook" },
      error: null,
    });

    const { PUT } = await import("@/app/api/admin/sms/settings/route");
    const res = await PUT(buildRequest());

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("HTTPS");
    expect(SMSSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("allows valid public HTTPS webhook URLs", async () => {
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { slaBreachNotifyWebhook: "https://hooks.example.com/notify" },
      error: null,
    });
    vi.mocked(SMSSettings.findOneAndUpdate).mockResolvedValue({} as any);

    const { PUT } = await import("@/app/api/admin/sms/settings/route");
    const res = await PUT(buildRequest());

    expect(res.status).toBe(200);
    expect(SMSSettings.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({
          slaBreachNotifyWebhook: "https://hooks.example.com/notify",
        }),
      }),
      expect.any(Object)
    );
  });
});
