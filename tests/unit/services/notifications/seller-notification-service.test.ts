import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ObjectId } from "mongodb";

// In-memory stores for test isolation
const sellersStore = new Map<string, Record<string, unknown>>();
const notificationsStore = new Map<string, Record<string, unknown>>();

// Helper to check if a value matches a query filter (supports $in operator)
function matchesFilter(docValue: unknown, filterValue: unknown): boolean {
  if (filterValue && typeof filterValue === "object" && "$in" in (filterValue as Record<string, unknown>)) {
    const inValues = (filterValue as Record<string, unknown[]>).$in;
    return inValues.some((v) => {
      const docStr = docValue?.toString?.() ?? String(docValue);
      const valStr = v?.toString?.() ?? String(v);
      return docStr === valStr;
    });
  }
  const docStr = docValue?.toString?.() ?? String(docValue);
  const valStr = filterValue?.toString?.() ?? String(filterValue);
  return docStr === valStr;
}

// Mock mongodb-unified BEFORE any imports that use it
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: (name: string) => {
      const store = name === "souq_sellers" ? sellersStore : notificationsStore;
      return {
        insertOne: vi.fn(async (doc: Record<string, unknown>) => {
          const id = new ObjectId().toHexString();
          store.set(id, { ...doc, _id: id });
          return { insertedId: id };
        }),
        findOne: vi.fn(async (filter: Record<string, unknown>) => {
          for (const doc of store.values()) {
            let match = true;
            for (const [key, val] of Object.entries(filter)) {
              if (!matchesFilter(doc[key], val)) {
                match = false;
                break;
              }
            }
            if (match) return doc;
          }
          return null;
        }),
        deleteMany: vi.fn(async () => {
          store.clear();
          return { deletedCount: store.size };
        }),
      };
    },
  }),
}));

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

const getNotification = async (sellerId: string, orgId: string, template?: string) => {
  const db = await getDatabase();
  return db.collection("seller_notifications").findOne({
    sellerId,
    orgId,
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
    const notification = await getNotification("seller-1", orgId);
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

    const notification = await getNotification("seller-1", orgId, "BUDGET_LOW");
    expect(notification?.status).toBe("sent");
  });

  it("logs sent when email skipped but SMS succeeds", async () => {
    (getEnv as Mock).mockReturnValue(undefined);
    (sendSMS as Mock).mockResolvedValue({ success: true });
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
    const notification = await getNotification("seller-1", orgId, "BUDGET_LOW");
    expect(notification?.status).toBe("sent");
  });
});
