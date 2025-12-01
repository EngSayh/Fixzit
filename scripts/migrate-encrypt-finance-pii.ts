/**
 * Migration script to encrypt legacy PII fields in Finance models (Invoice, FMFinancialTransaction).
 *
 * Usage:
 *   ENCRYPTION_KEY=... pnpm tsx scripts/migrate-encrypt-finance-pii.ts [--dry-run] [--org=<orgId>]
 *
 * Options:
 *   --dry-run   Preview changes without modifying the database
 *   --org=ID    Migrate only records for a specific organization
 *   --rollback  Restore from backup collections (if available)
 *
 * Notes:
 * - Requires ENCRYPTION_KEY or PII_ENCRYPTION_KEY in env.
 * - Idempotent: skips already-encrypted values (isEncrypted check).
 * - Processes documents in batches to avoid memory spikes.
 * - Creates backup collections before migrating.
 *
 * Encrypted Fields:
 *   Invoice:
 *     - issuer.taxId, issuer.phone, issuer.email
 *     - recipient.taxId, recipient.phone, recipient.email, recipient.nationalId
 *     - payment.account.accountNumber, payment.account.iban, payment.account.swift
 *
 *   FMFinancialTransaction:
 *     - paymentDetails.paymentRef
 *     - paymentDetails.receivedFrom
 *     - paymentDetails.bankAccount
 */

import "dotenv/config";
import mongoose from "mongoose";
import { encryptField, isEncrypted } from "@/lib/security/encryption";
import { Invoice } from "@/server/models/Invoice";
import { FMFinancialTransaction } from "@/server/models/FMFinancialTransaction";
import { logger } from "@/lib/logger";

const BATCH_SIZE = 200;

interface EncryptTarget {
  path: string;
  label: string;
}

interface MigrationStats {
  processed: number;
  encrypted: number;
  skipped: number;
  errors: number;
  fields: Record<string, { encrypted: number; skipped: number }>;
}

// Invoice PII fields for encryption
const invoiceTargets: EncryptTarget[] = [
  { path: "issuer.taxId", label: "Issuer Tax ID" },
  { path: "issuer.phone", label: "Issuer Phone" },
  { path: "issuer.email", label: "Issuer Email" },
  { path: "recipient.taxId", label: "Recipient Tax ID" },
  { path: "recipient.phone", label: "Recipient Phone" },
  { path: "recipient.email", label: "Recipient Email" },
  { path: "recipient.nationalId", label: "Recipient National ID" },
  { path: "payment.account.accountNumber", label: "Payment Account Number" },
  { path: "payment.account.iban", label: "Payment IBAN" },
  { path: "payment.account.swift", label: "Payment SWIFT" },
];

// FMFinancialTransaction PII fields for encryption
const transactionTargets: EncryptTarget[] = [
  { path: "paymentDetails.paymentRef", label: "Payment Reference" },
  { path: "paymentDetails.receivedFrom", label: "Payment Received From" },
  { path: "paymentDetails.bankAccount", label: "Payment Bank Account" },
];

function getNested(doc: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = doc;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNested(
  doc: Record<string, unknown>,
  path: string,
  value: string,
): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function encryptDocument(
  doc: Record<string, unknown>,
  targets: EncryptTarget[],
  stats: MigrationStats,
): boolean {
  let mutated = false;
  for (const t of targets) {
    const value = getNested(doc, t.path);
    if (!stats.fields[t.path]) {
      stats.fields[t.path] = { encrypted: 0, skipped: 0 };
    }

    // Skip if no value
    if (value === null || value === undefined || value === "") {
      continue;
    }

    // Skip if already encrypted
    if (typeof value === "string" && isEncrypted(value)) {
      stats.fields[t.path].skipped++;
      continue;
    }

    // Encrypt the value
    if (typeof value === "string") {
      const encrypted = encryptField(value, t.path);
      if (encrypted) {
        setNested(doc, t.path, encrypted);
        stats.fields[t.path].encrypted++;
        mutated = true;
      }
    }
  }
  return mutated;
}

interface MigrationOptions {
  dryRun: boolean;
  orgId?: string;
  rollback: boolean;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes("--dry-run"),
    rollback: args.includes("--rollback"),
  };

  const orgArg = args.find((a) => a.startsWith("--org="));
  if (orgArg) {
    options.orgId = orgArg.split("=")[1];
  }

  return options;
}

