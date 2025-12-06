import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/sms", () => ({
  sendSMS: vi.fn(),
}));

vi.mock("@/lib/i18n/translation-loader", () => ({
  loadTranslations: vi.fn(() => ({
    en: {},
    ar: {},
  })),
}));

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}));

import { getEnv } from "@/lib/env";
import { getDatabase } from "@/lib/mongodb-unified";
import { sendSMS } from "@/lib/sms";
import sgMail from "@sendgrid/mail";
import { sendSellerNotification } from "@/services/notifications/seller-notification-service";

const mockInsertOne = vi.fn();
const mockFindOne = vi.fn();

const setupDbMock = (seller: Record<string, unknown>) => {
  mockFindOne.mockResolvedValue(seller);
  (getDatabase as unknown as vi.Mock).mockResolvedValue({
    collection: (name: string) => {
      if (name === "souq_sellers") {
        return { findOne: mockFindOne };
      }
      if (name === "seller_notifications") {
        return { insertOne: mockInsertOne };
      }
      return { findOne: vi.fn(), insertOne: vi.fn() };
    },
  });
};

describe("sendSellerNotification status logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertOne.mockReset();
    mockFindOne.mockReset();
  });

  it("logs failed when both email and SMS are skipped/absent", async () => {
    (getEnv as vi.Mock).mockReturnValue(undefined); // No SENDGRID_API_KEY
    setupDbMock({
      sellerId: "seller-1",
      orgId: "org-1",
      email: "seller@example.com",
      contactEmail: "seller@example.com",
      preferredLocale: "en",
    });

    await sendSellerNotification("seller-1", "org-1", "BUDGET_LOW", {
      budgetRemaining: 10,
      campaignName: "C1",
    });

    expect(sendSMS).not.toHaveBeenCalled();
    expect(mockInsertOne).toHaveBeenCalledTimes(1);
    expect(mockInsertOne.mock.calls[0][0]).toMatchObject({
      sellerId: "seller-1",
      orgId: "org-1",
      status: "failed",
    });
  });

  it("logs sent when email succeeds", async () => {
    (getEnv as vi.Mock).mockReturnValue("sg-key");
    (sgMail.send as vi.Mock).mockResolvedValue({});
    setupDbMock({
      sellerId: "seller-1",
      orgId: "org-1",
      email: "seller@example.com",
      contactEmail: "seller@example.com",
      preferredLocale: "en",
    });

    await sendSellerNotification("seller-1", "org-1", "BUDGET_LOW", {
      budgetRemaining: 10,
      campaignName: "C1",
    });

    expect(mockInsertOne).toHaveBeenCalledTimes(1);
    expect(mockInsertOne.mock.calls[0][0]).toMatchObject({
      status: "sent",
    });
  });

  it("logs sent when email skipped but SMS succeeds", async () => {
    (getEnv as vi.Mock).mockReturnValue(undefined);
    (sendSMS as vi.Mock).mockResolvedValue({ success: true });
    setupDbMock({
      sellerId: "seller-1",
      orgId: "org-1",
      email: "seller@example.com",
      contactEmail: "seller@example.com",
      phone: "+96655555555",
      preferredLocale: "en",
    });

    await sendSellerNotification("seller-1", "org-1", "BUDGET_LOW", {
      budgetRemaining: 10,
      campaignName: "C1",
    });

    expect(sendSMS).toHaveBeenCalledTimes(1);
    expect(mockInsertOne).toHaveBeenCalledTimes(1);
    expect(mockInsertOne.mock.calls[0][0]).toMatchObject({
      status: "sent",
    });
  });
});
