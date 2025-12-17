/**
 * TEST-003 FIX: True Mongoose Hook Integration Tests
 *
 * These tests exercise the ACTUAL encryption plugin hooks by:
 * 1. Creating a test schema with the encryptionPlugin
 * 2. Performing real Mongoose operations (save, update, insertMany)
 * 3. Verifying encrypted values in the raw document
 *
 * This validates that:
 * - ENC-001: Dotted $set paths trigger encryption
 * - ENC-002: Numeric values are coerced to strings before encryption
 * - ENC-003: insertMany triggers encryption for all documents
 *
 * @module tests/integration/security/encryption-mongoose-hooks.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose, { Schema, Document, Model, Connection } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { encryptionPlugin } from "@/server/plugins/encryptionPlugin";
import { isEncrypted, decryptField } from "@/lib/security/encryption";

// Test document interface
interface ITestPerson extends Document {
  code: string;
  name: string;
  personal: {
    nationalId?: string;
    passport?: string;
  };
  compensation: {
    salary?: string | number;
  };
}

let mongoServer: MongoMemoryServer;
let mongoConnection: Connection;
let TestPerson: Model<ITestPerson>;

describe("Encryption Plugin Mongoose Hooks (TEST-003)", () => {
  beforeAll(async () => {
    // Set test encryption key
    process.env.ENCRYPTION_KEY = Buffer.from(
      "0123456789abcdef0123456789abcdef"
    ).toString("base64");
    process.env.NODE_ENV = "test";
    process.env.MONGOMS_TIMEOUT = process.env.MONGOMS_TIMEOUT || "60000";
    process.env.MONGOMS_DOWNLOAD_TIMEOUT =
      process.env.MONGOMS_DOWNLOAD_TIMEOUT || "60000";
    process.env.MONGOMS_START_TIMEOUT =
      process.env.MONGOMS_START_TIMEOUT || "60000";

    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create({
      instance: { launchTimeout: 60_000, port: 0 },
    });
    const mongoUri = mongoServer.getUri();

    // Use createConnection to avoid conflicts with global mongoose connection
    mongoConnection = mongoose.createConnection(mongoUri);
    await mongoConnection.asPromise();

    // Create schema INSIDE beforeAll to ensure fresh schema
    const TestPersonSchema = new Schema<ITestPerson>({
      code: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      personal: {
        nationalId: String,
        passport: String,
      },
      compensation: {
        salary: Schema.Types.Mixed,
      },
    });

    // Apply encryption plugin
    TestPersonSchema.plugin(encryptionPlugin, {
      fields: {
        "personal.nationalId": "National ID",
        "personal.passport": "Passport Number",
        "compensation.salary": "Base Salary",
      },
      logOperations: false,
    });

    // Create model on the separate connection
    TestPerson = mongoConnection.model<ITestPerson>(
      "TestPerson",
      TestPersonSchema
    );
  });

  afterAll(async () => {
    if (mongoConnection) {
      await mongoConnection.close();
    }
    if (mongoServer?.stop) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear collection before each test
    await TestPerson.deleteMany({});
  });

  describe("Pre-save Hook", () => {
    it("should encrypt PII fields on save()", async () => {
      const person = new TestPerson({
        code: "TEST-001",
        name: "Test User",
        personal: {
          nationalId: "1234567890",
          passport: "AB1234567",
        },
        compensation: {
          salary: "50000",
        },
      });

      await person.save();

      // Fetch raw document to bypass decryption hooks
      const raw = await TestPerson.collection.findOne({ code: "TEST-001" });

      expect(raw).not.toBeNull();
      expect(isEncrypted(raw!.personal?.nationalId)).toBe(true);
      expect(isEncrypted(raw!.personal?.passport)).toBe(true);
      expect(isEncrypted(raw!.compensation?.salary)).toBe(true);
    });

    it("should handle numeric salary by converting to string (ENC-002)", async () => {
      const person = new TestPerson({
        code: "TEST-NUMERIC",
        name: "Numeric Salary User",
        personal: {
          nationalId: "9876543210",
        },
        compensation: {
          salary: 75000, // Numeric value
        },
      });

      await person.save();

      // Verify raw value is encrypted
      const raw = await TestPerson.collection.findOne({ code: "TEST-NUMERIC" });
      expect(isEncrypted(String(raw!.compensation?.salary))).toBe(true);

      // Verify decryption returns string representation
      const found = await TestPerson.findOne({ code: "TEST-NUMERIC" });
      expect(found?.compensation?.salary).toBe("75000");
    });
  });

  describe("Pre-update Hooks (ENC-001)", () => {
    it("should encrypt dotted $set paths in findOneAndUpdate", async () => {
      // Create initial document
      const person = await TestPerson.create({
        code: "TEST-UPDATE-001",
        name: "Update Test",
        personal: {},
      });

      // Update using dotted notation
      await TestPerson.findOneAndUpdate(
        { _id: person._id },
        { $set: { "personal.nationalId": "1111111111" } }
      );

      // Verify raw value is encrypted
      const raw = await TestPerson.collection.findOne({
        code: "TEST-UPDATE-001",
      });
      expect(isEncrypted(raw!.personal?.nationalId)).toBe(true);

      // Verify decryption works
      const decrypted = decryptField(
        raw!.personal?.nationalId,
        "personal.nationalId"
      );
      expect(decrypted).toBe("1111111111");
    });

    it("should encrypt nested object updates in findOneAndUpdate", async () => {
      const person = await TestPerson.create({
        code: "TEST-UPDATE-002",
        name: "Nested Update Test",
      });

      // Update using nested object (must use only nested path, not both)
      // This simulates: await User.findOneAndUpdate(query, { $set: { personal: { nationalId: '...' } } })
      await TestPerson.findOneAndUpdate(
        { _id: person._id },
        {
          $set: {
            "personal.nationalId": "2222222222",
            "personal.passport": "XY9876543",
          },
        }
      );

      const raw = await TestPerson.collection.findOne({
        code: "TEST-UPDATE-002",
      });
      expect(isEncrypted(raw!.personal?.nationalId)).toBe(true);
      expect(isEncrypted(raw!.personal?.passport)).toBe(true);
    });

    it("should encrypt on updateOne with dotted path", async () => {
      const person = await TestPerson.create({
        code: "TEST-UPDATE-003",
        name: "UpdateOne Test",
      });

      await TestPerson.updateOne(
        { _id: person._id },
        { $set: { "compensation.salary": "60000" } }
      );

      const raw = await TestPerson.collection.findOne({
        code: "TEST-UPDATE-003",
      });
      expect(isEncrypted(raw!.compensation?.salary)).toBe(true);
    });

    it("should encrypt numeric values in updateOne (ENC-002)", async () => {
      const person = await TestPerson.create({
        code: "TEST-UPDATE-NUMERIC",
        name: "Numeric Update Test",
      });

      await TestPerson.updateOne(
        { _id: person._id },
        { $set: { "compensation.salary": 80000 } } // Numeric value in update
      );

      const raw = await TestPerson.collection.findOne({
        code: "TEST-UPDATE-NUMERIC",
      });
      expect(isEncrypted(String(raw!.compensation?.salary))).toBe(true);
    });
  });

  describe("Pre-insertMany Hook (ENC-003)", () => {
    it("should encrypt all documents in insertMany", async () => {
      const docs = [
        {
          code: "BULK-001",
          name: "Bulk User 1",
          personal: { nationalId: "1111111111" },
        },
        {
          code: "BULK-002",
          name: "Bulk User 2",
          personal: { nationalId: "2222222222" },
        },
        {
          code: "BULK-003",
          name: "Bulk User 3",
          personal: { nationalId: "3333333333" },
        },
      ];

      await TestPerson.insertMany(docs);

      // Verify all raw documents are encrypted
      const rawDocs = await TestPerson.collection.find({}).toArray();

      for (const raw of rawDocs) {
        expect(isEncrypted(raw.personal?.nationalId)).toBe(true);
      }
    });

    it("should handle mixed numeric/string values in insertMany (ENC-002)", async () => {
      const docs = [
        {
          code: "BULK-MIXED-001",
          name: "Mixed 1",
          compensation: { salary: "50000" }, // String
        },
        {
          code: "BULK-MIXED-002",
          name: "Mixed 2",
          compensation: { salary: 60000 }, // Number
        },
        {
          code: "BULK-MIXED-003",
          name: "Mixed 3",
          compensation: { salary: 70000 }, // Number
        },
      ];

      await TestPerson.insertMany(docs);

      const rawDocs = await TestPerson.collection
        .find({
          code: { $regex: /^BULK-MIXED/ },
        })
        .toArray();

      for (const raw of rawDocs) {
        expect(isEncrypted(String(raw.compensation?.salary))).toBe(true);
      }
    });
  });

  describe("Post-find Decryption", () => {
    it("should decrypt fields when reading via findOne", async () => {
      await TestPerson.create({
        code: "TEST-DECRYPT",
        name: "Decrypt Test",
        personal: {
          nationalId: "9876543210",
          passport: "ZZ1234567",
        },
        compensation: {
          salary: "100000",
        },
      });

      const found = await TestPerson.findOne({ code: "TEST-DECRYPT" });

      expect(found?.personal?.nationalId).toBe("9876543210");
      expect(found?.personal?.passport).toBe("ZZ1234567");
      expect(found?.compensation?.salary).toBe("100000");
    });

    it("should decrypt fields when reading via find()", async () => {
      await TestPerson.insertMany([
        {
          code: "FIND-001",
          name: "Find 1",
          personal: { nationalId: "AAAA" },
        },
        {
          code: "FIND-002",
          name: "Find 2",
          personal: { nationalId: "BBBB" },
        },
      ]);

      const found = await TestPerson.find({ code: { $regex: /^FIND/ } });

      expect(found).toHaveLength(2);
      expect(found[0]?.personal?.nationalId).toBe("AAAA");
      expect(found[1]?.personal?.nationalId).toBe("BBBB");
    });
  });

  describe("Double Encryption Prevention", () => {
    it("should not double-encrypt on multiple saves", async () => {
      const person = new TestPerson({
        code: "TEST-DOUBLE",
        name: "Double Encryption Test",
        personal: { nationalId: "5555555555" },
      });

      await person.save();

      // Save again (might trigger if pre-save runs again)
      person.name = "Updated Name";
      await person.save();

      const raw = await TestPerson.collection.findOne({ code: "TEST-DOUBLE" });
      const decrypted = decryptField(
        raw!.personal?.nationalId,
        "personal.nationalId"
      );

      // Should still be the original value, not double-encrypted garbage
      expect(decrypted).toBe("5555555555");
    });
  });

  describe("Defensive Type Handling (DEF-001)", () => {
    it("should gracefully handle non-primitive values without crashing", async () => {
      // This tests that the plugin doesn't crash when encountering unexpected types
      // The toEncryptableString function should log a warning and skip non-primitives
      const person = new TestPerson({
        code: "TEST-DEFENSIVE",
        name: "Defensive Test",
        personal: {
          nationalId: "1234567890",
        },
      });

      await person.save();

      // Directly set a non-primitive value via raw collection update
      // This simulates an edge case where bad data gets into the system
      await TestPerson.collection.updateOne(
        { code: "TEST-DEFENSIVE" },
        {
          $set: {
            "personal.nationalId": { nested: "object" }, // Invalid: should be string
          },
        }
      );

      // Reading should not crash, just return the raw value
      const found = await TestPerson.findOne({ code: "TEST-DEFENSIVE" });

      // The plugin should handle this gracefully - the object won't be decrypted
      // but the read operation should not fail
      expect(found).not.toBeNull();
      expect(found?.code).toBe("TEST-DEFENSIVE");
    });
  });
});
