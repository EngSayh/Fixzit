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
 *   --allow-plaintext-backup  Continue even if TTL index creation fails (SECURITY RISK)
 *
 * Notes:
 * - Requires ENCRYPTION_KEY or PII_ENCRYPTION_KEY in env.
 * - Idempotent: skips already-encrypted values (isEncrypted check).
 * - Processes documents in batches to avoid memory spikes.
 * - Creates backup collections before migrating.
 * - Rollback respects --org scope when provided.
 * - Failed document IDs are logged for targeted reruns.
 *
 * BREAK-GLASS PROCEDURE:
 *   The --allow-plaintext-backup flag is BLOCKED in production by default.
 *   For emergency use, set MIGRATION_ALLOW_PLAINTEXT=true (requires approvals).
 *   See: docs/operations/PII_MIGRATION_BREAK_GLASS_RUNBOOK.md
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

// ============================================================================
// CONSTANTS FOR KEY VALIDATION
// ============================================================================
const KEY_LENGTH = 32; // 256 bits for AES-256

// ============================================================================
// ENV PREFLIGHT CHECK - KEY PRESENCE
// ============================================================================
// SECURITY: Fail fast if encryption key is missing to prevent partial migrations
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  // STRICT v4.1: Use central logger for observability (captured by log pipelines)
  logger.error("[FINANCE PII MIGRATION] PREFLIGHT FAILED: Missing encryption key", {
    severity: "critical",
    required: ["ENCRYPTION_KEY", "PII_ENCRYPTION_KEY"],
    hint: "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  });
  // Also print to console for interactive terminal visibility
  console.error(`
╔════════════════════════════════════════════════════════════════════════════╗
║  ERROR: Missing ENCRYPTION_KEY or PII_ENCRYPTION_KEY                       ║
║                                                                            ║
║  This script requires an encryption key to encrypt PII fields.             ║
║  Set one of these environment variables before running:                    ║
║                                                                            ║
║    ENCRYPTION_KEY=<your-32-byte-base64-key>                                ║
║    PII_ENCRYPTION_KEY=<your-32-byte-base64-key>                            ║
║                                                                            ║
║  Generate a strong key:                                                    ║
║    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"║
║                                                                            ║
║  Example:                                                                  ║
║    ENCRYPTION_KEY=... pnpm tsx scripts/migrate-encrypt-finance-pii.ts      ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// ============================================================================
// ENV PREFLIGHT CHECK - KEY STRENGTH (STRICT v4.1)
// ============================================================================
// SECURITY: Always validate key strength for finance PII migrations, even in non-prod
// This prevents weak-key encryptions that would require costly re-migrations
function validateKeyStrength(key: string): void {
  let keyBytes: number;
  let decodingMethod: 'base64' | 'hex' | 'INVALID' = 'INVALID';
  
  // STRICT v4.1 FIX: Require explicit encoding format (base64 or hex)
  // Raw string length fallback is BLOCKED to prevent accepting weak-entropy keys
  // A 32-char ASCII string only provides 32 bytes of characters, not 256 bits of entropy
  if (key.startsWith('0x')) {
    // Hex-encoded key (e.g., 0x followed by 64 hex chars = 32 bytes)
    try {
      const decoded = Buffer.from(key.slice(2), 'hex');
      keyBytes = decoded.length;
      decodingMethod = 'hex';
    } catch {
      keyBytes = 0;
    }
  } else {
    // Base64-encoded key (preferred format, 44 base64 chars = 32 bytes)
    try {
      const decoded = Buffer.from(key, 'base64');
      // Verify it's actually valid base64 by re-encoding and comparing
      const reEncoded = decoded.toString('base64');
      // Allow for padding variations
      if (reEncoded.replace(/=+$/, '') === key.replace(/=+$/, '')) {
        keyBytes = decoded.length;
        decodingMethod = 'base64';
      } else {
        // Not valid base64 - reject
        keyBytes = 0;
      }
    } catch {
      keyBytes = 0;
    }
  }

  if (keyBytes < KEY_LENGTH || decodingMethod === 'INVALID') {
    // STRICT v4.1: Use central logger for observability (captured by log pipelines)
    logger.error("[FINANCE PII MIGRATION] PREFLIGHT FAILED: Encryption key too weak or invalid format", {
      severity: "critical",
      currentKeyBytes: keyBytes,
      currentKeyBits: keyBytes * 8,
      requiredKeyBytes: KEY_LENGTH,
      requiredKeyBits: KEY_LENGTH * 8,
      decodingMethod,
      hint: "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    });
    // Also print to console for interactive terminal visibility
    console.error(`
╔════════════════════════════════════════════════════════════════════════════╗
║  ERROR: ENCRYPTION_KEY is too weak or invalid format                       ║
║                                                                            ║
║  Finance PII encryption requires a 256-bit (32-byte) key for compliance.   ║
║  Keys must be properly encoded as base64 or hex (0x prefix).               ║
║                                                                            ║
║  Current key: ${keyBytes} bytes (${keyBytes * 8}-bit) via ${decodingMethod}
║  Required:    ${KEY_LENGTH} bytes (256-bit)
║                                                                            ║
║  STRICT v4.1: Raw string fallback is BLOCKED to prevent weak-entropy keys. ║
║  A 32-char ASCII string does NOT provide 256 bits of cryptographic entropy.║
║                                                                            ║
║  Generate a compliant key:                                                 ║
║    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"║
║                                                                            ║
║  Or hex format (64 hex chars):                                             ║
║    node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"║
╚════════════════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  // STRICT v4.1: Use central logger for observability
  logger.info("[FINANCE PII MIGRATION] Encryption key strength validated", {
    keyBits: keyBytes * 8,
    algorithm: "AES-256",
    encoding: decodingMethod,
    status: "compliant",
  });
  console.log(`✅ Encryption key strength validated: ${keyBytes * 8}-bit (AES-256 compliant, ${decodingMethod} encoded)`);
}

// Run key strength validation immediately
validateKeyStrength(ENCRYPTION_KEY);

const BATCH_SIZE = 200;
const BACKUP_BATCH_SIZE = 500;

/**
 * Escape special regex characters in a string to prevent ReDoS attacks
 * when constructing patterns from variable input.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface EncryptTarget {
  path: string;
  label: string;
}

interface MigrationStats {
  processed: number;
  encrypted: number;
  skipped: number;
  errors: number;
  failedIds: string[]; // Track failed document IDs for targeted reruns
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

    // Encrypt the value (strings or numbers - numbers get stringified)
    if (typeof value === "string" || typeof value === "number") {
      const encrypted = encryptField(String(value), t.path);
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
  allowPlaintextBackup?: boolean;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes("--dry-run"),
    rollback: args.includes("--rollback"),
    allowPlaintextBackup: args.includes("--allow-plaintext-backup"),
  };

  // SECURITY: Block --allow-plaintext-backup in production to prevent accidental PII retention
  // Use dedicated MIGRATION_ALLOW_PLAINTEXT env var for break-glass, NOT NODE_ENV override
  const hasBreakGlassOverride = process.env.MIGRATION_ALLOW_PLAINTEXT === "true";
  if (options.allowPlaintextBackup && process.env.NODE_ENV === "production" && !hasBreakGlassOverride) {
    console.error(`
╔════════════════════════════════════════════════════════════════════════════╗
║  ERROR: --allow-plaintext-backup is BLOCKED in production                  ║
║                                                                            ║
║  This flag would disable TTL auto-expiry on backup collections,            ║
║  leaving plaintext PII indefinitely. This is a compliance violation.       ║
║                                                                            ║
║  If you absolutely must proceed (emergency break-glass only):              ║
║    1. Set MIGRATION_ALLOW_PLAINTEXT=true (keeps NODE_ENV=production)       ║
║    2. Document the exception in the incident log                           ║
║    3. Manually delete backups within 24h                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  const orgArg = args.find((a) => a.startsWith("--org="));
  if (orgArg) {
    options.orgId = orgArg.split("=")[1];
  }

  return options;
}

async function createBackup(
  collectionName: string,
  orgId?: string,
  allowPlaintextBackup?: boolean,
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
  const backupCollection = db.collection(backupName);

  // Stream backup in batches to avoid memory issues with large collections
  let totalBacked = 0;
  let batch: mongoose.mongo.Document[] = [];

  const cursor = sourceCollection.find(filter);

  for await (const doc of cursor) {
    batch.push(doc);

    if (batch.length >= BACKUP_BATCH_SIZE) {
      await backupCollection.insertMany(batch);
      totalBacked += batch.length;
      batch = [];

      if (totalBacked % 2000 === 0) {
        logger.info(`[FINANCE PII MIGRATION] Backup progress: ${totalBacked} docs`);
      }
    }
  }

  // Insert remaining batch
  if (batch.length > 0) {
    await backupCollection.insertMany(batch);
    totalBacked += batch.length;
  }

  if (totalBacked > 0) {
    // Add TTL index (24h) to auto-cleanup backup collections
    // SECURITY: Prevents plaintext PII from lingering indefinitely
    // NOTE: Use _backupCreatedAt (not createdAt) to preserve original document timestamps for audit accuracy on restore
    try {
      await backupCollection.createIndex(
        { _backupCreatedAt: 1 },
        { expireAfterSeconds: 24 * 60 * 60 } // 24 hours
      );
      // Add _backupCreatedAt timestamp for TTL tracking (preserves original createdAt)
      await backupCollection.updateMany({}, { $set: { _backupCreatedAt: new Date() } });
      logger.info(`[FINANCE PII MIGRATION] Backup TTL set (24h auto-cleanup): ${backupName}`);
    } catch (ttlError) {
      // SECURITY: TTL failure means plaintext PII could persist indefinitely
      // Default: FAIL HARD to prevent compliance violations
      if (allowPlaintextBackup) {
        logger.warn(`[FINANCE PII MIGRATION] ⚠️ TTL creation failed, continuing with --allow-plaintext-backup: ${backupName}`, { error: ttlError });
        logger.warn(`[FINANCE PII MIGRATION] SECURITY RISK: Plaintext PII backup will NOT auto-expire. Manual cleanup required!`);
      } else {
        logger.error(`[FINANCE PII MIGRATION] ❌ TTL index creation failed. Aborting to prevent plaintext PII retention.`);
        logger.error(`[FINANCE PII MIGRATION] To proceed anyway (NOT RECOMMENDED), re-run with: --allow-plaintext-backup`);
        // Clean up the backup we just created to avoid leaving orphan plaintext data
        try {
          await db.dropCollection(backupName);
          logger.info(`[FINANCE PII MIGRATION] Cleaned up incomplete backup: ${backupName}`);
        } catch (cleanupError) {
          logger.error(`[FINANCE PII MIGRATION] Failed to cleanup backup: ${backupName}`, { error: cleanupError });
        }
        throw new Error(`TTL index creation failed for backup ${backupName}. Plaintext PII retention risk.`);
      }
    }

    logger.info(`[FINANCE PII MIGRATION] Backup created: ${backupName}`, {
      count: totalBacked,
    });
  } else {
    logger.info(`[FINANCE PII MIGRATION] No documents to backup for ${collectionName}${orgId ? ` (org: ${orgId})` : ""}`);
  }

  return backupName;
}

async function restoreFromBackup(
  collectionName: string,
  orgId?: string,
): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not established");
  }

  // Find backups - prefer org-scoped backups when orgId is provided
  const collections = await db.listCollections().toArray();

  let backups: { name: string }[];

  if (orgId) {
    // Org-scoped: match exact org prefix
    const scopedPrefix = `${collectionName}_backup_finance_pii_${orgId}_`;
    backups = collections
      .filter((c) => c.name.startsWith(scopedPrefix))
      .sort((a, b) => {
        const tsA = parseInt(a.name.split("_").pop() || "0");
        const tsB = parseInt(b.name.split("_").pop() || "0");
        return tsB - tsA; // Most recent first
      });

    // Fallback to global backups if no org-scoped backup found
    if (backups.length === 0) {
      logger.warn(
        `[FINANCE PII MIGRATION] No org-scoped backup found for ${collectionName} (org: ${orgId}). Checking for global backups...`,
      );
      // Only match truly global backups (format: {collection}_backup_finance_pii_{timestamp})
      // Exclude any org-specific backups by checking for pattern without org segment
      const globalBackupPattern = new RegExp(
        `^${escapeRegExp(collectionName)}_backup_finance_pii_\\d+$`,
      );
      backups = collections
        .filter((c) => globalBackupPattern.test(c.name))
        .sort((a, b) => {
          const tsA = parseInt(a.name.split("_").pop() || "0");
          const tsB = parseInt(b.name.split("_").pop() || "0");
          return tsB - tsA;
        });
    }
  } else {
    // Global: only match truly global backups (no org segment)
    const globalBackupPattern = new RegExp(
      `^${escapeRegExp(collectionName)}_backup_finance_pii_\\d+$`,
    );
    backups = collections
      .filter((c) => globalBackupPattern.test(c.name))
      .sort((a, b) => {
        const tsA = parseInt(a.name.split("_").pop() || "0");
        const tsB = parseInt(b.name.split("_").pop() || "0");
        return tsB - tsA;
      });
  }

  if (backups.length === 0) {
    throw new Error(
      `No backup found for ${collectionName}${orgId ? ` (org: ${orgId})` : ""}`,
    );
  }

  const backupName = backups[0].name;
  logger.info(`[FINANCE PII MIGRATION] Restoring from backup: ${backupName}`);

  const backupCollection = db.collection(backupName);
  const targetCollection = db.collection(collectionName);

  // Determine if this is an org-scoped restore
  const isOrgScopedBackup = backupName.includes(`_${orgId}_`);

  // PRE-RESTORE GUARD: Verify backup has documents for target org before deleting live data
  if (orgId) {
    const restoreQuery = isOrgScopedBackup ? {} : { orgId };
    const backupDocCount = await backupCollection.countDocuments(restoreQuery);
    
    if (backupDocCount === 0) {
      throw new Error(
        `SAFETY STOP: Backup "${backupName}" contains zero documents for org: ${orgId}. ` +
          `Refusing to delete live data without matching backup. ` +
          `Verify the backup was created for this org, or remove --org to restore globally.`,
      );
    }
    
    logger.info(
      `[FINANCE PII MIGRATION] Pre-restore check passed: ${backupDocCount} documents found for org: ${orgId}`,
    );
  }

  // Use MongoDB session for atomic rollback to prevent partial data loss on failure
  const session = await mongoose.startSession();
  let totalRestored = 0;

  try {
    await session.withTransaction(async () => {
      if (orgId && isOrgScopedBackup) {
        // Org-scoped restore: only delete and restore for this org
        logger.info(
          `[FINANCE PII MIGRATION] Performing org-scoped restore for org: ${orgId}`,
        );
        await targetCollection.deleteMany({ orgId }, { session });
      } else if (orgId) {
        // Restoring from global backup but only for specific org
        logger.info(
          `[FINANCE PII MIGRATION] Restoring from global backup, filtering to org: ${orgId}`,
        );
        await targetCollection.deleteMany({ orgId }, { session });
      } else {
        // Full restore: delete all documents that exist in the backup by orgId
        // Stream to get unique orgIds without loading all docs
        const orgIdsSet = new Set<string>();
        const orgCursor = backupCollection.find({}, { projection: { orgId: 1 } });
        for await (const doc of orgCursor) {
          if (doc.orgId) {
            orgIdsSet.add(doc.orgId as string);
          }
        }

        for (const backupOrgId of orgIdsSet) {
          await targetCollection.deleteMany({ orgId: backupOrgId }, { session });
        }
      }

      // Stream restore in batches to avoid memory issues
      let batch: mongoose.mongo.Document[] = [];

      // Apply org filter if restoring from global backup with org scope
      const restoreFilter =
        orgId && !isOrgScopedBackup ? { orgId } : {};
      const cursor = backupCollection.find(restoreFilter);

      for await (const doc of cursor) {
        // Remove TTL marker field before restoring (preserves original createdAt)
        const { _backupCreatedAt, ...cleanDoc } = doc as mongoose.mongo.Document & { _backupCreatedAt?: Date };
        batch.push(cleanDoc);

        if (batch.length >= BACKUP_BATCH_SIZE) {
          await targetCollection.insertMany(batch, { session, ordered: false });
          totalRestored += batch.length;
          batch = [];

          if (totalRestored % 2000 === 0) {
            logger.info(
              `[FINANCE PII MIGRATION] Restore progress: ${totalRestored} docs`,
            );
          }
        }
      }

      // Insert remaining batch
      if (batch.length > 0) {
        await targetCollection.insertMany(batch, { session, ordered: false });
        totalRestored += batch.length;
      }
    });
  } finally {
    await session.endSession();
  }

  // Warn if no documents were restored for the target org
  if (totalRestored === 0 && orgId) {
    logger.warn(
      `[FINANCE PII MIGRATION] WARNING: Zero documents restored for org: ${orgId}. ` +
        `This may indicate the backup does not contain data for this org, or the org filter found no matches. ` +
        `Verify the backup contents before proceeding.`,
    );
  }

  logger.info(
    `[FINANCE PII MIGRATION] Restored ${totalRestored} documents${orgId ? ` for org: ${orgId}` : ""}`,
  );
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
    failedIds: [],
    fields: {},
  };

  const prefix = options.dryRun ? "[DRY RUN] " : "";
  logger.info(`${prefix}[FINANCE PII MIGRATION] Starting ${name}`);

  // Create backup (unless dry-run)
  if (!options.dryRun && !options.rollback) {
    await createBackup(model.collection.name, options.orgId, options.allowPlaintextBackup);
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
      _id: mongoose.Types.ObjectId;
      toObject: () => Record<string, unknown>;
      save: () => Promise<unknown>;
    };
    
    // Per-document error handling: catch encryption errors to continue processing other documents
    // This prevents a single malformed record from halting the entire migration
    let plainDoc: Record<string, unknown>;
    let mutated: boolean;
    
    try {
      plainDoc = docObj.toObject() as Record<string, unknown>;
      mutated = encryptDocument(plainDoc, targets, stats);
    } catch (encryptErr) {
      stats.errors++;
      stats.failedIds.push(docObj._id.toString());
      logger.error(`${prefix}[FINANCE PII MIGRATION] Encryption failed for doc`, {
        docId: docObj._id.toString(),
        error: encryptErr,
      });
      stats.processed++;
      continue; // Continue with next document instead of aborting
    }

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
          stats.failedIds.push(docObj._id.toString());
          logger.error(`${prefix}[FINANCE PII MIGRATION] Error saving doc`, {
            docId: docObj._id.toString(),
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
        errors: stats.errors,
      });
    }
  }

  logger.info(
    `${prefix}[FINANCE PII MIGRATION] Completed ${name}`,
    stats as unknown as Record<string, unknown>,
  );
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
  const allFailedIds: Record<string, string[]> = {};

  for (const [collection, stats] of Object.entries(collectionStats)) {
    totalProcessed += stats.processed;
    totalEncrypted += stats.encrypted;
    totalErrors += stats.errors;

    if (stats.failedIds.length > 0) {
      allFailedIds[collection] = stats.failedIds;
    }

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

  // Print failed IDs for targeted reruns
  if (Object.keys(allFailedIds).length > 0) {
    console.log("\n⚠️  FAILED DOCUMENT IDs (for targeted retry):");
    for (const [collection, ids] of Object.entries(allFailedIds)) {
      console.log(`\n  ${collection}:`);
      for (const id of ids) {
        console.log(`    - ${id}`);
      }
    }
    console.log("\n  To retry failed documents, fix the underlying issue");
    console.log("  and re-run the migration with the same --org scope.");
  }

  if (options.dryRun) {
    console.log("\n⚠️  This was a DRY RUN. No changes were made.");
    console.log("   Remove --dry-run to apply changes.");
  }

  if (totalErrors === 0 && totalEncrypted > 0) {
    console.log("\n✅ Migration completed successfully!");
  } else if (totalErrors > 0) {
    console.log(`\n⚠️  Migration completed with ${totalErrors} error(s).`);
    console.log("   Review the failed IDs above and the logs for details.");
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

  try {
    if (options.rollback) {
      logger.info(
        `[FINANCE PII MIGRATION] Performing rollback${options.orgId ? ` for org: ${options.orgId}` : ""}...`,
      );
      // Use model collection names instead of hardcoded strings
      await restoreFromBackup(Invoice.collection.name, options.orgId);
      await restoreFromBackup(FMFinancialTransaction.collection.name, options.orgId);
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
  } finally {
    await mongoose.disconnect();
  }
}

main()
  .then(() => {
    logger.info("[FINANCE PII MIGRATION] Migration complete");
  })
  .catch((err) => {
    logger.error("[FINANCE PII MIGRATION] Migration failed", { error: err });
    process.exitCode = 1;
  });
