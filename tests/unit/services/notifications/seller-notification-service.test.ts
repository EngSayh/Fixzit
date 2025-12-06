import { describe, it, expect, beforeEach, vi } from "vitest";
import { ObjectId } from "mongodb";

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

const seedSeller = async (orgId: string, seller: Record<string, unknown>) => {
  const db = await getDatabase();
  await db.collection("souq_sellers").insertOne({
    orgId: new ObjectId(orgId),
    ...seller,
  });
};

const getNotification = async (sellerId: string, template?: string) => {
  const db = await getDatabase();
  return db.collection("seller_notifications").findOne({
    sellerId,
    ...(template ? { template } : {}),
  });
};

describe("sendSellerNotification status logging", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await getDatabase();
    await Promise.all([
      db.collection("souq_sellers").deleteMany({}),
      db.collection("seller_notifications").deleteMany({}),
    ]);
  });

  it("logs failed when both email and SMS are skipped/absent", async () => {
    (getEnv as vi.Mock).mockReturnValue(undefined); // No SENDGRID_API_KEY
    const orgId = new ObjectId().toHexString();
    await seedSeller(orgId, {
      sellerId: "seller-1",
      email: "seller@example.com",
      contactEmail: "seller@example.com",
      preferredLocale: "en",
    });

    await sendSellerNotification("seller-1", orgId, "BUDGET_LOW", {
      budgetRemaining: 10,
      campaignName: "C1",
    });

    expect(sendSMS).not.toHaveBeenCalled();
    const notification = await getNotification("seller-1");
    expect(notification?.status).toBe("failed");
    expect(notification?.orgId?.toString?.()).toBe(orgId);
  });

  it("logs sent when email succeeds", async () => {
    (getEnv as vi.Mock).mockReturnValue("sg-key");
    (sgMail.send as vi.Mock).mockResolvedValue({});
    const orgId = new ObjectId().toHexString();
    await seedSeller(orgId, {
      sellerId: "seller-1",
      email: "seller@example.com",
      contactEmail: "seller@example.com",
      preferredLocale: "en",
    });

    await sendSellerNotification("seller-1", orgId, "BUDGET_LOW", {
      budgetRemaining: 10,
      campaignName: "C1",
    });

    const notification = await getNotification("seller-1", "BUDGET_LOW");
    expect(notification?.status).toBe("sent");
  });

  it("logs sent when email skipped but SMS succeeds", async () => {
    (getEnv as vi.Mock).mockReturnValue(undefined);
    (sendSMS as vi.Mock).mockResolvedValue({ success: true });
    const orgId = new ObjectId().toHexString();
    await seedSeller(orgId, {
      sellerId: "seller-1",
      email: "seller@example.com",
      contactEmail: "seller@example.com",
      phone: "+96655555555",
      preferredLocale: "en",
    });

    await sendSellerNotification("seller-1", orgId, "BUDGET_LOW", {
      budgetRemaining: 10,
      campaignName: "C1",
    });

    expect(sendSMS).toHaveBeenCalledTimes(1);
    const notification = await getNotification("seller-1", "BUDGET_LOW");
    expect(notification?.status).toBe("sent");
  });
});
