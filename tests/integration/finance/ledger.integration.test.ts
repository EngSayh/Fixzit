/**
 * Finance Ledger Integration Tests
 *
 * Tests multi-tenant isolation and query behavior with real MongoDB (MongoMemoryServer).
 * Uses a simplified LedgerEntry schema to test tenancy patterns without importing
 * the full model which has many required fields and plugin dependencies.
 *
 * @module tests/integration/finance/ledger.integration.test.ts
 * @vitest-environment node
 */

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
      const entry = await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date("2024-01-15"),
        debit: 1000,
        credit: 0,
        description: "Test entry",
        reference: "REF-001",
        createdBy: TEST_USER_ID,
      });

      expect(entry._id).toBeDefined();
      expect(entry.orgId.toString()).toBe(ORG_A_ID.toString());
      expect(entry.accountId.toString()).toBe(TEST_ACCOUNT_ID.toString());
      expect(entry.debit).toBe(1000);
      expect(entry.credit).toBe(0);
      expect(entry.description).toBe("Test entry");
    });

    it("should require orgId field (tenant isolation)", async () => {
      await expect(
        LedgerEntry.create({
          accountId: TEST_ACCOUNT_ID,
          date: new Date(),
          debit: 100,
          credit: 0,
          description: "Missing orgId",
          createdBy: TEST_USER_ID,
        })
      ).rejects.toThrow();
    });
  });

  describe("Tenant Isolation", () => {
    it("should filter entries by orgId", async () => {
      // Create entries for Org A
      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date(),
        debit: 1000,
        credit: 0,
        description: "Org A entry 1",
        createdBy: TEST_USER_ID,
      });

      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date(),
        debit: 500,
        credit: 0,
        description: "Org A entry 2",
        createdBy: TEST_USER_ID,
      });

      // Create entry for Org B
      await LedgerEntry.create({
        orgId: ORG_B_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date(),
        debit: 2000,
        credit: 0,
        description: "Org B entry",
        createdBy: TEST_USER_ID,
      });

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
      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date(),
        debit: 100,
        credit: 0,
        description: "Org A secret",
        createdBy: TEST_USER_ID,
      });

      // Query with wrong orgId should return nothing
      const wrongOrgEntries = await LedgerEntry.find({ orgId: ORG_B_ID }).lean();
      expect(wrongOrgEntries).toHaveLength(0);
    });
  });

  describe("Query Filters", () => {
    it("should filter by accountId", async () => {
      const accountA = new Types.ObjectId();
      const accountB = new Types.ObjectId();

      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: accountA,
        date: new Date(),
        debit: 100,
        credit: 0,
        description: "Account A entry",
        createdBy: TEST_USER_ID,
      });

      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: accountB,
        date: new Date(),
        debit: 200,
        credit: 0,
        description: "Account B entry",
        createdBy: TEST_USER_ID,
      });

      const accountAEntries = await LedgerEntry.find({
        orgId: ORG_A_ID,
        accountId: accountA,
      }).lean();

      expect(accountAEntries).toHaveLength(1);
      expect(accountAEntries[0].accountId.toString()).toBe(accountA.toString());
    });

    it("should filter by date range", async () => {
      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date("2024-01-15"),
        debit: 100,
        credit: 0,
        description: "January entry",
        createdBy: TEST_USER_ID,
      });

      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date("2024-06-15"),
        debit: 200,
        credit: 0,
        description: "June entry",
        createdBy: TEST_USER_ID,
      });

      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date("2024-12-15"),
        debit: 300,
        credit: 0,
        description: "December entry",
        createdBy: TEST_USER_ID,
      });

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
        await LedgerEntry.create({
          orgId: ORG_A_ID,
          accountId: TEST_ACCOUNT_ID,
          date: new Date(`2024-01-${i.toString().padStart(2, "0")}`),
          debit: i * 100,
          credit: 0,
          description: `Entry ${i}`,
          createdBy: TEST_USER_ID,
        });
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
      await LedgerEntry.create({
        orgId: ORG_A_ID,
        accountId: TEST_ACCOUNT_ID,
        date: new Date("2024-01-15"),
        debit: 1500,
        credit: 0,
        description: "Contract test entry",
        reference: "REF-CONTRACT-001",
        createdBy: TEST_USER_ID,
      });

      const entries = await LedgerEntry.find({ orgId: ORG_A_ID }).lean();

      expect(entries).toHaveLength(1);
      const entry = entries[0];

      // Contract shape assertions
      expect(entry).toHaveProperty("_id");
      expect(entry).toHaveProperty("orgId");
      expect(entry).toHaveProperty("accountId");
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("debit");
      expect(entry).toHaveProperty("credit");
      expect(entry).toHaveProperty("description");

      // Type checks
      expect(typeof entry.debit).toBe("number");
      expect(typeof entry.credit).toBe("number");
      expect(entry.date instanceof Date).toBe(true);
    });
  });
});
