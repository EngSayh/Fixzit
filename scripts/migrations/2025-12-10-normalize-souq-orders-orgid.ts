/**
 * Normalize legacy org_id -> orgId for souq_orders.
 *
 * - Converts org_id (any type) to string orgId
 * - Unsets org_id
 * - Idempotent (safe to re-run)
 *
 * Usage:
 *   pnpm tsx scripts/migrations/2025-12-10-normalize-souq-orders-orgid.ts
 *
 * Set MONGODB_URI in env (or rely on configured default).
 */
import { getDatabase } from "@/lib/mongodb-unified";

async function main(): Promise<void> {
  const db = await getDatabase();
  const coll = db.collection("souq_orders");

  const sample = await coll
    .aggregate([
      { $match: { org_id: { $exists: true } } },
      { $limit: 5 },
      { $project: { _id: 1, org_id: 1, orgId: 1 } },
    ])
    .toArray();
  // eslint-disable-next-line no-console
  console.log("[souq_orders] sample legacy org_id docs:", sample);

  const res = await coll.updateMany(
    { org_id: { $exists: true } },
    [
      { $set: { orgId: { $toString: "$org_id" } } },
      { $unset: "org_id" },
    ],
  );

  // eslint-disable-next-line no-console
  console.log("[souq_orders] normalized org_id -> orgId", {
    matched: res.matchedCount,
    modified: res.modifiedCount,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