async function createBackup(
  collectionName: string,
  orgId?: string,
): Promise<string> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not established");
  }

  const timestamp = Date.now();
  const suffix = orgId ? `_${orgId}` : "";
  const backupName = `${collectionName}_backup_finance_pii${suffix}_${timestamp}`;

  const sourceCollection = db.collection(collectionName);
  const filter = orgId ? { orgId } : {};

  const docs = await sourceCollection.find(filter).toArray();
  if (docs.length > 0) {
    const backupCollection = db.collection(backupName);
    await backupCollection.insertMany(docs);
    logger.info(`[FINANCE PII MIGRATION] Backup created: ${backupName}`, {
      count: docs.length,
    });
  }

  return backupName;
}

async function restoreFromBackup(collectionName: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not established");
  }

  // Find the most recent backup
  const collections = await db.listCollections().toArray();
  const backups = collections
    .filter((c) => c.name.startsWith(`${collectionName}_backup_finance_pii`))
    .sort((a, b) => {
      const tsA = parseInt(a.name.split("_").pop() || "0");
      const tsB = parseInt(b.name.split("_").pop() || "0");
      return tsB - tsA;
    });

  if (backups.length === 0) {
    throw new Error(`No backup found for ${collectionName}`);
  }

  const backupName = backups[0].name;
  logger.info(`[FINANCE PII MIGRATION] Restoring from backup: ${backupName}`);

  const backupCollection = db.collection(backupName);
  const docs = await backupCollection.find({}).toArray();

  // Truncate target collection with same orgId scope (or all)
  const targetCollection = db.collection(collectionName);
  const backupOrgIds = [...new Set(docs.map((d) => d.orgId))];

  for (const orgId of backupOrgIds) {
    await targetCollection.deleteMany({ orgId });
  }

  // Restore
  if (docs.length > 0) {
    await targetCollection.insertMany(docs);
  }

  logger.info(`[FINANCE PII MIGRATION] Restored ${docs.length} documents`);
}

async function migrateCollection(
  name: string,
  model: mongoose.Model<unknown>,
  targets: EncryptTarget[],
  options: MigrationOptions,
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    processed: 0,
    encrypted: 0,
    skipped: 0,
    errors: 0,
    fields: {},
  };

  const prefix = options.dryRun ? "[DRY RUN] " : "";
  logger.info(`${prefix}[FINANCE PII MIGRATION] Starting ${name}`);

  // Create backup (unless dry-run)
  if (!options.dryRun && !options.rollback) {
    await createBackup(model.collection.name, options.orgId);
  }

  // Build query filter
  const filter: Record<string, unknown> = options.orgId
    ? { orgId: options.orgId }
    : {};

  const cursor = model
    .find(filter)
    .lean(false)
    .cursor({ batchSize: BATCH_SIZE });

  for await (const doc of cursor) {
    const docObj = doc as unknown as mongoose.Document & {
      toObject: () => Record<string, unknown>;
      save: () => Promise<unknown>;
    };
    const plainDoc = docObj.toObject() as Record<string, unknown>;
    const mutated = encryptDocument(plainDoc, targets, stats);

    if (mutated) {
      stats.encrypted++;
      if (!options.dryRun) {
        // Copy encrypted values back to document
        for (const t of targets) {
          const encryptedValue = getNested(plainDoc, t.path);
          if (encryptedValue && typeof encryptedValue === "string") {
            setNested(
              docObj as unknown as Record<string, unknown>,
              t.path,
              encryptedValue,
            );
          }
        }
        try {
          await docObj.save();
        } catch (err) {
          stats.errors++;
          logger.error(`${prefix}[FINANCE PII MIGRATION] Error saving doc`, {
            error: err,
          });
        }
      }
    } else {
      stats.skipped++;
    }

    stats.processed++;
    if (stats.processed % 500 === 0) {
      logger.info(`${prefix}[FINANCE PII MIGRATION] ${name} progress`, {
        processed: stats.processed,
        encrypted: stats.encrypted,
      });
    }
  }

  logger.info(`${prefix}[FINANCE PII MIGRATION] Completed ${name}`, stats);
  return stats;
}

