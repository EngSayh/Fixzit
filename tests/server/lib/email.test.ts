import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const originalEnv = { ...process.env };

const mockSend = vi.fn();
const mockSetApiKey = vi.fn();

// Helper to reload the email module after mocking
async function loadEmailModule() {
  vi.resetModules();
  const emailModule = await import("@/lib/email");
  const { logger } = await import("@/lib/logger");
  return { emailModule, logger };
}

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

vi.doMock("@sendgrid/mail", () => ({
  default: {
    setApiKey: (...args: unknown[]) => mockSetApiKey(...args),
    send: (...args: unknown[]) => mockSend(...args),
  },
}));

describe("lib/email.sendEmail", () => {
  it("returns failure when SENDGRID_API_KEY is missing", async () => {
    delete process.env.SENDGRID_API_KEY;
    const { emailModule, logger } = await loadEmailModule();
    const warnSpy = vi.spyOn(logger, "warn");

    const result = await emailModule.sendEmail(
      "user@test.local",
      "Subject",
      "Body",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("SendGrid not configured");
    expect(mockSend).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[Email] Configuration missing",
      expect.objectContaining({ to: expect.stringContaining("***") }),
    );
  });

  it("sends email successfully and returns message id", async () => {
    process.env.SENDGRID_API_KEY = "test-key";
    process.env.SENDGRID_FROM_EMAIL = "noreply@test.local";
    mockSend.mockResolvedValueOnce([
      { headers: { "x-message-id": "abc-123" } },
    ]);

    const { emailModule, logger } = await loadEmailModule();
    const infoSpy = vi.spyOn(logger, "info");
    const result = await emailModule.sendEmail(
      "user@test.local",
      "Hello",
      "World",
    );

    expect(mockSetApiKey).toHaveBeenCalledWith("test-key");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@test.local",
        subject: "Hello",
      }),
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("abc-123");
    expect(infoSpy).toHaveBeenCalledWith(
      "[Email] Message sent successfully",
      expect.objectContaining({ to: "us***@test.local" }),
    );
  });

  it("returns failure when SendGrid throws", async () => {
    process.env.SENDGRID_API_KEY = "test-key";
    process.env.SENDGRID_FROM_EMAIL = "noreply@test.local";
    mockSend.mockRejectedValueOnce(new Error("boom"));
    const { emailModule, logger } = await loadEmailModule();
    const errorSpy = vi.spyOn(logger, "error");

    const result = await emailModule.sendEmail(
      "user@test.local",
      "Hello",
      "World",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("boom");
    expect(errorSpy).toHaveBeenCalled();
  });
});
