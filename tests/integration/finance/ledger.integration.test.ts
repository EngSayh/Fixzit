/**
 * Finance Ledger Integration Tests
 *
 * Tests multi-tenant isolation and query behavior with real MongoDB (MongoMemoryServer).
 * Uses a simplified LedgerEntry schema to test tenancy patterns without importing
 * the full model which has many required fields and plugin dependencies.
 *
 * @module tests/integration/finance/ledger.integration.test.ts
 */

// eslint-disable-next-line no-warning-comments -- vitest directive required
// @vitest-environment node

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import mongoose, { Types, Schema, type Model } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { startMongoMemoryServer } from "../../helpers/mongoMemory";

// Test org IDs
const ORG_A_ID = new Types.ObjectId();
const ORG_B_ID = new Types.ObjectId();
const TEST_USER_ID = new Types.ObjectId();
const TEST_ACCOUNT_ID = new Types.ObjectId();
const TEST_JOURNAL_ID = new Types.ObjectId();

// Minimal LedgerEntry interface for testing tenancy patterns
interface ITestLedgerEntry {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  journalId: Types.ObjectId;
  journalNumber: string;
  journalDate: Date;
  date: Date;
  postingDate: Date;
  accountId: Types.ObjectId;
  accountCode: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  fiscalYear: number;
  fiscalPeriod: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Minimal schema matching LedgerEntry structure for isolation testing
const TestLedgerEntrySchema = new Schema<ITestLedgerEntry>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    journalId: { type: Schema.Types.ObjectId, required: true },
    journalNumber: { type: String, required: true },
    journalDate: { type: Date, required: true },
    date: { type: Date, required: true, index: true },
    postingDate: { type: Date, required: true },
    accountId: { type: Schema.Types.ObjectId, required: true, index: true },
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    accountType: {
      type: String,
      required: true,
      enum: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
    },
    description: { type: String, required: true },
    debit: { type: Number, required: true, default: 0 },
    credit: { type: Number, required: true, default: 0 },
    balance: { type: Number, required: true, default: 0 },
    fiscalYear: { type: Number, required: true },
    fiscalPeriod: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// Add compound indexes matching production model
TestLedgerEntrySchema.index({ orgId: 1, accountId: 1, postingDate: -1 });
TestLedgerEntrySchema.index({ orgId: 1, date: 1 });

describe("Finance Ledger Integration Tests", () => {
  let mongoServer: MongoMemoryServer;
  let testConnection: typeof mongoose;
  let LedgerEntry: Model<ITestLedgerEntry>;

  // Helper to create valid ledger entry with defaults
  const createEntry = (overrides: Partial<ITestLedgerEntry> = {}) => ({
    orgId: ORG_A_ID,
    journalId: TEST_JOURNAL_ID,
    journalNumber: "JE-2024-0001",
    journalDate: new Date("2024-01-15"),
    date: new Date("2024-01-15"),
    postingDate: new Date("2024-01-15"),
    accountId: TEST_ACCOUNT_ID,
    accountCode: "1000",
    accountName: "Cash",
    accountType: "ASSET" as const,
    description: "Test entry",
    debit: 1000,
    credit: 0,
    balance: 1000,
    fiscalYear: 2024,
    fiscalPeriod: 1,
    createdBy: TEST_USER_ID,
    updatedBy: TEST_USER_ID,
    ...overrides,
  });

  beforeAll(async () => {
    // Start MongoMemoryServer with isolated connection
    mongoServer = await startMongoMemoryServer({
      launchTimeoutMs: 60_000,
      instance: { port: 0 },
    });
    const uri = mongoServer.getUri();

    // Create separate connection for this test suite (avoid global mongoose conflicts)
    testConnection = await mongoose.createConnection(uri).asPromise();

    // Register test model on isolated connection
    LedgerEntry =
      testConnection.models.TestLedgerEntry ||
      testConnection.model<ITestLedgerEntry>("TestLedgerEntry", TestLedgerEntrySchema);

    console.log("✅ MongoDB Memory Server started:", uri);
  }, 120000);

  afterAll(async () => {
    if (testConnection) {
      await testConnection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear collection between tests
    if (LedgerEntry) {
      await LedgerEntry.deleteMany({});
    }
  });

  describe("LedgerEntry Model Shape", () => {
    it("should create ledger entry with correct schema", async () => {
      const entry = await LedgerEntry.create(createEntry({
        description: "Test entry",
        debit: 1000,
        credit: 0,
      }));

      expect(entry._id).toBeDefined();
      expect(entry.orgId.toString()).toBe(ORG_A_ID.toString());
      expect(entry.accountId.toString()).toBe(TEST_ACCOUNT_ID.toString());
      expect(entry.debit).toBe(1000);
      expect(entry.credit).toBe(0);
      expect(entry.description).toBe("Test entry");
    });

    it("should require orgId field (tenant isolation)", async () => {
      const invalidEntry = createEntry();
      // Remove orgId to test required field validation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalidEntry as any).orgId;

      await expect(LedgerEntry.create(invalidEntry)).rejects.toThrow();
    });
  });

  describe("Tenant Isolation", () => {
    it("should filter entries by orgId", async () => {
      // Create entries for Org A
      await LedgerEntry.create(createEntry({
        orgId: ORG_A_ID,
        description: "Org A entry 1",
        debit: 1000,
      }));

      await LedgerEntry.create(createEntry({
        orgId: ORG_A_ID,
        description: "Org A entry 2",
        debit: 500,
      }));

      // Create entry for Org B
      await LedgerEntry.create(createEntry({
        orgId: ORG_B_ID,
        description: "Org B entry",
        debit: 2000,
      }));

      // Query for Org A only - should not see Org B data
      const orgAEntries = await LedgerEntry.find({ orgId: ORG_A_ID }).lean();
      expect(orgAEntries).toHaveLength(2);
      expect(orgAEntries.every((e) => e.orgId.toString() === ORG_A_ID.toString())).toBe(true);

      // Query for Org B only
      const orgBEntries = await LedgerEntry.find({ orgId: ORG_B_ID }).lean();
      expect(orgBEntries).toHaveLength(1);
      expect(orgBEntries[0].description).toBe("Org B entry");
    });

    it("should not return cross-tenant data without explicit orgId filter", async () => {
      await LedgerEntry.create(createEntry({
        orgId: ORG_A_ID,
        description: "Org A secret",
      }));

      // Query with wrong orgId should return nothing
      const wrongOrgEntries = await LedgerEntry.find({ orgId: ORG_B_ID }).lean();
      expect(wrongOrgEntries).toHaveLength(0);
    });
  });

  describe("Query Filters", () => {
    it("should filter by accountId", async () => {
      const accountA = new Types.ObjectId();
      const accountB = new Types.ObjectId();

      await LedgerEntry.create(createEntry({
        accountId: accountA,
        accountCode: "1001",
        accountName: "Account A",
        description: "Account A entry",
      }));

      await LedgerEntry.create(createEntry({
        accountId: accountB,
        accountCode: "1002",
        accountName: "Account B",
        description: "Account B entry",
      }));

      const accountAEntries = await LedgerEntry.find({
        orgId: ORG_A_ID,
        accountId: accountA,
      }).lean();

      expect(accountAEntries).toHaveLength(1);
      expect(accountAEntries[0].accountId.toString()).toBe(accountA.toString());
    });

    it("should filter by date range", async () => {
      await LedgerEntry.create(createEntry({
        date: new Date("2024-01-15"),
        journalDate: new Date("2024-01-15"),
        postingDate: new Date("2024-01-15"),
        description: "January entry",
        fiscalPeriod: 1,
      }));

      await LedgerEntry.create(createEntry({
        date: new Date("2024-06-15"),
        journalDate: new Date("2024-06-15"),
        postingDate: new Date("2024-06-15"),
        description: "June entry",
        fiscalPeriod: 6,
      }));

      await LedgerEntry.create(createEntry({
        date: new Date("2024-12-15"),
        journalDate: new Date("2024-12-15"),
        postingDate: new Date("2024-12-15"),
        description: "December entry",
        fiscalPeriod: 12,
      }));

      // Query Q1 only
      const q1Entries = await LedgerEntry.find({
        orgId: ORG_A_ID,
        date: {
          $gte: new Date("2024-01-01"),
          $lte: new Date("2024-03-31"),
        },
      }).lean();

      expect(q1Entries).toHaveLength(1);
      expect(q1Entries[0].description).toBe("January entry");
    });

    it("should support pagination with skip and limit", async () => {
      // Create 10 entries
      for (let i = 1; i <= 10; i++) {
        await LedgerEntry.create(createEntry({
          date: new Date(`2024-01-${i.toString().padStart(2, "0")}`),
          journalDate: new Date(`2024-01-${i.toString().padStart(2, "0")}`),
          postingDate: new Date(`2024-01-${i.toString().padStart(2, "0")}`),
          journalNumber: `JE-2024-${i.toString().padStart(4, "0")}`,
          debit: i * 100,
          description: `Entry ${i}`,
        }));
      }

      // Page 1 (items 1-5)
      const page1 = await LedgerEntry.find({ orgId: ORG_A_ID })
        .sort({ date: -1 })
        .skip(0)
        .limit(5)
        .lean();

      expect(page1).toHaveLength(5);

      // Page 2 (items 6-10)
      const page2 = await LedgerEntry.find({ orgId: ORG_A_ID })
        .sort({ date: -1 })
        .skip(5)
        .limit(5)
        .lean();

      expect(page2).toHaveLength(5);

      // No overlap between pages
      const page1Ids = new Set(page1.map((e) => e._id.toString()));
      const hasOverlap = page2.some((e) => page1Ids.has(e._id.toString()));
      expect(hasOverlap).toBe(false);
    });
  });

  describe("Response Shape Contract", () => {
    it("should return entries with expected fields", async () => {
      await LedgerEntry.create(createEntry({
        description: "Contract test entry",
        debit: 1500,
      }));

      const entries = await LedgerEntry.find({ orgId: ORG_A_ID }).lean();

      expect(entries).toHaveLength(1);
      const entry = entries[0];

      // Contract shape assertions (fields present in ILedgerEntry interface)
      expect(entry).toHaveProperty("_id");
      expect(entry).toHaveProperty("orgId");
      expect(entry).toHaveProperty("accountId");
      expect(entry).toHaveProperty("accountCode");
      expect(entry).toHaveProperty("accountName");
      expect(entry).toHaveProperty("accountType");
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("postingDate");
      expect(entry).toHaveProperty("debit");
      expect(entry).toHaveProperty("credit");
      expect(entry).toHaveProperty("balance");
      expect(entry).toHaveProperty("description");
      expect(entry).toHaveProperty("fiscalYear");
      expect(entry).toHaveProperty("fiscalPeriod");

      // Type checks
      expect(typeof entry.debit).toBe("number");
      expect(typeof entry.credit).toBe("number");
      expect(typeof entry.balance).toBe("number");
      expect(entry.date instanceof Date).toBe(true);
    });
  });
});
