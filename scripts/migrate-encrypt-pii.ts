/**
 * One-off migration to encrypt legacy PII fields for Owner, Tenant, Vendor.
 *
 * Usage:
 *   ENCRYPTION_KEY=... pnpm tsx scripts/migrate-encrypt-pii.ts
 *
 * Notes:
 * - Requires ENCRYPTION_KEY/PII_ENCRYPTION_KEY in env.
 * - Idempotent: skips already-encrypted values (isEncrypted check).
 * - Processes documents in batches to avoid memory spikes.
 */

import "dotenv/config";
import mongoose from "mongoose";
import { encryptField, isEncrypted } from "@/lib/security/encryption";
import { OwnerModel } from "@/server/models/Owner";
import { Tenant } from "@/server/models/Tenant";
import Vendor from "@/server/models/Vendor"; // default export in model file
import { logger } from "@/lib/logger";

const BATCH_SIZE = 200;

type EncryptTarget = {
  path: string;
  label: string;
};

const ownerTargets: EncryptTarget[] = [
  { path: "nationalId", label: "National ID" },
  { path: "financial.bankAccounts.accountNumber", label: "Bank Account Number" },
  { path: "financial.bankAccounts.iban", label: "IBAN" },
];

const tenantTargets: EncryptTarget[] = [
  { path: "identification.nationalId", label: "National ID" },
  { path: "financial.bankDetails.accountNumber", label: "Bank Account Number" },
  { path: "financial.bankDetails.iban", label: "IBAN" },
];

const vendorTargets: EncryptTarget[] = [
  { path: "financial.bankDetails.accountNumber", label: "Bank Account Number" },
  { path: "financial.bankDetails.iban", label: "IBAN" },
];

function setNested(doc: Record<string, unknown>, path: string, value: string) {
  const parts = path.split(\".\");
  let current = doc as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function getNested(doc: any, path: string): any {
  const parts = path.split(".");
  let current = doc;
  for (const part of parts) {
    if (!current) return undefined;
    current = current[part];
  }
  return current;
}

function encryptDocument(doc: any, targets: EncryptTarget[]): boolean {
  let mutated = false;
  for (const t of targets) {
    const value = getNested(doc, t.path);
    if (!value) continue;
    // handle arrays for bankAccounts
    if (Array.isArray(value)) {
      value.forEach((entry, idx) => {
        if (entry && typeof entry === "object") {
          for (const key of Object.keys(entry)) {
            const fullPath = `${t.path}.${key}`;
            const v = entry[key];
            if (v && typeof v === "string" && !isEncrypted(v)) {
              entry[key] = encryptField(v, fullPath);
              mutated = true;
            }
          }
        }
      });
      continue;
    }
    if (typeof value === "string" && !isEncrypted(value)) {
      const encrypted = encryptField(value, t.path);
      if (encrypted) {
        setNested(doc, t.path, encrypted);
        mutated = true;
      }
    }
  }
  return mutated;
}

async function migrateCollection(
  name: string,
  model: mongoose.Model<any>,
  targets: EncryptTarget[],
) {
  logger.info(`[PII MIGRATION] Starting ${name}`);
  let cursor = model.find({}).lean(false).cursor({ batchSize: BATCH_SIZE });
  let processed = 0;
  for await (const doc of cursor) {
    const mutated = encryptDocument(doc, targets);
    if (mutated) {
      await doc.save();
    }
    processed++;
    if (processed % 500 === 0) {
      logger.info(`[PII MIGRATION] ${name} processed: ${processed}`);
    }
  }
  logger.info(`[PII MIGRATION] Completed ${name}. Total: ${processed}`);
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  await mongoose.connect(uri);
  await migrateCollection("Owner", OwnerModel, ownerTargets);
  await migrateCollection("Tenant", Tenant, tenantTargets);
  await migrateCollection("Vendor", Vendor, vendorTargets);
  await mongoose.disconnect();
}

main()
  .then(() => {
    logger.info("[PII MIGRATION] All migrations complete");
    process.exit(0);
  })
  .catch((err) => {
    logger.error("[PII MIGRATION] Failed", { error: err });
    process.exit(1);
  });
