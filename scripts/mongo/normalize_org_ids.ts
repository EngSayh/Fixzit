/**
 * Normalize legacy org_id field to orgId for payments.
 *
 * - Dry run by default (no writes).
 * - Use `--apply` to perform updates.
 *
 * Behavior:
 * - Finds documents in `aqar_payments` where `orgId` is missing/null
 *   but `org_id` exists.
 * - Copies `org_id` into `orgId` and unsets `org_id`.
 *
 * Usage:
 *   pnpm mongo:normalize          # dry run
 *   pnpm mongo:normalize:apply    # apply updates
 */

import { logger } from "@/lib/logger";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/mongodb-unified";
import mongoose from "mongoose";

async function main() {
  const apply = process.argv.includes("--apply");

  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not available");
  }

  const collection = db.collection("aqar_payments");
  const query = {
    $and: [
      { $or: [{ orgId: { $exists: false } }, { orgId: null }] },
      { org_id: { $exists: true, $ne: null } },
    ],
  };

  const total = await collection.countDocuments(query);
  logger.info(`[normalize_org_ids] Found ${total} payments with legacy org_id`);

  if (total === 0) {
    await disconnectFromDatabase();
    return;
  }

  const sample = await collection
    .find(query, { projection: { _id: 1, org_id: 1 }, limit: 5 })
    .toArray();
  logger.info("[normalize_org_ids] Sample documents", sample);

  if (!apply) {
    logger.info("[normalize_org_ids] Dry run complete. Re-run with --apply to migrate.");
    await disconnectFromDatabase();
    return;
  }

  // Use aggregation-style update to copy org_id -> orgId and unset org_id
  const result = await collection.updateMany(query, [
    { $set: { orgId: "$org_id" } },
    { $unset: "org_id" },
  ]);

  logger.info("[normalize_org_ids] Update result", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });

  // Drop legacy indexes that reference org_id
  const indexes = await collection.indexes();
  const legacyIndexes = indexes.filter((idx) =>
    Object.keys(idx.key || {}).some((k) => k === "org_id" || k.includes("org_id")),
  );
  for (const idx of legacyIndexes) {
    if (idx.name) {
      logger.info(`[normalize_org_ids] Dropping legacy index ${idx.name}`);
      await collection.dropIndex(idx.name).catch((err) => {
        logger.warn(`[normalize_org_ids] Failed to drop index ${idx.name}`, {
          message: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }

  await disconnectFromDatabase();
}

main().catch((err) => {
  logger.error("[normalize_org_ids] Migration failed", {
    message: err instanceof Error ? err.message : String(err),
  });
  void disconnectFromDatabase();
  process.exit(1);
});
