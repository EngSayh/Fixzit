/**
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

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
    await reloadModules();
    vi.mocked(sendEmail).mockResolvedValue(undefined as any);
    // @ts-expect-error set global fetch for tests
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
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

    expect(global.fetch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("allows webhook calls to validated public HTTPS targets", async () => {
    vi.mocked(SMSSettings.getEffectiveSettings).mockResolvedValue({
      slaBreachNotifyEmails: ["ops@example.com"],
      slaBreachNotifyWebhook: "https://hooks.example.com/notify",
    } as any);

    await sendBreachNotification("org_123", mockMessages as any);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://hooks.example.com/notify",
      expect.objectContaining({ method: "POST" })
    );
  });
});
