#!/usr/bin/env npx tsx
/**
 * Migration: Add orgId to souq_products and enforce org-scoped indexes.
 *
 * Actions:
 * 1) Normalize orgId strings -> ObjectId where possible.
 * 2) Backfill missing orgId from seller.orgId (createdBy reference).
 * 3) Drop legacy global fsin unique index; create org-scoped indexes:
 *    - { orgId, fsin } unique
 *    - { orgId, createdBy, isActive }
 *    - { orgId, isActive }
 *
 * Usage:
 *   npx tsx scripts/migrations/2025-12-08-backfill-souq-products-orgId.ts --dry-run
 *   npx tsx scripts/migrations/2025-12-08-backfill-souq-products-orgId.ts
 */

import "dotenv/config";
import { ObjectId, type Db } from "mongodb";
import { getDatabase, disconnectFromDatabase } from "@/lib/mongodb-unified";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

function toObjectId(value: unknown): ObjectId | null {
  if (value instanceof ObjectId) return value;
  const str = typeof value === "string" ? value : String(value ?? "");
  return ObjectId.isValid(str) ? new ObjectId(str) : null;
}

async function normalizeStringOrgIds(db: Db) {
  const products = db.collection("souq_products");
  const res = await products.updateMany(
    { orgId: { $type: "string" } },
    [
      {
        $set: {
          orgId: {
            $cond: [
              { $regexMatch: { input: "$orgId", regex: /^[0-9a-fA-F]{24}$/ } },
              { $toObjectId: "$orgId" },
              "$orgId",
            ],
          },
        },
      },
    ],
    { bypassDocumentValidation: true },
  );
  return res.modifiedCount ?? 0;
}

async function backfillMissingOrgIds(db: Db) {
  const products = db.collection("souq_products");
  const sellers = db.collection("souq_sellers");

  const cursor = products.find(
    {
      $or: [{ orgId: { $exists: false } }, { orgId: null }],
    },
    { projection: { _id: 1, createdBy: 1, fsin: 1 } },
  );

  let processed = 0;
  let updated = 0;
  let missingSeller = 0;
  let invalidSeller = 0;

  while (await cursor.hasNext()) {
    const ops = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const doc = await cursor.next();
      if (!doc) break;
      processed++;

      const sellerObjectId = toObjectId(doc.createdBy);
      if (!sellerObjectId) {
        invalidSeller++;
        continue;
      }

      const seller = await sellers.findOne(
        { _id: sellerObjectId },
        { projection: { orgId: 1 } },
      );
      const orgId = seller?.orgId;
      if (!orgId) {
        missingSeller++;
        continue;
      }

      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { orgId } },
        },
      });
    }

    if (ops.length === 0) continue;
    if (!DRY_RUN) {
      const res = await products.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount ?? 0;
    } else {
      updated += ops.length;
    }
  }

  return { processed, updated, missingSeller, invalidSeller };
}

async function ensureIndexes(db: Db) {
  const products = db.collection("souq_products");
  try {
    await products.dropIndex("fsin_1");
  } catch (error) {
    const msg = (error as Error).message || "";
    if (!/index not found/i.test(msg)) {
      // eslint-disable-next-line no-console
      console.warn("[souq_products] dropIndex fsin_1 warning", msg);
    }
  }

  await products.createIndex(
    { orgId: 1, fsin: 1 },
    { unique: true, name: "souq_products_orgId_fsin_unique" },
  );
  await products.createIndex(
    { orgId: 1, createdBy: 1, isActive: 1 },
    { name: "souq_products_orgId_createdBy_isActive" },
  );
  await products.createIndex(
    { orgId: 1, isActive: 1 },
    { name: "souq_products_orgId_isActive" },
  );
}

async function main() {
  const db = await getDatabase();

  const normalized = await normalizeStringOrgIds(db);
  const backfill = await backfillMissingOrgIds(db);

  if (!DRY_RUN) {
    await ensureIndexes(db);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[souq_products orgId] normalized=${normalized} backfilled=${backfill.updated}/${backfill.processed}` +
      ` missingSeller=${backfill.missingSeller} invalidSeller=${backfill.invalidSeller} dryRun=${DRY_RUN}`,
  );

  await disconnectFromDatabase();
}

main().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("[souq_products orgId] migration failed", error);
  await disconnectFromDatabase();
  process.exit(1);
});
