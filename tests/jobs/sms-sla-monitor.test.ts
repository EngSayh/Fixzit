/**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockFetch, restoreFetch } from "@/tests/helpers/domMocks";

vi.mock("@/server/models/SMSSettings", () => ({
  SMSSettings: {
    getEffectiveSettings: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type SmsSettingsModule = typeof import("@/server/models/SMSSettings");
type EmailModule = typeof import("@/lib/email");
type LoggerModule = typeof import("@/lib/logger");
type SmsMonitorModule = typeof import("@/lib/jobs/sms-sla-monitor");

let SMSSettings: SmsSettingsModule["SMSSettings"];
let sendEmail: EmailModule["sendEmail"];
let logger: LoggerModule["logger"];
let sendBreachNotification: SmsMonitorModule["sendBreachNotification"];
let fetchSpy: ReturnType<typeof mockFetch>;

const reloadModules = async () => {
  ({ SMSSettings } = await import("@/server/models/SMSSettings"));
  ({ sendEmail } = await import("@/lib/email"));
  ({ logger } = await import("@/lib/logger"));
  ({ sendBreachNotification } = await import("@/lib/jobs/sms-sla-monitor"));
};

describe("SLA Breach Notification Webhook SSRF guard", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    fetchSpy = mockFetch();
    await reloadModules();
    vi.mocked(sendEmail).mockResolvedValue(undefined as any);
    fetchSpy.mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    restoreFetch();
  });

  const mockMessages = [
    {
      type: "OTP",
      priority: "HIGH",
      to: "+966500000000",
      slaTargetMs: 1000,
      createdAt: new Date().toISOString(),
    },
  ];

  it("blocks webhook calls to non-HTTPS/private targets", async () => {
    vi.mocked(SMSSettings.getEffectiveSettings).mockResolvedValue({
      slaBreachNotifyEmails: ["ops@example.com"],
      slaBreachNotifyWebhook: "http://localhost:3000/hooks",
    } as any);

    await sendBreachNotification("org_123", mockMessages as any);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("allows webhook calls to validated public HTTPS targets", async () => {
    vi.mocked(SMSSettings.getEffectiveSettings).mockResolvedValue({
      slaBreachNotifyEmails: ["ops@example.com"],
      slaBreachNotifyWebhook: "https://hooks.example.com/notify",
    } as any);

    await sendBreachNotification("org_123", mockMessages as any);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hooks.example.com/notify",
      expect.objectContaining({ method: "POST" })
    );
  });
});
