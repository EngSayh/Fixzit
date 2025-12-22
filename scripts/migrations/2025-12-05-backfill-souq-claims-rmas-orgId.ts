#!/usr/bin/env npx tsx
/**
 * Migration: Backfill orgId on Souq claims and RMAs
 *
 * Why:
 * - Claim and RMA schemas now require orgId + org-scoped indexes.
 * - Legacy documents without orgId will fail validation and are excluded from org-scoped queries.
 *
 * Strategy:
 * - For each claim/RMA missing orgId, resolve orgId via:
 *   1) Matching order (by _id or orderId) and reading order.orgId
 *   2) Fallback to buyer/seller user.orgId when order is missing
 * - Bulk update in batches to avoid overwhelming Mongo.
 *
 * Usage:
 *   npx tsx scripts/migrations/2025-12-05-backfill-souq-claims-rmas-orgId.ts
 *   npx tsx scripts/migrations/2025-12-05-backfill-souq-claims-rmas-orgId.ts --dry-run
 */

import "dotenv/config";
import { ObjectId } from "mongodb";
import { getDatabase, disconnectFromDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

type ClaimDoc = {
  _id: ObjectId;
  orderId?: string;
  buyerId?: string;
  sellerId?: string;
  orgId?: string;
};

type RMADoc = {
  _id: ObjectId;
  orderId?: string;
  buyerId?: string;
  sellerId?: string;
  orgId?: string;
};

async function resolveOrgIdFromOrder(
  db: Awaited<ReturnType<typeof getDatabase>>,
  orderId?: string,
): Promise<string | null> {
  if (!orderId) return null;

  const orders = db.collection(COLLECTIONS.SOUQ_ORDERS);
  const candidates: Array<Record<string, unknown>> = [];

  if (ObjectId.isValid(orderId)) {
    candidates.push({ _id: new ObjectId(orderId) });
  }
  candidates.push({ orderId });

  for (const query of candidates) {
    const order = await orders.findOne(query, { projection: { orgId: 1 } });
    if (order?.orgId) {
      return typeof order.orgId === "string" ? order.orgId : String(order.orgId);
    }
  }

  return null;
}

async function resolveOrgIdFromUsers(
  db: Awaited<ReturnType<typeof getDatabase>>,
  ids: Array<string | undefined>,
): Promise<string | null> {
  const users = db.collection(COLLECTIONS.USERS);
  for (const id of ids) {
    if (!id) continue;
    const queries: Array<Record<string, unknown>> = [];
    if (ObjectId.isValid(id)) {
      queries.push({ _id: new ObjectId(id) });
    }
    queries.push({ id });

    for (const q of queries) {
      const user = await users.findOne(q, { projection: { orgId: 1 } });
      if (user?.orgId) {
        return typeof user.orgId === "string" ? user.orgId : String(user.orgId);
      }
    }
  }
  return null;
}

async function backfillClaims(db: Awaited<ReturnType<typeof getDatabase>>) {
  const claims = db.collection<ClaimDoc>(COLLECTIONS.CLAIMS);
  let processed = 0;
  let updated = 0;
  let unresolved = 0;

  const cursor = claims.find({ orgId: { $exists: false } }, { projection: { orderId: 1, buyerId: 1, sellerId: 1 } });

  while (await cursor.hasNext()) {
    const batch: ClaimDoc[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const doc = await cursor.next();
      if (!doc) break;
      batch.push(doc);
    }
    if (batch.length === 0) break;

    const ops = [];
    for (const doc of batch) {
      processed++;
      const orgId =
        (await resolveOrgIdFromOrder(db, doc.orderId)) ||
        (await resolveOrgIdFromUsers(db, [doc.buyerId, doc.sellerId]));

      if (!orgId) {
        unresolved++;
        continue;
      }

      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { orgId } },
        },
      });
    }

    if (!DRY_RUN && ops.length > 0) {
      const res = await claims.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount ?? 0;
    } else if (DRY_RUN && ops.length > 0) {
      updated += ops.length;
    }
  }

  console.log(`Claims: processed=${processed}, updated=${updated}, unresolved=${unresolved}`);
}

async function backfillRmas(db: Awaited<ReturnType<typeof getDatabase>>) {
  const rmas = db.collection<RMADoc>(COLLECTIONS.SOUQ_RMAS);
  let processed = 0;
  let updated = 0;
  let unresolved = 0;

  const cursor = rmas.find({ orgId: { $exists: false } }, { projection: { orderId: 1, buyerId: 1, sellerId: 1 } });

  while (await cursor.hasNext()) {
    const batch: RMADoc[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const doc = await cursor.next();
      if (!doc) break;
      batch.push(doc);
    }
    if (batch.length === 0) break;

    const ops = [];
    for (const doc of batch) {
      processed++;
      const orgId =
        (await resolveOrgIdFromOrder(db, doc.orderId)) ||
        (await resolveOrgIdFromUsers(db, [doc.buyerId, doc.sellerId]));

      if (!orgId) {
        unresolved++;
        continue;
      }

      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { orgId } },
        },
      });
    }

    if (!DRY_RUN && ops.length > 0) {
      const res = await rmas.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount ?? 0;
    } else if (DRY_RUN && ops.length > 0) {
      updated += ops.length;
    }
  }

  console.log(`RMAs: processed=${processed}, updated=${updated}, unresolved=${unresolved}`);
}

async function main() {
  console.log("🔧 Backfill orgId for Souq claims and RMAs");
  if (DRY_RUN) console.log("📝 DRY RUN - no writes will be performed\n");

  const db = await getDatabase();
  try {
    const claimCount = await db.collection(COLLECTIONS.CLAIMS).countDocuments({ orgId: { $exists: false } });
    const rmaCount = await db.collection(COLLECTIONS.SOUQ_RMAS).countDocuments({ orgId: { $exists: false } });
    console.log(`📊 Pending backfill: claims=${claimCount}, rmas=${rmaCount}`);

    await backfillClaims(db);
    await backfillRmas(db);

    console.log("\n✅ Backfill complete");
    if (DRY_RUN) {
      console.log("⚠️  This was a dry run. Run without --dry-run to apply updates.");
    }
  } finally {
    await disconnectFromDatabase();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});