function printSummary(
  collectionStats: Record<string, MigrationStats>,
  options: MigrationOptions,
): void {
  const prefix = options.dryRun ? "[DRY RUN] " : "";
  console.log("\n");
  console.log("═".repeat(60));
  console.log(`${prefix}📊 FINANCE PII MIGRATION SUMMARY`);
  console.log("═".repeat(60));

  let totalProcessed = 0;
  let totalEncrypted = 0;
  let totalErrors = 0;

  for (const [collection, stats] of Object.entries(collectionStats)) {
    totalProcessed += stats.processed;
    totalEncrypted += stats.encrypted;
    totalErrors += stats.errors;

    console.log(`\n${collection}:`);
    console.log(`  Processed: ${stats.processed}`);
    console.log(`  Encrypted: ${stats.encrypted}`);
    console.log(`  Skipped:   ${stats.skipped}`);
    console.log(`  Errors:    ${stats.errors}`);

    if (Object.keys(stats.fields).length > 0) {
      console.log("  Fields:");
      for (const [field, fieldStats] of Object.entries(stats.fields)) {
        if (fieldStats.encrypted > 0 || fieldStats.skipped > 0) {
          console.log(
            `    ${field}: encrypted=${fieldStats.encrypted}, skipped=${fieldStats.skipped}`,
          );
        }
      }
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("TOTALS:");
  console.log(`  Total Processed: ${totalProcessed}`);
  console.log(`  Total Encrypted: ${totalEncrypted}`);
  console.log(`  Total Errors:    ${totalErrors}`);
  console.log("═".repeat(60));

  if (options.dryRun) {
    console.log("\n⚠️  This was a DRY RUN. No changes were made.");
    console.log("   Remove --dry-run to apply changes.");
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  // Validate encryption key
  if (!process.env.ENCRYPTION_KEY && !process.env.PII_ENCRYPTION_KEY) {
    throw new Error(
      "ENCRYPTION_KEY or PII_ENCRYPTION_KEY environment variable is required",
    );
  }

  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("MONGODB_URI or DATABASE_URL is required");
  }

  logger.info("[FINANCE PII MIGRATION] Connecting to database...");
  await mongoose.connect(uri);

  const collectionStats: Record<string, MigrationStats> = {};

  if (options.rollback) {
    logger.info("[FINANCE PII MIGRATION] Performing rollback...");
    await restoreFromBackup("invoices");
    await restoreFromBackup("fm_financial_transactions");
    logger.info("[FINANCE PII MIGRATION] Rollback complete");
  } else {
    // Migrate Invoice collection
    collectionStats.invoices = await migrateCollection(
      "Invoice",
      Invoice as mongoose.Model<unknown>,
      invoiceTargets,
      options,
    );

    // Migrate FMFinancialTransaction collection
    collectionStats.fm_financial_transactions = await migrateCollection(
      "FMFinancialTransaction",
      FMFinancialTransaction as mongoose.Model<unknown>,
      transactionTargets,
      options,
    );

    printSummary(collectionStats, options);
  }

  await mongoose.disconnect();
}

main()
  .then(() => {
    logger.info("[FINANCE PII MIGRATION] Migration complete");
    process.exit(0);
  })
  .catch((err) => {
    logger.error("[FINANCE PII MIGRATION] Migration failed", { error: err });
    process.exit(1);
  });
