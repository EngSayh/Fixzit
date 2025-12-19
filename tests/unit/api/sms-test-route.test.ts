import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/sms/test/route";
import { sendSMS, testSMSConfiguration } from "@/lib/sms";
import { smartRateLimit } from "@/server/security/rateLimit";

type SessionUser = {
  id?: string;
  role?: string;
};
let sessionUser: SessionUser | null = { id: "admin-1", role: "SUPER_ADMIN" };

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

vi.mock("@/lib/sms", () => ({
  sendSMS: vi.fn(),
  testSMSConfiguration: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

describe("POST /api/sms/test", () => {
  const mockSendSMS = vi.mocked(sendSMS);
  const mockTestSMSConfiguration = vi.mocked(testSMSConfiguration);
  const mockSmartRateLimit = vi.mocked(smartRateLimit);

  beforeEach(() => {
    sessionUser = { id: "admin-1", role: "SUPER_ADMIN" };
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns configuration status for Taqnyat", async () => {
    mockTestSMSConfiguration.mockResolvedValue(true);

    const req = new Request("http://localhost/api/sms/test", {
      method: "POST",
      body: JSON.stringify({ testConfig: true }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      success: true,
      message: "Taqnyat configuration is valid",
    });
  });

  it("sends SMS successfully", async () => {
    mockSendSMS.mockResolvedValue({ success: true, messageSid: "taq-123" });

    const req = new Request("http://localhost/api/sms/test", {
      method: "POST",
      body: JSON.stringify({ phone: "+966500000000", message: "hello" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.messageSid).toBe("taq-123");
    expect(body.message).toBe("SMS sent successfully");
  });

  it("returns 400 when required fields are missing", async () => {
    const req = new Request("http://localhost/api/sms/test", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Missing required fields: phone and message");
  });

  it("maps validation errors to 400 with sanitized messaging", async () => {
    mockSendSMS.mockResolvedValue({
      success: false,
      error: "Invalid Saudi phone number format: 123",
    });

    const req = new Request("http://localhost/api/sms/test", {
      method: "POST",
      body: JSON.stringify({ phone: "123", message: "hello" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Failed to send SMS. Check server logs for details.");
  });

  it("maps provider failures to 502 with generic error text", async () => {
    mockSendSMS.mockResolvedValue({
      success: false,
      error: "provider down",
    });

    const req = new Request("http://localhost/api/sms/test", {
      method: "POST",
      body: JSON.stringify({ phone: "+966500000000", message: "hello" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error).toBe("Failed to send SMS. Check server logs for details.");
  });

  it("returns 401 when unauthenticated", async () => {
    sessionUser = null;
    const req = new Request("http://localhost/api/sms/test", {
      method: "POST",
      body: JSON.stringify({ phone: "+966500000000", message: "hi" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
