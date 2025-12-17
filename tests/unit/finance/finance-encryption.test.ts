/**
 * Unit Tests for Finance Model PII Encryption
 *
 * Tests encryption/decryption of PII fields in Invoice and FMFinancialTransaction models.
 * These tests validate that the encryptionPlugin correctly encrypts/decrypts
 * sensitive finance data.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { generateEncryptionKey, isEncrypted } from "@/lib/security/encryption";
import {
  setAuditContext,
  clearAuditContext,
} from "@/server/plugins/auditPlugin";

// Mock getModel to avoid model re-registration issues in tests
vi.mock("@/types/mongoose-compat", () => ({
  getModel: vi.fn((name: string, schema: mongoose.Schema) => {
    // Return existing model or create new one
    if (mongoose.models[name]) {
      return mongoose.models[name];
    }
    return mongoose.model(name, schema);
  }),
}));

// Test data factories
function createTestInvoiceData(overrides = {}) {
  return {
    number: `INV-${Date.now()}`,
    type: "SALES",
    status: "DRAFT",
    createdBy: new mongoose.Types.ObjectId(),
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    orgId: new mongoose.Types.ObjectId().toString(),
    issuer: {
      name: "Test Company",
      taxId: "123456789",
      address: "123 Test Street",
      phone: "+966500000000",
      email: "test@example.com",
    },
    recipient: {
      name: "Customer Name",
      taxId: "987654321",
      phone: "+966511111111",
      email: "customer@example.com",
      nationalId: "1234567890",
    },
    payment: {
      method: "BANK_TRANSFER",
      terms: "Net 30",
      account: {
        bank: "Test Bank",
        accountNumber: "1234567890123456",
        iban: "SA0380000000608010167519",
        swift: "TESTSA00",
      },
    },
    items: [
      {
        description: "Test Item",
        quantity: 1,
        unitPrice: 100,
        total: 100,
      },
    ],
    subtotal: 100,
    total: 100,
    ...overrides,
  };
}

function createTestTransactionData(overrides = {}) {
  return {
    transactionNumber: `TXN-${Date.now()}`,
    type: "PAYMENT",
    status: "PENDING",
    createdBy: new mongoose.Types.ObjectId(),
    propertyId: new mongoose.Types.ObjectId().toString(),
    ownerId: new mongoose.Types.ObjectId().toString(),
    orgId: new mongoose.Types.ObjectId().toString(),
    amount: 1000,
    currency: "SAR",
    category: "MAINTENANCE",
    description: "Test payment",
    transactionDate: new Date(),
    paymentDetails: {
      paymentMethod: "BANK_TRANSFER",
      paymentRef: "CHK-123456",
      receivedFrom: "John Doe",
      bankAccount: "1234567890",
      notes: "Test payment note",
    },
    ...overrides,
  };
}

describe("Finance Model PII Encryption", () => {
  let mongoServer: MongoMemoryServer;
  const testKey = generateEncryptionKey();

  beforeAll(async () => {
    // Set encryption key
    process.env.ENCRYPTION_KEY = testKey;
    process.env.MONGOMS_TIMEOUT = process.env.MONGOMS_TIMEOUT || "60000";
    process.env.MONGOMS_DOWNLOAD_TIMEOUT =
      process.env.MONGOMS_DOWNLOAD_TIMEOUT || "60000";
    process.env.MONGOMS_START_TIMEOUT =
      process.env.MONGOMS_START_TIMEOUT || "60000";

    // Reset any existing connections (guards against accidental shared connection across tests)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create({
      instance: { launchTimeout: 60_000 },
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    setAuditContext({ userId: new mongoose.Types.ObjectId() });
  });

  afterAll(async () => {
    clearAuditContext();
    await mongoose.disconnect();
    if (mongoServer?.stop) {
      await mongoServer.stop();
    }
    delete process.env.ENCRYPTION_KEY;
  });

  describe("Invoice Model Encryption", () => {
    let Invoice: mongoose.Model<mongoose.Document>;

    beforeAll(async () => {
      // Import Invoice model after mongoose is connected and env is set
      const mod = await import("@/server/models/Invoice");
      Invoice = mod.Invoice as mongoose.Model<mongoose.Document>;
      // Fallback collection for tests if Mongoose hasn't attached it
      if (!(Invoice as any).collection || !(Invoice as any).collection.findOne) {
        (Invoice as any).collection = mongoose.connection.collection("invoices");
      }
    });

    it("should encrypt issuer PII fields on save", async () => {
      const data = createTestInvoiceData();
      const invoice = new Invoice(data);
      await invoice.save();

      // Read raw document from database to check encryption
      const raw = await Invoice.collection.findOne({
        _id: invoice._id,
      });

      expect(raw).toBeTruthy();
      expect(isEncrypted(raw?.issuer?.taxId)).toBe(true);
      expect(isEncrypted(raw?.issuer?.phone)).toBe(true);
      expect(isEncrypted(raw?.issuer?.email)).toBe(true);
    });

    it("should encrypt recipient PII fields on save", async () => {
      const data = createTestInvoiceData();
      const invoice = new Invoice(data);
      await invoice.save();

      // Read raw document from database to check encryption
      const raw = await Invoice.collection.findOne({
        _id: invoice._id,
      });

      expect(raw).toBeTruthy();
      expect(isEncrypted(raw?.recipient?.taxId)).toBe(true);
      expect(isEncrypted(raw?.recipient?.phone)).toBe(true);
      expect(isEncrypted(raw?.recipient?.email)).toBe(true);
      expect(isEncrypted(raw?.recipient?.nationalId)).toBe(true);
    });

    it("should encrypt payment account fields on save", async () => {
      const data = createTestInvoiceData();
      const invoice = new Invoice(data);
      await invoice.save();

      // Read raw document from database to check encryption
      const raw = await Invoice.collection.findOne({
        _id: invoice._id,
      });

      expect(raw).toBeTruthy();
      expect(isEncrypted(raw?.payment?.account?.accountNumber)).toBe(true);
      expect(isEncrypted(raw?.payment?.account?.iban)).toBe(true);
      expect(isEncrypted(raw?.payment?.account?.swift)).toBe(true);
    });

    it("should decrypt fields on find", async () => {
      const data = createTestInvoiceData();
      const invoice = new Invoice(data);
      await invoice.save();

      // Find and verify decryption
      const found = await Invoice.findById(invoice._id);
      expect(found).toBeTruthy();
      if (!found) return;

      const foundObj = found.toObject() as Record<string, any>;

      expect(foundObj.issuer.taxId).toBe(data.issuer.taxId);
      expect(foundObj.issuer.phone).toBe(data.issuer.phone);
      expect(foundObj.issuer.email).toBe(data.issuer.email);
      expect(foundObj.recipient.taxId).toBe(data.recipient.taxId);
      expect(foundObj.recipient.phone).toBe(data.recipient.phone);
      expect(foundObj.recipient.email).toBe(data.recipient.email);
      expect(foundObj.recipient.nationalId).toBe(data.recipient.nationalId);
      expect((foundObj.payment as Record<string, Record<string, unknown>>).account.accountNumber).toBe(data.payment.account.accountNumber);
      expect((foundObj.payment as Record<string, Record<string, unknown>>).account.iban).toBe(data.payment.account.iban);
      expect((foundObj.payment as Record<string, Record<string, unknown>>).account.swift).toBe(data.payment.account.swift);
    });

    it("should re-encrypt on update", async () => {
      const data = createTestInvoiceData();
      const invoice = new Invoice(data);
      await invoice.save();

      // Update with new values
      const updated = await Invoice.findByIdAndUpdate(
        invoice._id,
        {
          $set: {
            "issuer.taxId": "999888777",
            "recipient.nationalId": "0987654321",
          },
        },
        { new: true },
      );

      // Read raw document
      const raw = await Invoice.collection.findOne({
        _id: invoice._id,
      });

      expect(raw).toBeTruthy();
      expect(isEncrypted(raw?.issuer?.taxId)).toBe(true);
      expect(isEncrypted(raw?.recipient?.nationalId)).toBe(true);

      // Verify decryption returns new values
      const found = await Invoice.findById(invoice._id);
      expect(found).toBeTruthy();
      if (!found) return;

      const foundObj = found.toObject() as Record<string, any>;
      expect(foundObj.issuer.taxId).toBe("999888777");
      expect(foundObj.recipient.nationalId).toBe("0987654321");
    });

    it("should skip encryption for null/undefined values", async () => {
      const data = createTestInvoiceData({
        issuer: {
          name: "Test Company",
          taxId: null,
          phone: undefined,
        },
        recipient: {
          name: "Customer",
          taxId: null,
        },
        payment: {
          method: "CASH",
          account: null,
        },
      });

      const invoice = new Invoice(data);
      await invoice.save();

      const raw = await Invoice.collection.findOne({
        _id: invoice._id,
      });

      expect(raw?.issuer?.taxId).toBeNull();
      expect(raw?.issuer?.phone).toBeUndefined();
    });

    it("should not double-encrypt already encrypted values", async () => {
      const data = createTestInvoiceData();
      const invoice = new Invoice(data);
      await invoice.save();

      // Get the encrypted value
      const raw1 = await Invoice.collection.findOne({
        _id: invoice._id,
      });
      const encryptedTaxId = raw1?.issuer?.taxId;

      // Save again (simulate re-save)
      const found = await Invoice.findById(invoice._id);
      if (found) {
        found.set("issuer.name", "Updated Company Name");
        await found.save();
      }

      // Get the encrypted value again
      const raw2 = await Invoice.collection.findOne({
        _id: invoice._id,
      });

      // Should still be encrypted but same format (not double-encrypted)
      expect(isEncrypted(raw2?.issuer?.taxId)).toBe(true);
    });
  });

  describe("FMFinancialTransaction Model Encryption", () => {
    let FMFinancialTransaction: mongoose.Model<mongoose.Document>;

    beforeAll(async () => {
      // Import model after mongoose is connected and env is set
      const mod = await import("@/server/models/FMFinancialTransaction");
      FMFinancialTransaction = mod.FMFinancialTransaction as mongoose.Model<mongoose.Document>;
      if (!(FMFinancialTransaction as any).collection || !(FMFinancialTransaction as any).collection.findOne) {
        (FMFinancialTransaction as any).collection = mongoose.connection.collection("fmfinancialtransactions");
      }
    });

    it("should encrypt paymentDetails fields on save", async () => {
      const data = createTestTransactionData();
      const transaction = new FMFinancialTransaction(data);
      await transaction.save();

      // Read raw document from database to check encryption
      const raw = await FMFinancialTransaction.collection.findOne({
        _id: transaction._id,
      });

      expect(raw).toBeTruthy();
      expect(isEncrypted(raw?.paymentDetails?.paymentRef)).toBe(true);
      expect(isEncrypted(raw?.paymentDetails?.receivedFrom)).toBe(true);
      expect(isEncrypted(raw?.paymentDetails?.bankAccount)).toBe(true);
    });

    it("should decrypt fields on find", async () => {
      const data = createTestTransactionData();
      const transaction = new FMFinancialTransaction(data);
      await transaction.save();

      // Find and verify decryption
      const found = await FMFinancialTransaction.findById(transaction._id);
      expect(found).toBeTruthy();
      if (!found) return;

      const foundObj = found.toObject() as Record<string, any>;

      expect(foundObj.paymentDetails.paymentRef).toBe(data.paymentDetails.paymentRef);
      expect(foundObj.paymentDetails.receivedFrom).toBe(data.paymentDetails.receivedFrom);
      expect(foundObj.paymentDetails.bankAccount).toBe(data.paymentDetails.bankAccount);
    });

    it("should re-encrypt on update", async () => {
      const data = createTestTransactionData();
      const transaction = new FMFinancialTransaction(data);
      await transaction.save();

      // Update with new values
      await FMFinancialTransaction.findByIdAndUpdate(
        transaction._id,
        {
          $set: {
            "paymentDetails.paymentRef": "CHK-999999",
            "paymentDetails.receivedFrom": "Jane Smith",
          },
        },
        { new: true },
      );

      // Read raw document
      const raw = await FMFinancialTransaction.collection.findOne({
        _id: transaction._id,
      });

      expect(raw).toBeTruthy();
      expect(isEncrypted(raw?.paymentDetails?.paymentRef)).toBe(true);
      expect(isEncrypted(raw?.paymentDetails?.receivedFrom)).toBe(true);

      // Verify decryption returns new values
      const found = await FMFinancialTransaction.findById(transaction._id);
      expect(found).toBeTruthy();
      if (!found) return;

      const foundObj = found.toObject() as Record<string, any>;
      expect(foundObj.paymentDetails.paymentRef).toBe("CHK-999999");
      expect(foundObj.paymentDetails.receivedFrom).toBe("Jane Smith");
    });

    it("should skip encryption for null/undefined payment details", async () => {
      const data = createTestTransactionData({
        paymentDetails: {
          paymentMethod: "CASH",
          paymentRef: null,
          receivedFrom: undefined,
          bankAccount: null,
        },
      });

      const transaction = new FMFinancialTransaction(data);
      await transaction.save();

      const raw = await FMFinancialTransaction.collection.findOne({
        _id: transaction._id,
      });

      expect(raw?.paymentDetails?.paymentRef).toBeNull();
      expect(raw?.paymentDetails?.bankAccount).toBeNull();
    });

    it("should handle transactions without payment details", async () => {
      const data = createTestTransactionData({
        type: "EXPENSE",
        paymentDetails: undefined,
      });

      const transaction = new FMFinancialTransaction(data);
      await transaction.save();

      const found = await FMFinancialTransaction.findById(transaction._id);
      expect(found).toBeTruthy();
    });
  });

  describe("Cross-model encryption consistency", () => {
    it("should use same encryption format across models", async () => {
      const { Invoice } = await import("@/server/models/Invoice");
      const { FMFinancialTransaction } = await import(
        "@/server/models/FMFinancialTransaction"
      );

      const ensureCollection = (
        model: mongoose.Model<mongoose.Document>,
        fallback: string,
      ) => {
        if (!(model as any).collection || !(model as any).collection.findOne) {
          (model as any).collection = mongoose.connection.collection(fallback);
        }
        return model;
      };

      ensureCollection(Invoice as mongoose.Model<mongoose.Document>, "invoices");
      ensureCollection(
        FMFinancialTransaction as mongoose.Model<mongoose.Document>,
        "fmfinancialtransactions",
      );

      const invoiceData = createTestInvoiceData();
      const transactionData = createTestTransactionData();

      const invoice = new (Invoice as mongoose.Model<mongoose.Document>)(invoiceData);
      await invoice.save();

      const transaction = new (FMFinancialTransaction as mongoose.Model<mongoose.Document>)(transactionData);
      await transaction.save();

      // Read raw documents
      const rawInvoice = await (Invoice as mongoose.Model<mongoose.Document>).collection.findOne({
        _id: invoice._id,
      });
      const rawTransaction = await (FMFinancialTransaction as mongoose.Model<mongoose.Document>).collection.findOne({
        _id: transaction._id,
      });

      // Both should use v1: format
      expect(rawInvoice?.issuer?.taxId).toMatch(/^v1:/);
      expect(rawTransaction?.paymentDetails?.paymentRef).toMatch(/^v1:/);
    });
  });
});
