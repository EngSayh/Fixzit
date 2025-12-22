#!/usr/bin/env npx tsx
/**
 * Migration: Normalize orgId to STRING for Souq payouts/withdrawals.
 *
 * Background:
 * - `souq_settlements.orgId` is stored as string (per schema).
 * - `souq_payouts` historically stored ObjectId orgId; new code uses string.
 * - Mixed storage hurts index selectivity and can duplicate rows per tenant.
 *
 * Actions:
 * 1) Cast ObjectId orgId -> string for `souq_payouts` and `souq_withdrawal_requests`.
 * 2) Ensure supporting indexes:
 *    - souq_payouts:    { orgId: 1, payoutId: 1 }
 *    - souq_withdrawal_requests: { orgId: 1, requestId: 1 }
 *
 * Usage:
 *   npx tsx scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts --dry-run
 *   npx tsx scripts/migrations/2025-12-07-normalize-souq-payouts-orgId.ts
 */

import "dotenv/config";
import { ObjectId } from "mongodb";
import { getDatabase, disconnectFromDatabase } from "@/lib/mongodb-unified";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 500;

async function normalizeOrgId(collection: string, idField: "payoutId" | "requestId") {
  const db = await getDatabase();
  const col = db.collection(collection);
  let processed = 0;
  let updated = 0;

  const cursor = col.find(
    { orgId: { $type: "objectId" } },
    { projection: { _id: 1, orgId: 1, [idField]: 1 } },
  );

  while (await cursor.hasNext()) {
    const ops = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const doc = await cursor.next();
      if (!doc) break;
      processed++;
      const orgIdVal = doc.orgId;
      const orgIdStr = orgIdVal instanceof ObjectId ? orgIdVal.toHexString() : String(orgIdVal);
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { orgId: orgIdStr } },
        },
      });
    }

    if (ops.length === 0) break;
    if (!DRY_RUN) {
      const res = await col.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount ?? 0;
    } else {
      updated += ops.length;
    }
  }

  await col.createIndex({ orgId: 1, [idField]: 1 });

  return { processed, updated };
}

async function main() {
  const payouts = await normalizeOrgId("souq_payouts", "payoutId");
  const withdrawals = await normalizeOrgId("souq_withdrawal_requests", "requestId");

  // eslint-disable-next-line no-console
  console.log(
    `[normalize-orgId] souq_payouts processed=${payouts.processed} updated=${payouts.updated} | ` +
      `souq_withdrawal_requests processed=${withdrawals.processed} updated=${withdrawals.updated} ` +
      `(dryRun=${DRY_RUN})`,
  );
  await disconnectFromDatabase();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error("[normalize-orgId] Migration failed", err);
  await disconnectFromDatabase();
  process.exit(1);
});
